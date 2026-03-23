create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.assignments') is null then
    raise exception 'public.assignments must exist before running recurring_assignments.sql';
  end if;
end
$$;

alter table public.assignments
  add column if not exists due_time time not null default time '00:00',
  add column if not exists repeat_enabled boolean not null default false,
  add column if not exists repeat_every text,
  add column if not exists repeat_time time,
  add column if not exists repeat_days_of_week smallint[] not null default '{}'::smallint[],
  add column if not exists repeat_days_of_month smallint[] not null default '{}'::smallint[],
  add column if not exists repeat_timezone text,
  add column if not exists repeat_rule_id uuid;

create unique index if not exists assignments_repeat_rule_due_idx
  on public.assignments (repeat_rule_id, due_date);

create table if not exists public.assignment_repeat_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  class_name text not null default '',
  difficulty text not null,
  description text not null default '',
  repeat_every text not null,
  repeat_time time not null,
  repeat_days_of_week smallint[] not null default '{}'::smallint[],
  repeat_days_of_month smallint[] not null default '{}'::smallint[],
  repeat_timezone text not null default 'UTC',
  anchor_date date not null,
  uses_assigned_date boolean not null default false,
  due_offset_days integer not null default 0,
  next_occurrence_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assignment_repeat_rules_difficulty_check check (difficulty in ('Easy', 'Medium', 'Hard', 'Group')),
  constraint assignment_repeat_rules_repeat_every_check check (repeat_every in ('day', 'week', 'month', 'days-of-week', 'days-of-month')),
  constraint assignment_repeat_rules_due_offset_days_check check (due_offset_days >= 0),
  constraint assignment_repeat_rules_weekdays_required_check check (
    repeat_every <> 'days-of-week'
    or coalesce(array_length(repeat_days_of_week, 1), 0) > 0
  ),
  constraint assignment_repeat_rules_month_days_required_check check (
    repeat_every <> 'days-of-month'
    or coalesce(array_length(repeat_days_of_month, 1), 0) > 0
  ),
  constraint assignment_repeat_rules_weekdays_valid_check check (
    repeat_days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint assignment_repeat_rules_month_days_valid_check check (
    repeat_days_of_month <@ array[
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
    ]::smallint[]
  )
);

create index if not exists assignment_repeat_rules_user_next_occurrence_idx
  on public.assignment_repeat_rules (user_id, is_active, next_occurrence_on);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists assignment_repeat_rules_updated_at on public.assignment_repeat_rules;
create trigger assignment_repeat_rules_updated_at
before update on public.assignment_repeat_rules
for each row
execute function public.touch_updated_at();

create or replace function public.next_assignment_repeat_occurrence(
  current_occurrence date,
  repeat_every text,
  repeat_days_of_week smallint[] default '{}'::smallint[],
  repeat_days_of_month smallint[] default '{}'::smallint[]
)
returns date
language plpgsql
stable
as $$
declare
  candidate_date date;
  candidate_month_start date;
  max_day integer;
  current_day integer;
  month_offset integer;
  day_value smallint;
begin
  if current_occurrence is null then
    return null;
  end if;

  current_day := extract(day from current_occurrence);

  case repeat_every
    when 'day' then
      return current_occurrence + 1;
    when 'week' then
      return current_occurrence + 7;
    when 'month' then
      candidate_month_start := (date_trunc('month', current_occurrence)::date + interval '1 month')::date;
      max_day := extract(day from (date_trunc('month', candidate_month_start)::timestamp + interval '1 month - 1 day'));
      return make_date(
        extract(year from candidate_month_start)::integer,
        extract(month from candidate_month_start)::integer,
        least(current_day, max_day)
      );
    when 'days-of-week' then
      for month_offset in 1..7 loop
        candidate_date := current_occurrence + month_offset;
        if extract(dow from candidate_date)::integer = any(repeat_days_of_week) then
          return candidate_date;
        end if;
      end loop;
      return current_occurrence + 7;
    when 'days-of-month' then
      for month_offset in 0..36 loop
        candidate_month_start := (date_trunc('month', current_occurrence)::date + (interval '1 month' * month_offset))::date;
        max_day := extract(day from (date_trunc('month', candidate_month_start)::timestamp + interval '1 month - 1 day'));

        foreach day_value in array repeat_days_of_month loop
          if day_value < 1 or day_value > max_day then
            continue;
          end if;

          candidate_date := make_date(
            extract(year from candidate_month_start)::integer,
            extract(month from candidate_month_start)::integer,
            day_value
          );

          if candidate_date > current_occurrence then
            return candidate_date;
          end if;
        end loop;
      end loop;

      return current_occurrence + 1;
    else
      return current_occurrence + 1;
  end case;
end;
$$;

create or replace function public.generate_recurring_assignments_for_user(target_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rule record;
  created_count integer := 0;
  local_now timestamp without time zone;
  horizon_date date;
  next_occurrence date;
  assigned_date date;
  due_date date;
begin
  for rule in
    select *
    from public.assignment_repeat_rules
    where is_active = true
      and (target_user_id is null or user_id = target_user_id)
    order by next_occurrence_on asc, created_at asc
  loop
    local_now := timezone(coalesce(nullif(rule.repeat_timezone, ''), 'UTC'), now());
    horizon_date := (local_now::date + interval '1 month')::date;

    while rule.next_occurrence_on <= horizon_date loop
      assigned_date := case when rule.uses_assigned_date then rule.next_occurrence_on else null end;
      due_date := rule.next_occurrence_on + rule.due_offset_days;

      insert into public.assignments (
        user_id,
        name,
        class_name,
        assigned_date,
        due_date,
        due_time,
        description,
        difficulty,
        status,
        repeat_enabled,
        repeat_every,
        repeat_time,
        repeat_days_of_week,
        repeat_days_of_month,
        repeat_timezone,
        repeat_rule_id
      )
      values (
        rule.user_id,
        rule.name,
        rule.class_name,
        assigned_date,
        due_date,
        coalesce(rule.repeat_time, time '00:00'),
        rule.description,
        rule.difficulty,
        'active',
        true,
        rule.repeat_every,
        rule.repeat_time,
        rule.repeat_days_of_week,
        rule.repeat_days_of_month,
        rule.repeat_timezone,
        rule.id
      )
      on conflict (repeat_rule_id, due_date) do nothing;

      if found then
        created_count := created_count + 1;
      end if;

      next_occurrence := public.next_assignment_repeat_occurrence(
        rule.next_occurrence_on,
        rule.repeat_every,
        rule.repeat_days_of_week,
        rule.repeat_days_of_month
      );

      update public.assignment_repeat_rules
      set next_occurrence_on = next_occurrence,
          updated_at = timezone('utc', now())
      where id = rule.id;

      rule.next_occurrence_on := next_occurrence;
    end loop;
  end loop;

  return created_count;
end;
$$;

create or replace function public.sync_recurring_assignments_for_current_user()
returns integer
language sql
security definer
set search_path = public
as $$
  select public.generate_recurring_assignments_for_user(auth.uid());
$$;

grant execute on function public.sync_recurring_assignments_for_current_user() to authenticated;

alter table public.assignment_repeat_rules enable row level security;

drop policy if exists "Users can read their own repeat rules" on public.assignment_repeat_rules;
create policy "Users can read their own repeat rules"
on public.assignment_repeat_rules
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own repeat rules" on public.assignment_repeat_rules;
create policy "Users can create their own repeat rules"
on public.assignment_repeat_rules
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own repeat rules" on public.assignment_repeat_rules;
create policy "Users can update their own repeat rules"
on public.assignment_repeat_rules
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own repeat rules" on public.assignment_repeat_rules;
create policy "Users can delete their own repeat rules"
on public.assignment_repeat_rules
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when insufficient_privilege or undefined_file then
      raise notice 'pg_cron is not available in this project. Recurring assignments will still sync on login, but offline background generation needs pg_cron.';
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'learnself-recurring-assignments';

    perform cron.schedule(
      'learnself-recurring-assignments',
      '*/5 * * * *',
      $job$select public.generate_recurring_assignments_for_user();$job$
    );
  end if;
end
$$;

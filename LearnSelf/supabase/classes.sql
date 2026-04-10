create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists role text not null default 'student',
  add column if not exists teacher_verification_status text not null default 'none',
  add column if not exists teacher_verified_at timestamptz;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher_pending', 'teacher'));

alter table public.profiles drop constraint if exists profiles_teacher_verification_status_check;
alter table public.profiles
  add constraint profiles_teacher_verification_status_check
  check (teacher_verification_status in ('none', 'pending', 'approved', 'rejected'));

create table if not exists public.teacher_verification_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  admin_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (teacher_id, code)
);

create table if not exists public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (class_id, student_id)
);

create table if not exists public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  description text,
  due_date date not null,
  due_time time not null default time '00:00',
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Group')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists classes_teacher_idx on public.classes (teacher_id, created_at desc);
create index if not exists class_memberships_class_idx on public.class_memberships (class_id, status);
create index if not exists class_assignments_teacher_idx on public.class_assignments (teacher_id, created_at desc);

create or replace function public.approve_teacher_verification_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = 'teacher',
      teacher_verification_status = 'approved',
      teacher_verified_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where user_id = target_user_id;

  update public.teacher_verification_requests
  set status = 'approved',
      reviewed_at = timezone('utc', now())
  where requester_user_id = target_user_id
    and status = 'pending';
end;
$$;

grant execute on function public.approve_teacher_verification_for_user(uuid) to authenticated;

alter table public.teacher_verification_requests enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.class_assignments enable row level security;

drop policy if exists "Users can read their own teacher verification requests" on public.teacher_verification_requests;
create policy "Users can read their own teacher verification requests"
on public.teacher_verification_requests
for select to authenticated
using (auth.uid() = requester_user_id);

drop policy if exists "Users can create own teacher verification requests" on public.teacher_verification_requests;
create policy "Users can create own teacher verification requests"
on public.teacher_verification_requests
for insert to authenticated
with check (auth.uid() = requester_user_id);

drop policy if exists "Teachers can read their own classes" on public.classes;
create policy "Teachers can read their own classes"
on public.classes
for select to authenticated
using (auth.uid() = teacher_id);

drop policy if exists "Teachers can create their own classes" on public.classes;
create policy "Teachers can create their own classes"
on public.classes
for insert to authenticated
with check (
  auth.uid() = teacher_id
  and exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
      and teacher_verification_status = 'approved'
  )
);

drop policy if exists "Teachers can read class memberships for own classes" on public.class_memberships;
create policy "Teachers can read class memberships for own classes"
on public.class_memberships
for select to authenticated
using (
  exists (
    select 1 from public.classes c
    where c.id = class_id and c.teacher_id = auth.uid()
  )
  or auth.uid() = student_id
);

drop policy if exists "Students can join classes themselves" on public.class_memberships;
create policy "Students can join classes themselves"
on public.class_memberships
for insert to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Teachers can create class assignments for own classes" on public.class_assignments;
create policy "Teachers can create class assignments for own classes"
on public.class_assignments
for insert to authenticated
with check (
  auth.uid() = teacher_id
  and exists (
    select 1 from public.classes c
    where c.id = class_id and c.teacher_id = auth.uid()
  )
);

drop policy if exists "Teachers can read class assignments for own classes" on public.class_assignments;
create policy "Teachers can read class assignments for own classes"
on public.class_assignments
for select to authenticated
using (
  auth.uid() = teacher_id
  or exists (
    select 1
    from public.class_memberships m
    where m.class_id = class_id
      and m.student_id = auth.uid()
      and m.status = 'active'
  )
);

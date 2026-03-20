create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  title text not null check (char_length(trim(title)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  withdrawn_at timestamptz
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_posts_status_created_at_idx
  on public.community_posts (status, created_at desc);

create index if not exists community_comments_post_created_at_idx
  on public.community_comments (post_id, created_at asc);

create or replace function public.touch_community_post_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at
before update on public.community_posts
for each row
execute function public.touch_community_post_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

drop policy if exists "Community posts are visible to authenticated users" on public.community_posts;
create policy "Community posts are visible to authenticated users"
on public.community_posts
for select
to authenticated
using (status = 'open' or auth.uid() = user_id);

drop policy if exists "Users can create their own community posts" on public.community_posts;
create policy "Users can create their own community posts"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owners can withdraw recent community posts" on public.community_posts;
create policy "Owners can withdraw recent community posts"
on public.community_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status = 'withdrawn'
  and withdrawn_at is not null
  and now() <= created_at + interval '24 hours'
);

drop policy if exists "Community comments are visible with visible posts" on public.community_comments;
create policy "Community comments are visible with visible posts"
on public.community_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.community_posts posts
    where posts.id = post_id
      and (posts.status = 'open' or posts.user_id = auth.uid())
  )
);

drop policy if exists "Users can comment on open community posts" on public.community_comments;
create policy "Users can comment on open community posts"
on public.community_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.community_posts posts
    where posts.id = post_id
      and posts.status = 'open'
  )
);

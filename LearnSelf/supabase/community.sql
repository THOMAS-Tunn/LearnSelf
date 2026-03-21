create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint friendships_distinct_users check (user_low_id <> user_high_id),
  constraint friendships_unique_pair unique (user_low_id, user_high_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  author_avatar_url text,
  title text not null check (char_length(trim(title)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 10 and 4000),
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  withdrawn_at timestamptz
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  author_avatar_url text,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_post_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.community_comment_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  is_favorite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, comment_id)
);

create table if not exists public.community_post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.community_comment_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, comment_id)
);

alter table public.community_posts add column if not exists author_avatar_url text;
alter table public.community_posts add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.community_posts add column if not exists deleted_at timestamptz;
alter table public.community_posts add column if not exists withdrawn_at timestamptz;
alter table public.community_comments add column if not exists author_avatar_url text;

alter table public.community_posts drop constraint if exists community_posts_status_check;

update public.community_posts
set status = 'deleted',
    deleted_at = coalesce(deleted_at, withdrawn_at, timezone('utc', now()))
where status = 'withdrawn';

alter table public.community_posts
  add constraint community_posts_status_check check (status in ('open', 'deleted'));

insert into public.profiles (user_id, display_name, email, avatar_url)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(users.email, ''), '@', 1),
    'Student'
  ),
  coalesce(users.email, ''),
  nullif(trim(users.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users as users
where users.email is not null
on conflict (user_id) do update
set display_name = excluded.display_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

create index if not exists profiles_email_idx
  on public.profiles (email);

create index if not exists profiles_display_name_idx
  on public.profiles (display_name);

create index if not exists friendships_user_low_idx
  on public.friendships (user_low_id);

create index if not exists friendships_user_high_idx
  on public.friendships (user_high_id);

create index if not exists community_posts_status_created_at_idx
  on public.community_posts (status, created_at desc);

create index if not exists community_comments_post_created_at_idx
  on public.community_comments (post_id, created_at asc);

create index if not exists community_post_preferences_post_idx
  on public.community_post_preferences (post_id);

create index if not exists community_comment_preferences_comment_idx
  on public.community_comment_preferences (comment_id);

create index if not exists community_post_likes_post_idx
  on public.community_post_likes (post_id);

create index if not exists community_comment_likes_comment_idx
  on public.community_comment_likes (comment_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at
before update on public.community_posts
for each row
execute function public.touch_updated_at();

drop trigger if exists community_post_preferences_updated_at on public.community_post_preferences;
create trigger community_post_preferences_updated_at
before update on public.community_post_preferences
for each row
execute function public.touch_updated_at();

drop trigger if exists community_comment_preferences_updated_at on public.community_comment_preferences;
create trigger community_comment_preferences_updated_at
before update on public.community_comment_preferences
for each row
execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_preferences enable row level security;
alter table public.community_comment_preferences enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comment_likes enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can create their own profile row" on public.profiles;
create policy "Users can create their own profile row"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile row" on public.profiles;
create policy "Users can update their own profile row"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Friendships are visible to both users" on public.friendships;
create policy "Friendships are visible to both users"
on public.friendships
for select
to authenticated
using (auth.uid() = user_low_id or auth.uid() = user_high_id);

drop policy if exists "Users can create their own friendships" on public.friendships;
create policy "Users can create their own friendships"
on public.friendships
for insert
to authenticated
with check (
  auth.uid() = user_low_id
  or auth.uid() = user_high_id
);

drop policy if exists "Users can delete their own friendships" on public.friendships;
create policy "Users can delete their own friendships"
on public.friendships
for delete
to authenticated
using (auth.uid() = user_low_id or auth.uid() = user_high_id);

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

drop policy if exists "Owners can update recent community posts" on public.community_posts;
create policy "Owners can update recent community posts"
on public.community_posts
for update
to authenticated
using (
  auth.uid() = user_id
  and now() <= created_at + interval '24 hours'
)
with check (
  auth.uid() = user_id
  and status in ('open', 'deleted')
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

drop policy if exists "Users can view their own post preferences" on public.community_post_preferences;
create policy "Users can view their own post preferences"
on public.community_post_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own post preferences" on public.community_post_preferences;
create policy "Users can insert their own post preferences"
on public.community_post_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own post preferences" on public.community_post_preferences;
create policy "Users can update their own post preferences"
on public.community_post_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own post preferences" on public.community_post_preferences;
create policy "Users can delete their own post preferences"
on public.community_post_preferences
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own comment preferences" on public.community_comment_preferences;
create policy "Users can view their own comment preferences"
on public.community_comment_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own comment preferences" on public.community_comment_preferences;
create policy "Users can insert their own comment preferences"
on public.community_comment_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comment preferences" on public.community_comment_preferences;
create policy "Users can update their own comment preferences"
on public.community_comment_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comment preferences" on public.community_comment_preferences;
create policy "Users can delete their own comment preferences"
on public.community_comment_preferences
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Post likes are visible to authenticated users" on public.community_post_likes;
create policy "Post likes are visible to authenticated users"
on public.community_post_likes
for select
to authenticated
using (true);

drop policy if exists "Users can insert their own post likes" on public.community_post_likes;
create policy "Users can insert their own post likes"
on public.community_post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own post likes" on public.community_post_likes;
create policy "Users can delete their own post likes"
on public.community_post_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Comment likes are visible to authenticated users" on public.community_comment_likes;
create policy "Comment likes are visible to authenticated users"
on public.community_comment_likes
for select
to authenticated
using (true);

drop policy if exists "Users can insert their own comment likes" on public.community_comment_likes;
create policy "Users can insert their own comment likes"
on public.community_comment_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comment likes" on public.community_comment_likes;
create policy "Users can delete their own comment likes"
on public.community_comment_likes
for delete
to authenticated
using (auth.uid() = user_id);

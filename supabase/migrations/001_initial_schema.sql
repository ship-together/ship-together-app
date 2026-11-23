-- Ship Together: Supabase PostgreSQL Schema & Row Level Security Policies

create extension if not exists "pgcrypto";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text not null default '',
  bio text not null default '' check (char_length(bio) <= 400),
  location text not null default '' check (char_length(location) <= 80),
  skills text[] not null default '{}',
  github_url text not null default '',
  portfolio_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);

-- 2. Posts (max 5 lines / 600 chars)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 600),
  project_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_author_created on public.posts (author_id, created_at desc);
create index if not exists idx_posts_created on public.posts (created_at desc);

-- 3. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post_created on public.comments (post_id, created_at asc);

-- 4. Post Likes (unique per user & post)
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_post_likes_post_user unique (post_id, user_id)
);

create index if not exists idx_post_likes_post on public.post_likes (post_id);

-- 5. Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null check (char_length(description) between 10 and 600),
  cover_image_url text not null default '',
  live_demo_url text not null default '',
  github_url text not null default '',
  tags text[] not null default '{}',
  status text not null check (status in ('Building', 'Launched', 'Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects (owner_id, created_at desc);
create index if not exists idx_projects_status on public.projects (status, created_at desc);

-- 6. Collaboration Requests
create table if not exists public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 1200),
  skills_needed text[] not null default '{}',
  project_name text not null default '',
  project_url text not null default '',
  collaboration_type text not null check (
    collaboration_type in ('Open Source', 'Startup', 'Side Project', 'Learning Together')
  ),
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collab_requests_status_type
  on public.collaboration_requests (status, collaboration_type, created_at desc);

-- 7. Collaboration Applications (strictly private to applicant & opportunity owner)
create table if not exists public.collaboration_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.collaboration_requests (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 600),
  skills text[] not null default '{}',
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_collab_app_request_applicant unique (request_id, applicant_id)
);

create index if not exists idx_collab_apps_request on public.collaboration_applications (request_id);
create index if not exists idx_collab_apps_applicant on public.collaboration_applications (applicant_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.projects enable row level security;
alter table public.collaboration_requests enable row level security;
alter table public.collaboration_applications enable row level security;

-- Profiles RLS
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Posts RLS
create policy "Posts are publicly readable"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can update own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- Comments RLS
create policy "Comments are publicly readable"
  on public.comments for select using (true);

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "Authors can delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id);

-- Post Likes RLS
create policy "Post likes are publicly readable"
  on public.post_likes for select using (true);

create policy "Authenticated users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Projects RLS
create policy "Projects are publicly readable"
  on public.projects for select using (true);

create policy "Authenticated users can publish projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- Collaboration Requests RLS
create policy "Collaboration requests are publicly readable"
  on public.collaboration_requests for select using (true);

create policy "Authenticated users can post opportunities"
  on public.collaboration_requests for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own opportunities"
  on public.collaboration_requests for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete own opportunities"
  on public.collaboration_requests for delete
  using (auth.uid() = owner_id);

-- Collaboration Applications RLS (Private to applicant + opportunity owner)
create policy "Applications visible only to applicant and opportunity owner"
  on public.collaboration_applications for select
  using (
    auth.uid() = applicant_id
    or exists (
      select 1 from public.collaboration_requests cr
      where cr.id = request_id and cr.owner_id = auth.uid()
    )
  );

create policy "Authenticated users can submit applications to open opportunities"
  on public.collaboration_applications for insert
  with check (
    auth.uid() = applicant_id
    and status = 'Pending'
    and exists (
      select 1 from public.collaboration_requests cr
      where cr.id = request_id
        and cr.status = 'Open'
        and cr.owner_id <> auth.uid()
    )
  );

create policy "Opportunity owners can review pending applications"
  on public.collaboration_applications for update
  using (
    exists (
      select 1 from public.collaboration_requests cr
      where cr.id = request_id and cr.owner_id = auth.uid()
    )
  )
  with check (
    status in ('Accepted', 'Rejected')
    and exists (
      select 1 from public.collaboration_requests cr
      where cr.id = request_id and cr.owner_id = auth.uid()
    )
  );

create policy "Applicants can withdraw pending applications"
  on public.collaboration_applications for delete
  using (auth.uid() = applicant_id and status = 'Pending');

-- 8. Storage Buckets & Object Policies (avatars & project-images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('project-images', 'project-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Public read access for avatars and project-images"
  on storage.objects for select
  using (bucket_id in ('avatars', 'project-images'));

create policy "Authenticated users upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own uploaded media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own uploaded media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'project-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Chạy file này trong Supabase > SQL Editor

-- Bảng tasks (checklist)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  priority text not null default 'm',
  done boolean not null default false,
  day date not null default current_date,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users manage own tasks" on tasks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bảng timeline
create table if not exists timeline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  time text not null,
  name text not null,
  done boolean not null default false,
  day date not null default current_date,
  created_at timestamptz default now()
);
alter table timeline_items enable row level security;
create policy "Users manage own timeline" on timeline_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bảng captures (quick capture)
create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  tag text not null default 'note',
  day date not null default current_date,
  created_at timestamptz default now()
);
alter table captures enable row level security;
create policy "Users manage own captures" on captures
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bảng daily_review
create table if not exists daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day date not null default current_date,
  mood text,
  note text,
  focus_seconds integer default 0,
  completed_pomos integer default 0,
  energy jsonb default '{}',
  updated_at timestamptz default now(),
  unique(user_id, day)
);
alter table daily_reviews enable row level security;
create policy "Users manage own reviews" on daily_reviews
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp default now()
);

-- Mesocycles
create table if not exists public.mesocycles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  is_active boolean default false,
  started_at timestamp default now(),
  ended_at timestamp null,
  created_at timestamp default now()
);

-- Workout Days
create table if not exists public.workout_days (
  id uuid default gen_random_uuid() primary key,
  mesocycle_id uuid not null references public.mesocycles(id) on delete cascade,
  day_number integer,
  name text not null,
  sort_order integer,
  created_at timestamp default now()
);

-- Exercises
create table if not exists public.exercises (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  created_at timestamp default now()
);

-- Workout Templates
create table if not exists public.workout_templates (
  id uuid default gen_random_uuid() primary key,
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  target_sets integer,
  min_reps integer,
  max_reps integer,
  notes text,
  sort_order integer,
  created_at timestamp default now()
);

-- Workout Sessions
create table if not exists public.workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  mesocycle_id uuid not null references public.mesocycles(id) on delete cascade,
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  started_at timestamp,
  completed_at timestamp null,
  microcycle_number integer,
  created_at timestamp default now()
);

-- Exercise Sets
create table if not exists public.exercise_sets (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number integer,
  weight float,
  reps integer,
  rir integer null,
  created_at timestamp default now()
);

-- Bodyweight Entries
create table if not exists public.bodyweight_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  weight float not null,
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table public.mesocycles enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.bodyweight_entries enable row level security;
alter table public.users enable row level security;

-- Create RLS policies for mesocycles
create policy "Users can view own mesocycles" on public.mesocycles for select using (auth.uid() = user_id);
create policy "Users can create own mesocycles" on public.mesocycles for insert with check (auth.uid() = user_id);
create policy "Users can update own mesocycles" on public.mesocycles for update using (auth.uid() = user_id);
create policy "Users can delete own mesocycles" on public.mesocycles for delete using (auth.uid() = user_id);

-- RLS policies for workout_days (via mesocycle user_id)
create policy "Users can view own workout days" on public.workout_days for select using (
  exists (select 1 from public.mesocycles where mesocycles.id = mesocycle_id and mesocycles.user_id = auth.uid())
);
create policy "Users can manage own workout days" on public.workout_days for insert with check (
  exists (select 1 from public.mesocycles where mesocycles.id = mesocycle_id and mesocycles.user_id = auth.uid())
);
create policy "Users can update own workout days" on public.workout_days for update using (
  exists (select 1 from public.mesocycles where mesocycles.id = mesocycle_id and mesocycles.user_id = auth.uid())
);
create policy "Users can delete own workout days" on public.workout_days for delete using (
  exists (select 1 from public.mesocycles where mesocycles.id = mesocycle_id and mesocycles.user_id = auth.uid())
);

-- RLS policies for exercises
create policy "Users can view own exercises" on public.exercises for select using (auth.uid() = user_id);
create policy "Users can create own exercises" on public.exercises for insert with check (auth.uid() = user_id);
create policy "Users can update own exercises" on public.exercises for update using (auth.uid() = user_id);
create policy "Users can delete own exercises" on public.exercises for delete using (auth.uid() = user_id);

-- RLS policies for workout_templates (via workout_day -> mesocycle)
create policy "Users can view own templates" on public.workout_templates for select using (
  exists (select 1 from public.workout_days
    join public.mesocycles on mesocycles.id = workout_days.mesocycle_id
    where workout_days.id = workout_day_id and mesocycles.user_id = auth.uid())
);
create policy "Users can manage own templates" on public.workout_templates for insert with check (
  exists (select 1 from public.workout_days
    join public.mesocycles on mesocycles.id = workout_days.mesocycle_id
    where workout_days.id = workout_day_id and mesocycles.user_id = auth.uid())
);
create policy "Users can update own templates" on public.workout_templates for update using (
  exists (select 1 from public.workout_days
    join public.mesocycles on mesocycles.id = workout_days.mesocycle_id
    where workout_days.id = workout_day_id and mesocycles.user_id = auth.uid())
);
create policy "Users can delete own templates" on public.workout_templates for delete using (
  exists (select 1 from public.workout_days
    join public.mesocycles on mesocycles.id = workout_days.mesocycle_id
    where workout_days.id = workout_day_id and mesocycles.user_id = auth.uid())
);

-- RLS policies for workout_sessions
create policy "Users can view own sessions" on public.workout_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions" on public.workout_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.workout_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.workout_sessions for delete using (auth.uid() = user_id);

-- RLS policies for exercise_sets (via session)
create policy "Users can view own sets" on public.exercise_sets for select using (
  exists (select 1 from public.workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid())
);
create policy "Users can create own sets" on public.exercise_sets for insert with check (
  exists (select 1 from public.workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid())
);
create policy "Users can update own sets" on public.exercise_sets for update using (
  exists (select 1 from public.workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid())
);
create policy "Users can delete own sets" on public.exercise_sets for delete using (
  exists (select 1 from public.workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid())
);

-- RLS policies for bodyweight_entries
create policy "Users can view own weights" on public.bodyweight_entries for select using (auth.uid() = user_id);
create policy "Users can create own weights" on public.bodyweight_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own weights" on public.bodyweight_entries for update using (auth.uid() = user_id);
create policy "Users can delete own weights" on public.bodyweight_entries for delete using (auth.uid() = user_id);

-- RLS policies for users
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can create own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

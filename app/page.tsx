
-- 1. Store match result screenshot submissions
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique
    references public.registrations(id) on delete cascade,
  tournament_id uuid not null
    references public.tournaments(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  screenshot_path text not null,
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  winner_name text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.game_results enable row level security;

-- Players can see their own submissions.
drop policy if exists "Players view own game results"
on public.game_results;

create policy "Players view own game results"
on public.game_results
for select to authenticated
using (auth.uid() = user_id);

-- Admins can see every submission.
drop policy if exists "Admins view all game results"
on public.game_results;

create policy "Admins view all game results"
on public.game_results
for select to authenticated
using (
  exists (
    select 1 from public.admins
    where admins.user_id = auth.uid()
  )
);

-- A player can submit proof only for their own registration.
drop policy if exists "Players submit own result proof"
on public.game_results;

create policy "Players submit own result proof"
on public.game_results
for insert to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and winner_name is null
  and exists (
    select 1
    from public.registrations r
    where r.id = registration_id
      and r.user_id = auth.uid()
      and r.tournament_id = game_results.tournament_id
  )
);

-- Admins can approve or reject results.
drop policy if exists "Admins review game results"
on public.game_results;

create policy "Admins review game results"
on public.game_results
for update to authenticated
using (
  exists (
    select 1 from public.admins
    where admins.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admins
    where admins.user_id = auth.uid()
  )
);

-- Public can see approved results only.
drop policy if exists "Anyone can view approved game results"
on public.game_results;

create policy "Anyone can view approved game results"
on public.game_results
for select to anon, authenticated
using (status = 'approved');

-- 2. Private screenshot storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'result-proofs',
  'result-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Players can upload screenshots into their own user-ID folder.
drop policy if exists "Players upload own result screenshots"
on storage.objects;

create policy "Players upload own result screenshots"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'result-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Players and admins can read authorized proof images.
drop policy if exists "Authorized users read result screenshots"
on storage.objects;

create policy "Authorized users read result screenshots"
on storage.objects
for select to authenticated
using (
  bucket_id = 'result-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.admins
      where admins.user_id = auth.uid()
    )
  )
);

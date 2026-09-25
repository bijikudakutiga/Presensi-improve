-- =====================================================================
-- MODUL TASK & PROYEK (Kanban)
-- Jalankan SETELAH supabase/schema.sql. Aman dijalankan berulang kali.
-- =====================================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_personal boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  detail text,
  priority text not null default 'Sedang' check (priority in ('Rendah', 'Sedang', 'Tinggi')),
  status text not null default 'belum_dimulai' check (status in ('belum_dimulai', 'sedang_berlangsung', 'selesai')),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_assignee_idx on public.tasks (assigned_to);

alter table public.tasks enable row level security;

-- Otomatis jadikan pembuat proyek sebagai anggota proyek itu sendiri.
create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id) values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists project_add_creator on public.projects;
create trigger project_add_creator
  after insert on public.projects
  for each row execute procedure public.add_creator_as_member();

-- ---------------------------------------------------------------------
-- RLS: projects
-- ---------------------------------------------------------------------
drop policy if exists "Lihat proyek jika anggota/pembuat/admin" on public.projects;
create policy "Lihat proyek jika anggota/pembuat/admin"
  on public.projects for select
  using (
    created_by = auth.uid()
    or exists (select 1 from public.project_members pm where pm.project_id = projects.id and pm.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Siapa saja bisa buat proyek" on public.projects;
create policy "Siapa saja bisa buat proyek"
  on public.projects for insert
  with check (created_by = auth.uid());

drop policy if exists "Pembuat/admin bisa ubah proyek" on public.projects;
create policy "Pembuat/admin bisa ubah proyek"
  on public.projects for update
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Pembuat/admin bisa hapus proyek" on public.projects;
create policy "Pembuat/admin bisa hapus proyek"
  on public.projects for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------
-- RLS: project_members
-- ---------------------------------------------------------------------
drop policy if exists "Lihat anggota jika anggota/pembuat/admin" on public.project_members;
create policy "Lihat anggota jika anggota/pembuat/admin"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.projects pr where pr.id = project_members.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.project_members pm2 where pm2.project_id = project_members.project_id and pm2.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Pembuat proyek/admin kelola anggota" on public.project_members;
create policy "Pembuat proyek/admin kelola anggota"
  on public.project_members for all
  using (
    exists (select 1 from public.projects pr where pr.id = project_members.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.projects pr where pr.id = project_members.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------
-- RLS: tasks
-- ---------------------------------------------------------------------
drop policy if exists "Lihat task jika anggota proyek/admin" on public.tasks;
create policy "Lihat task jika anggota proyek/admin"
  on public.tasks for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = tasks.project_id and pm.user_id = auth.uid()
    )
    or exists (select 1 from public.projects pr where pr.id = tasks.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Anggota proyek bisa tambah task" on public.tasks;
create policy "Anggota proyek bisa tambah task"
  on public.tasks for insert
  with check (
    created_by = auth.uid()
    and (
      exists (select 1 from public.project_members pm where pm.project_id = tasks.project_id and pm.user_id = auth.uid())
      or exists (select 1 from public.projects pr where pr.id = tasks.project_id and pr.created_by = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists "Anggota proyek bisa ubah task" on public.tasks;
create policy "Anggota proyek bisa ubah task"
  on public.tasks for update
  using (
    exists (select 1 from public.project_members pm where pm.project_id = tasks.project_id and pm.user_id = auth.uid())
    or exists (select 1 from public.projects pr where pr.id = tasks.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Pembuat task/proyek/admin bisa hapus task" on public.tasks;
create policy "Pembuat task/proyek/admin bisa hapus task"
  on public.tasks for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.projects pr where pr.id = tasks.project_id and pr.created_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Set started_at / completed_at otomatis mengikuti perubahan status.
create or replace function public.tasks_track_status_time()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sedang_berlangsung' and old.status = 'belum_dimulai' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'selesai' and new.completed_at is null then
    new.completed_at := now();
    if new.started_at is null then
      new.started_at := now();
    end if;
  end if;
  if new.status <> 'selesai' then
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_status_time_trigger on public.tasks;
create trigger tasks_status_time_trigger
  before update on public.tasks
  for each row execute procedure public.tasks_track_status_time();

-- =====================================================================
-- MODUL STRUKTUR JABATAN & KPI 360°
-- Jalankan SETELAH supabase/schema.sql. Aman dijalankan berulang kali.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. JABATAN (bisa dicustom HR) & ATASAN LANGSUNG tiap karyawan
-- ---------------------------------------------------------------------
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.positions enable row level security;

drop policy if exists "Semua pengguna login bisa lihat daftar jabatan" on public.positions;
create policy "Semua pengguna login bisa lihat daftar jabatan"
  on public.positions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin bisa kelola jabatan" on public.positions;
create policy "Hanya admin bisa kelola jabatan"
  on public.positions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Jabatan awal sesuai struktur perusahaan (boleh diubah/ditambah lewat menu admin).
insert into public.positions (name, level)
values
  ('Owner', 0),
  ('HR Manager', 1),
  ('Creative Project Manager', 1),
  ('Creative Design Manager', 1),
  ('Secretary', 1),
  ('HR Staff', 2),
  ('Partnership', 2),
  ('Community & Event', 2),
  ('Creative Design', 2)
on conflict (name) do nothing;

alter table public.profiles add column if not exists position_id uuid references public.positions (id) on delete set null;
alter table public.profiles add column if not exists supervisor_id uuid references public.profiles (id) on delete set null;

-- Perluas guard privilege-escalation (dari schema.sql) supaya karyawan juga
-- tidak bisa mengubah jabatan/atasan langsungnya sendiri lewat API langsung —
-- kolom ini menentukan struktur organisasi yang dipakai KPI 360°.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.base_salary := old.base_salary;
    new.position_id := old.position_id;
    new.supervisor_id := old.supervisor_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Direktori karyawan terbatas (nama & jabatan saja) untuk keperluan
-- lintas-karyawan: memilih anggota proyek, menampilkan siapa menilai
-- siapa di KPI, dsb — tanpa membuka data sensitif (gaji, alamat, dll).
-- ---------------------------------------------------------------------
create or replace function public.get_employee_directory()
returns table (id uuid, full_name text, avatar_url text, position_id uuid, supervisor_id uuid, role text)
language sql
security definer set search_path = public
as $$
  select id, full_name, avatar_url, position_id, supervisor_id, role from public.profiles;
$$;

grant execute on function public.get_employee_directory() to authenticated;

-- ---------------------------------------------------------------------
-- 3. TEMPLATE KPI (pertanyaan & lingkup penilaian, dicustom HR)
-- ---------------------------------------------------------------------
create table if not exists public.kpi_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.kpi_templates enable row level security;

drop policy if exists "Semua pengguna login bisa lihat template KPI" on public.kpi_templates;
create policy "Semua pengguna login bisa lihat template KPI"
  on public.kpi_templates for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin kelola template KPI" on public.kpi_templates;
create policy "Hanya admin kelola template KPI"
  on public.kpi_templates for all
  using (public.is_admin())
  with check (public.is_admin());

-- Jabatan mana saja yang bisa DINILAI (jadi subjek) memakai template ini.
-- Jika kosong untuk suatu template = berlaku untuk semua jabatan.
create table if not exists public.kpi_template_positions (
  template_id uuid not null references public.kpi_templates (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  primary key (template_id, position_id)
);

alter table public.kpi_template_positions enable row level security;

drop policy if exists "Semua pengguna login bisa lihat lingkup template" on public.kpi_template_positions;
create policy "Semua pengguna login bisa lihat lingkup template"
  on public.kpi_template_positions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin kelola lingkup template" on public.kpi_template_positions;
create policy "Hanya admin kelola lingkup template"
  on public.kpi_template_positions for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.kpi_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.kpi_templates (id) on delete cascade,
  question_text text not null,
  relation_scope text not null default 'semua'
    check (relation_scope in ('semua', 'atasan_ke_bawahan', 'bawahan_ke_atasan', 'rekan_setim')),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.kpi_questions enable row level security;

drop policy if exists "Semua pengguna login bisa lihat pertanyaan KPI" on public.kpi_questions;
create policy "Semua pengguna login bisa lihat pertanyaan KPI"
  on public.kpi_questions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin kelola pertanyaan KPI" on public.kpi_questions;
create policy "Hanya admin kelola pertanyaan KPI"
  on public.kpi_questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. PERIODE KPI
-- ---------------------------------------------------------------------
create table if not exists public.kpi_periods (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.kpi_templates (id),
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

alter table public.kpi_periods enable row level security;

drop policy if exists "Semua pengguna login bisa lihat periode KPI" on public.kpi_periods;
create policy "Semua pengguna login bisa lihat periode KPI"
  on public.kpi_periods for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin kelola periode KPI" on public.kpi_periods;
create policy "Hanya admin kelola periode KPI"
  on public.kpi_periods for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. PENUGASAN PENILAIAN (siapa menilai siapa) & JAWABAN
-- ---------------------------------------------------------------------
create table if not exists public.kpi_assignments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.kpi_periods (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  relation text not null check (relation in ('atasan_ke_bawahan', 'bawahan_ke_atasan', 'rekan_setim')),
  status text not null default 'pending' check (status in ('pending', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (period_id, reviewer_id, subject_id, relation)
);

create index if not exists kpi_assignments_reviewer_idx on public.kpi_assignments (reviewer_id);
create index if not exists kpi_assignments_subject_idx on public.kpi_assignments (subject_id);

alter table public.kpi_assignments enable row level security;

drop policy if exists "Reviewer lihat penugasan miliknya" on public.kpi_assignments;
create policy "Reviewer lihat penugasan miliknya"
  on public.kpi_assignments for select
  using (reviewer_id = auth.uid());

drop policy if exists "Subjek lihat penugasan setelah periode ditutup" on public.kpi_assignments;
create policy "Subjek lihat penugasan setelah periode ditutup"
  on public.kpi_assignments for select
  using (
    subject_id = auth.uid()
    and exists (select 1 from public.kpi_periods pp where pp.id = kpi_assignments.period_id and pp.status = 'closed')
  );

drop policy if exists "Admin akses penuh penugasan KPI" on public.kpi_assignments;
create policy "Admin akses penuh penugasan KPI"
  on public.kpi_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Reviewer update status penugasan sendiri" on public.kpi_assignments;
create policy "Reviewer update status penugasan sendiri"
  on public.kpi_assignments for update
  using (
    reviewer_id = auth.uid()
    and exists (select 1 from public.kpi_periods pp where pp.id = kpi_assignments.period_id and pp.status = 'open')
  );

create table if not exists public.kpi_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.kpi_assignments (id) on delete cascade,
  question_id uuid not null references public.kpi_questions (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, question_id)
);

alter table public.kpi_responses enable row level security;

drop policy if exists "Reviewer kelola jawaban sendiri saat periode terbuka" on public.kpi_responses;
create policy "Reviewer kelola jawaban sendiri saat periode terbuka"
  on public.kpi_responses for all
  using (
    exists (
      select 1 from public.kpi_assignments a
      join public.kpi_periods pp on pp.id = a.period_id
      where a.id = kpi_responses.assignment_id and a.reviewer_id = auth.uid() and pp.status = 'open'
    )
  )
  with check (
    exists (
      select 1 from public.kpi_assignments a
      join public.kpi_periods pp on pp.id = a.period_id
      where a.id = kpi_responses.assignment_id and a.reviewer_id = auth.uid() and pp.status = 'open'
    )
  );

drop policy if exists "Subjek lihat jawaban setelah periode ditutup" on public.kpi_responses;
create policy "Subjek lihat jawaban setelah periode ditutup"
  on public.kpi_responses for select
  using (
    exists (
      select 1 from public.kpi_assignments a
      join public.kpi_periods pp on pp.id = a.period_id
      where a.id = kpi_responses.assignment_id and a.subject_id = auth.uid() and pp.status = 'closed'
    )
  );

drop policy if exists "Admin lihat semua jawaban KPI" on public.kpi_responses;
create policy "Admin lihat semua jawaban KPI"
  on public.kpi_responses for select
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. FUNGSI generate_kpi_assignments
-- Membuat penugasan atasan->bawahan, bawahan->atasan, dan rekan setim
-- berdasarkan struktur atasan langsung (profiles.supervisor_id), lalu
-- membuka periode (status -> 'open'). Bisa dijalankan ulang selama
-- periode masih draft (menghapus & membuat ulang penugasan).
-- ---------------------------------------------------------------------
create or replace function public.generate_kpi_assignments(p_period_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_template_id uuid;
  v_status text;
  v_has_scope boolean;
  subj record;
  peer record;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin/HR yang bisa membuat penugasan KPI';
  end if;

  select template_id, status into v_template_id, v_status from public.kpi_periods where id = p_period_id;
  if v_template_id is null then
    raise exception 'Periode KPI tidak ditemukan';
  end if;
  if v_status = 'closed' then
    raise exception 'Periode ini sudah ditutup dan tidak bisa diubah lagi';
  end if;

  select exists (select 1 from public.kpi_template_positions where template_id = v_template_id) into v_has_scope;

  delete from public.kpi_assignments where period_id = p_period_id;

  for subj in
    select p.* from public.profiles p
    where (not v_has_scope) or exists (
      select 1 from public.kpi_template_positions tp
      where tp.template_id = v_template_id and tp.position_id = p.position_id
    )
  loop
    if subj.supervisor_id is not null then
      insert into public.kpi_assignments (period_id, reviewer_id, subject_id, relation)
      values (p_period_id, subj.supervisor_id, subj.id, 'atasan_ke_bawahan')
      on conflict do nothing;
    end if;

    for peer in select * from public.profiles where supervisor_id = subj.id loop
      insert into public.kpi_assignments (period_id, reviewer_id, subject_id, relation)
      values (p_period_id, peer.id, subj.id, 'bawahan_ke_atasan')
      on conflict do nothing;
    end loop;

    if subj.supervisor_id is not null then
      for peer in
        select * from public.profiles where supervisor_id = subj.supervisor_id and id <> subj.id
      loop
        insert into public.kpi_assignments (period_id, reviewer_id, subject_id, relation)
        values (p_period_id, peer.id, subj.id, 'rekan_setim')
        on conflict do nothing;
      end loop;
    end if;
  end loop;

  update public.kpi_periods set status = 'open', opened_at = now() where id = p_period_id;
end;
$$;

grant execute on function public.generate_kpi_assignments(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. FUNGSI submit_kpi_response — reviewer kirim/ubah 1 jawaban.
-- Memakai fungsi (bukan insert langsung) supaya status assignment ikut
-- ter-update secara konsisten.
-- ---------------------------------------------------------------------
create or replace function public.submit_kpi_response(
  p_assignment_id uuid,
  p_question_id uuid,
  p_score integer,
  p_comment text default null
) returns public.kpi_responses
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.kpi_responses;
begin
  if not exists (
    select 1 from public.kpi_assignments a
    join public.kpi_periods pp on pp.id = a.period_id
    where a.id = p_assignment_id and a.reviewer_id = auth.uid() and pp.status = 'open'
  ) then
    raise exception 'Penugasan tidak ditemukan atau periode sudah tidak terbuka';
  end if;

  insert into public.kpi_responses (assignment_id, question_id, score, comment)
  values (p_assignment_id, p_question_id, p_score, p_comment)
  on conflict (assignment_id, question_id) do update set
    score = excluded.score,
    comment = excluded.comment,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_kpi_response(uuid, uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. FUNGSI finalize_kpi_assignment — reviewer menandai selesai mengisi.
-- ---------------------------------------------------------------------
create or replace function public.finalize_kpi_assignment(p_assignment_id uuid)
returns public.kpi_assignments
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.kpi_assignments;
begin
  if not exists (
    select 1 from public.kpi_assignments a
    join public.kpi_periods pp on pp.id = a.period_id
    where a.id = p_assignment_id and a.reviewer_id = auth.uid() and pp.status = 'open'
  ) then
    raise exception 'Penugasan tidak ditemukan atau periode sudah tidak terbuka';
  end if;

  update public.kpi_assignments
  set status = 'submitted', submitted_at = now()
  where id = p_assignment_id and reviewer_id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Penugasan tidak ditemukan';
  end if;

  return v_row;
end;
$$;

grant execute on function public.finalize_kpi_assignment(uuid) to authenticated;

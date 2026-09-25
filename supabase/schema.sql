-- =====================================================================
-- SKEMA DATABASE APLIKASI PRESENSI KARYAWAN (v2)
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor.
-- Aman dijalankan berulang kali (idempotent) berkat "if exists" / "if not exists".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL PROFILES
-- Data karyawan: identitas, kepegawaian, kontak, bank, gaji pokok.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  avatar_url text,
  position text,
  employee_id text,
  join_date date,
  gender text check (gender in ('L', 'P')),
  place_of_birth text,
  date_of_birth date,
  marital_status text,
  religion text,
  blood_type text,
  phone text,
  id_number text,
  id_address text,
  domicile_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  base_salary numeric,
  created_at timestamptz not null default now()
);

-- Jika tabel profiles sudah ada dari versi sebelumnya, tambahkan kolom yang belum ada.
alter table public.profiles add column if not exists position text;
alter table public.profiles add column if not exists employee_id text;
alter table public.profiles add column if not exists join_date date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists place_of_birth text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists marital_status text;
alter table public.profiles add column if not exists religion text;
alter table public.profiles add column if not exists blood_type text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists id_address text;
alter table public.profiles add column if not exists domicile_address text;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;
alter table public.profiles add column if not exists bank_name text;
alter table public.profiles add column if not exists bank_account_number text;
alter table public.profiles add column if not exists bank_account_holder text;
alter table public.profiles add column if not exists base_salary numeric;

alter table public.profiles enable row level security;

drop policy if exists "Pengguna bisa melihat profil sendiri" on public.profiles;
create policy "Pengguna bisa melihat profil sendiri"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admin bisa melihat semua profil" on public.profiles;
create policy "Admin bisa melihat semua profil"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Pengguna bisa update profil sendiri" on public.profiles;
create policy "Pengguna bisa update profil sendiri"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Admin bisa update semua profil" on public.profiles;
create policy "Admin bisa update semua profil"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Trigger: otomatis buat baris profiles saat ada user baru mendaftar via Google.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cegah karyawan menaikkan role atau mengubah gaji pokok miliknya sendiri
-- lewat panggilan API langsung (di luar tampilan admin).
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    new.role := old.role;
    new.base_salary := old.base_salary;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_privilege_escalation_trigger on public.profiles;
create trigger prevent_self_privilege_escalation_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_self_privilege_escalation();

-- ---------------------------------------------------------------------
-- 2. TABEL OFFICES
-- ---------------------------------------------------------------------
create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 150,
  created_at timestamptz not null default now()
);

alter table public.offices enable row level security;

drop policy if exists "Semua pengguna login bisa melihat daftar kantor" on public.offices;
create policy "Semua pengguna login bisa melihat daftar kantor"
  on public.offices for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin bisa mengubah kantor" on public.offices;
create policy "Hanya admin bisa mengubah kantor"
  on public.offices for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------------------------------------------------------------------
-- 3. TABEL WORK_SCHEDULES
-- Satu baris pengaturan jam kerja & tarif payroll (berlaku global).
-- ---------------------------------------------------------------------
create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  start_time time not null default '08:00:00',
  end_time time not null default '16:00:00',
  late_grace_minutes integer not null default 0,
  lateness_rate_per_minute numeric not null default 0,
  overtime_rate_per_hour numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.work_schedules enable row level security;

drop policy if exists "Semua pengguna login bisa melihat jadwal kerja" on public.work_schedules;
create policy "Semua pengguna login bisa melihat jadwal kerja"
  on public.work_schedules for select
  using (auth.role() = 'authenticated');

drop policy if exists "Hanya admin bisa mengubah jadwal kerja" on public.work_schedules;
create policy "Hanya admin bisa mengubah jadwal kerja"
  on public.work_schedules for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------------------------------------------------------------------
-- 4. TABEL ATTENDANCE
-- type: in, out, visit_in, visit_out, overtime_in, overtime_out
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  office_id uuid references public.offices (id) on delete set null,
  type text not null check (type in ('in', 'out', 'visit_in', 'visit_out', 'overtime_in', 'overtime_out')),
  photo_url text,
  latitude double precision not null,
  longitude double precision not null,
  distance_meters double precision,
  within_radius boolean,
  note text,
  created_at timestamptz not null default now()
);

-- Jika tabel sudah ada dari versi sebelumnya dengan constraint lama (hanya in/out), perbarui.
alter table public.attendance drop constraint if exists attendance_type_check;
alter table public.attendance add constraint attendance_type_check
  check (type in ('in', 'out', 'visit_in', 'visit_out', 'overtime_in', 'overtime_out'));

create index if not exists attendance_user_created_idx
  on public.attendance (user_id, created_at desc);

alter table public.attendance enable row level security;

drop policy if exists "Karyawan bisa melihat presensi sendiri" on public.attendance;
create policy "Karyawan bisa melihat presensi sendiri"
  on public.attendance for select
  using (auth.uid() = user_id);

drop policy if exists "Admin bisa melihat semua presensi" on public.attendance;
create policy "Admin bisa melihat semua presensi"
  on public.attendance for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Catatan: insert baris attendance HANYA lewat fungsi record_attendance() (security definer)
-- di bawah, supaya jarak & status validasi tidak bisa dipalsukan dari sisi client.

-- ---------------------------------------------------------------------
-- 5. FUNGSI HAVERSINE
-- ---------------------------------------------------------------------
create or replace function public.haversine_meters(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql immutable
as $$
  select 6371000 * 2 * asin(
    sqrt(
      sin(radians(lat2 - lat1) / 2) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ^ 2
    )
  );
$$;

-- ---------------------------------------------------------------------
-- 6. FUNGSI record_attendance
-- Menghitung jarak ke kantor terdekat di server (tidak bisa dimanipulasi
-- dari browser), lalu menyimpan presensi. p_note dipakai untuk keterangan
-- kunjungan klien (visit_in).
-- ---------------------------------------------------------------------
create or replace function public.record_attendance(
  p_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_photo_path text,
  p_note text default null
) returns public.attendance
language plpgsql
security definer set search_path = public
as $$
declare
  v_office record;
  v_distance double precision;
  v_within boolean;
  v_row public.attendance;
begin
  if p_type not in ('in', 'out', 'visit_in', 'visit_out', 'overtime_in', 'overtime_out') then
    raise exception 'Jenis presensi tidak valid';
  end if;

  select o.id, o.radius_meters,
         public.haversine_meters(p_latitude, p_longitude, o.latitude, o.longitude) as dist
  into v_office
  from public.offices o
  order by dist asc
  limit 1;

  if v_office.id is not null then
    v_distance := v_office.dist;
    v_within := v_distance <= v_office.radius_meters;
  else
    v_distance := null;
    v_within := null;
  end if;

  insert into public.attendance (
    user_id, office_id, type, photo_url, latitude, longitude, distance_meters, within_radius, note
  ) values (
    auth.uid(), v_office.id, p_type, p_photo_path, p_latitude, p_longitude, v_distance, v_within, p_note
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.record_attendance(text, double precision, double precision, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. STORAGE BUCKETS
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Pengguna upload ke folder sendiri" on storage.objects;
create policy "Pengguna upload ke folder sendiri"
  on storage.objects for insert
  with check (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Pengguna lihat foto sendiri" on storage.objects;
create policy "Pengguna lihat foto sendiri"
  on storage.objects for select
  using (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admin lihat semua foto presensi" on storage.objects;
create policy "Admin lihat semua foto presensi"
  on storage.objects for select
  using (
    bucket_id = 'attendance-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Pengguna upload avatar sendiri" on storage.objects;
create policy "Pengguna upload avatar sendiri"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Pengguna update avatar sendiri" on storage.objects;
create policy "Pengguna update avatar sendiri"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Semua orang bisa lihat avatar (bucket publik)" on storage.objects;
create policy "Semua orang bisa lihat avatar (bucket publik)"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------
-- 8. PAYROLL: payroll_periods & payroll_items
-- ---------------------------------------------------------------------
create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null check (period_year between 2000 and 2100),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (period_month, period_year)
);

alter table public.payroll_periods enable row level security;

drop policy if exists "Admin akses penuh payroll_periods" on public.payroll_periods;
create policy "Admin akses penuh payroll_periods"
  on public.payroll_periods for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Karyawan lihat periode yang sudah final" on public.payroll_periods;
create policy "Karyawan lihat periode yang sudah final"
  on public.payroll_periods for select
  using (status = 'finalized');

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.payroll_periods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  base_salary numeric not null default 0,
  late_minutes numeric not null default 0,
  lateness_deduction numeric not null default 0,
  overtime_hours numeric not null default 0,
  overtime_pay numeric not null default 0,
  adjustment numeric not null default 0,
  adjustment_note text,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, user_id)
);

alter table public.payroll_items enable row level security;

drop policy if exists "Admin select payroll_items" on public.payroll_items;
create policy "Admin select payroll_items"
  on public.payroll_items for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admin insert payroll_items" on public.payroll_items;
create policy "Admin insert payroll_items"
  on public.payroll_items for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admin update payroll_items saat draft" on public.payroll_items;
create policy "Admin update payroll_items saat draft"
  on public.payroll_items for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.payroll_periods pp where pp.id = payroll_items.period_id and pp.status = 'draft')
  );

drop policy if exists "Admin delete payroll_items" on public.payroll_items;
create policy "Admin delete payroll_items"
  on public.payroll_items for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Karyawan lihat slip gaji sendiri yang final" on public.payroll_items;
create policy "Karyawan lihat slip gaji sendiri yang final"
  on public.payroll_items for select
  using (
    user_id = auth.uid()
    and exists (select 1 from public.payroll_periods pp where pp.id = payroll_items.period_id and pp.status = 'finalized')
  );

-- ---------------------------------------------------------------------
-- 9. FUNGSI generate_payroll
-- Menghitung ulang komponen presensi (telat & lembur) untuk semua
-- karyawan pada periode tertentu. Kolom "adjustment" & "adjustment_note"
-- (input manual HR) TIDAK ditimpa saat fungsi ini dijalankan ulang.
-- ---------------------------------------------------------------------
create or replace function public.generate_payroll(p_month int, p_year int)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_id uuid;
  v_schedule record;
  emp record;
  v_month_start timestamptz := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Jakarta');
  v_month_end timestamptz := v_month_start + interval '1 month';
  v_late_minutes numeric;
  v_overtime_hours numeric;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Hanya admin yang bisa membuat payroll';
  end if;

  select * into v_schedule from public.work_schedules order by updated_at desc limit 1;

  insert into public.payroll_periods (period_month, period_year, status)
  values (p_month, p_year, 'draft')
  on conflict (period_month, period_year) do nothing;

  select id into v_period_id from public.payroll_periods
  where period_month = p_month and period_year = p_year;

  if exists (select 1 from public.payroll_periods where id = v_period_id and status = 'finalized') then
    raise exception 'Periode ini sudah difinalisasi dan tidak bisa dihitung ulang.';
  end if;

  for emp in select * from public.profiles loop
    v_late_minutes := 0;
    if v_schedule.id is not null then
      select coalesce(sum(
        greatest(0, extract(epoch from (
          (a.created_at at time zone 'Asia/Jakarta')::time
          - (v_schedule.start_time + (v_schedule.late_grace_minutes || ' minutes')::interval)
        )) / 60)
      ), 0)
      into v_late_minutes
      from public.attendance a
      where a.user_id = emp.id
        and a.type = 'in'
        and a.created_at >= v_month_start and a.created_at < v_month_end;
    end if;

    select coalesce(sum(extract(epoch from (o.end_at - o.start_at)) / 3600), 0)
    into v_overtime_hours
    from (
      select
        a_in.created_at as start_at,
        (
          select min(a_out.created_at) from public.attendance a_out
          where a_out.user_id = emp.id and a_out.type = 'overtime_out'
            and a_out.created_at > a_in.created_at
            and a_out.created_at < a_in.created_at + interval '16 hours'
        ) as end_at
      from public.attendance a_in
      where a_in.user_id = emp.id and a_in.type = 'overtime_in'
        and a_in.created_at >= v_month_start and a_in.created_at < v_month_end
    ) o
    where o.end_at is not null;

    insert into public.payroll_items (
      period_id, user_id, base_salary, late_minutes, lateness_deduction,
      overtime_hours, overtime_pay, adjustment, total
    ) values (
      v_period_id,
      emp.id,
      coalesce(emp.base_salary, 0),
      round(v_late_minutes),
      round(v_late_minutes * coalesce(v_schedule.lateness_rate_per_minute, 0)),
      round(v_overtime_hours, 2),
      round(v_overtime_hours * coalesce(v_schedule.overtime_rate_per_hour, 0)),
      0,
      coalesce(emp.base_salary, 0)
        - round(v_late_minutes * coalesce(v_schedule.lateness_rate_per_minute, 0))
        + round(v_overtime_hours * coalesce(v_schedule.overtime_rate_per_hour, 0))
    )
    on conflict (period_id, user_id) do update set
      base_salary = excluded.base_salary,
      late_minutes = excluded.late_minutes,
      lateness_deduction = excluded.lateness_deduction,
      overtime_hours = excluded.overtime_hours,
      overtime_pay = excluded.overtime_pay,
      total = excluded.base_salary - excluded.lateness_deduction + excluded.overtime_pay + public.payroll_items.adjustment,
      updated_at = now();
  end loop;
end;
$$;

grant execute on function public.generate_payroll(int, int) to authenticated;

-- =====================================================================
-- LANGKAH SETELAH MENJALANKAN SCRIPT INI:
--
-- 1. Jadikan akun pertama sebagai admin (login dulu sekali via Google):
--    update public.profiles set role = 'admin' where email = 'email-admin@contoh.com';
--
-- 2. Tambahkan lokasi kantor lewat halaman "Lokasi Kantor" di aplikasi.
--
-- 3. Atur jam kerja & tarif payroll lewat halaman "Jadwal & Tarif".
--
-- 4. Isi "Gaji pokok" tiap karyawan lewat halaman "Data Karyawan" (admin).
-- =====================================================================

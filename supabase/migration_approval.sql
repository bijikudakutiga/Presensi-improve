-- Alur persetujuan akun: akun baru berstatus 'pending' sampai disetujui admin/HR.

alter table public.profiles add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected'));

update public.profiles set approval_status = 'approved' where email = 'nicoz.dkingz@gmail.com';

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.approval_status = 'approved');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  select * into v_invite from public.pending_admin_invites where email = new.email;

  insert into public.profiles (id, full_name, email, role, hr_access, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    case when v_invite.email is not null then 'admin' else 'employee' end,
    coalesce(v_invite.hr_access, false),
    case when v_invite.email is not null then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;

  if v_invite.email is not null then
    delete from public.pending_admin_invites where email = v_invite.email;
  end if;

  return new;
end;
$$;

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
  if not public.is_approved() then
    raise exception 'Akun belum disetujui HR/admin';
  end if;

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
  if not public.is_hr() then
    raise exception 'Hanya admin dengan akses HR yang bisa membuat payroll';
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

  for emp in select * from public.profiles where approval_status = 'approved' loop
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

create or replace function public.get_employee_directory()
returns table (id uuid, full_name text, avatar_url text, position_id uuid, supervisor_id uuid, role text)
language sql
security definer set search_path = public
as $$
  select id, full_name, avatar_url, position_id, supervisor_id, role
  from public.profiles
  where approval_status = 'approved' and public.is_approved();
$$;

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
    new.hr_access := old.hr_access;
    new.approval_status := old.approval_status;
  end if;
  return new;
end;
$$;

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
  if not public.is_hr() then
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
    where p.approval_status = 'approved' and ((not v_has_scope) or exists (
      select 1 from public.kpi_template_positions tp
      where tp.template_id = v_template_id and tp.position_id = p.position_id
    ))
  loop
    if subj.supervisor_id is not null then
      insert into public.kpi_assignments (period_id, reviewer_id, subject_id, relation)
      values (p_period_id, subj.supervisor_id, subj.id, 'atasan_ke_bawahan')
      on conflict do nothing;
    end if;

    for peer in select * from public.profiles where supervisor_id = subj.id and approval_status = 'approved' loop
      insert into public.kpi_assignments (period_id, reviewer_id, subject_id, relation)
      values (p_period_id, peer.id, subj.id, 'bawahan_ke_atasan')
      on conflict do nothing;
    end loop;

    if subj.supervisor_id is not null then
      for peer in
        select * from public.profiles where supervisor_id = subj.supervisor_id and id <> subj.id and approval_status = 'approved'
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

drop policy if exists "Semua pengguna login bisa melihat daftar kantor" on public.offices;
create policy "Semua pengguna login bisa melihat daftar kantor"
  on public.offices for select
  using (public.is_approved());

drop policy if exists "Semua pengguna login bisa melihat jadwal kerja" on public.work_schedules;
create policy "Semua pengguna login bisa melihat jadwal kerja"
  on public.work_schedules for select
  using (public.is_approved());

drop policy if exists "Pengguna upload ke folder sendiri" on storage.objects;
create policy "Pengguna upload ke folder sendiri"
  on storage.objects for insert
  with check (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

drop policy if exists "Siapa saja bisa buat proyek" on public.projects;
create policy "Siapa saja bisa buat proyek"
  on public.projects for insert
  with check (created_by = auth.uid() and public.is_approved());

drop policy if exists "Semua pengguna login bisa lihat daftar jabatan" on public.positions;
create policy "Semua pengguna login bisa lihat daftar jabatan"
  on public.positions for select
  using (public.is_approved());

drop policy if exists "Semua pengguna login bisa lihat template KPI" on public.kpi_templates;
create policy "Semua pengguna login bisa lihat template KPI"
  on public.kpi_templates for select
  using (public.is_approved());

drop policy if exists "Semua pengguna login bisa lihat lingkup template" on public.kpi_template_positions;
create policy "Semua pengguna login bisa lihat lingkup template"
  on public.kpi_template_positions for select
  using (public.is_approved());

drop policy if exists "Semua pengguna login bisa lihat pertanyaan KPI" on public.kpi_questions;
create policy "Semua pengguna login bisa lihat pertanyaan KPI"
  on public.kpi_questions for select
  using (public.is_approved());

drop policy if exists "Semua pengguna login bisa lihat periode KPI" on public.kpi_periods;
create policy "Semua pengguna login bisa lihat periode KPI"
  on public.kpi_periods for select
  using (public.is_approved());

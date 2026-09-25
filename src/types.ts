export type Role = "employee" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  avatar_url: string | null;
  position: string | null;
  position_id: string | null;
  supervisor_id: string | null;
  employee_id: string | null;
  join_date: string | null;
  gender: "L" | "P" | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  religion: string | null;
  blood_type: string | null;
  phone: string | null;
  id_number: string | null;
  id_address: string | null;
  domicile_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  base_salary: number | null;
  created_at: string;
}

export interface Office {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
}

export type AttendanceType =
  | "in"
  | "out"
  | "visit_in"
  | "visit_out"
  | "overtime_in"
  | "overtime_out";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  office_id: string | null;
  type: AttendanceType;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  within_radius: boolean | null;
  note: string | null;
  created_at: string;
  profile?: Pick<Profile, "full_name" | "email"> | null;
  office?: Pick<Office, "name"> | null;
}

export interface WorkSchedule {
  id: string;
  start_time: string; // "08:00:00"
  end_time: string; // "16:00:00"
  late_grace_minutes: number;
  lateness_rate_per_minute: number;
  overtime_rate_per_hour: number;
  updated_at: string;
}

export type PayrollStatus = "draft" | "finalized";

export interface PayrollPeriod {
  id: string;
  period_month: number; // 1-12
  period_year: number;
  status: PayrollStatus;
  created_at: string;
  finalized_at: string | null;
}

export interface PayrollItem {
  id: string;
  period_id: string;
  user_id: string;
  base_salary: number;
  late_minutes: number;
  lateness_deduction: number;
  overtime_hours: number;
  overtime_pay: number;
  adjustment: number;
  adjustment_note: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, "full_name" | "email" | "position"> | null;
}

export interface DailyQuote {
  text: string;
  author: string;
}

// ===== Direktori karyawan (nama & jabatan saja, lintas-karyawan) =====
export interface EmployeeDirectoryEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  position_id: string | null;
  supervisor_id: string | null;
  role: Role;
}

export interface Position {
  id: string;
  name: string;
  level: number;
  created_at: string;
}

// ===== Task & Proyek =====
export type TaskStatus = "belum_dimulai" | "sedang_berlangsung" | "selesai";
export type TaskPriority = "Rendah" | "Sedang" | "Tinggi";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_personal: boolean;
  created_by: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  added_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  detail: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== KPI 360° =====
export type KpiRelation = "atasan_ke_bawahan" | "bawahan_ke_atasan" | "rekan_setim";
export type KpiRelationScope = "semua" | KpiRelation;
export type KpiPeriodStatus = "draft" | "open" | "closed";
export type KpiAssignmentStatus = "pending" | "submitted";

export interface KpiTemplate {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KpiQuestion {
  id: string;
  template_id: string;
  question_text: string;
  relation_scope: KpiRelationScope;
  order_index: number;
  created_at: string;
}

export interface KpiPeriod {
  id: string;
  template_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: KpiPeriodStatus;
  created_by: string | null;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
}

export interface KpiAssignment {
  id: string;
  period_id: string;
  reviewer_id: string;
  subject_id: string;
  relation: KpiRelation;
  status: KpiAssignmentStatus;
  submitted_at: string | null;
  created_at: string;
}

export interface KpiResponse {
  id: string;
  assignment_id: string;
  question_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

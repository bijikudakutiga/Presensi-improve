import { supabase } from "../supabaseClient";
import type { EmployeeDirectoryEntry } from "../types";

let cache: EmployeeDirectoryEntry[] | null = null;
let inFlight: Promise<EmployeeDirectoryEntry[]> | null = null;

/**
 * Direktori dasar semua karyawan (nama, avatar, jabatan, atasan) — dipakai untuk
 * memilih anggota proyek / menampilkan nama rekan di KPI. Tidak berisi data
 * sensitif (gaji, alamat, dll). Di-cache di memori selama sesi berjalan.
 */
export async function getEmployeeDirectory(forceRefresh = false): Promise<EmployeeDirectoryEntry[]> {
  if (cache && !forceRefresh) return cache;
  if (inFlight && !forceRefresh) return inFlight;

  inFlight = supabase
    .rpc("get_employee_directory")
    .then(({ data, error }) => {
      if (error) throw error;
      cache = (data as EmployeeDirectoryEntry[]) || [];
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function directoryToMap(entries: EmployeeDirectoryEntry[]): Record<string, EmployeeDirectoryEntry> {
  const map: Record<string, EmployeeDirectoryEntry> = {};
  for (const e of entries) map[e.id] = e;
  return map;
}

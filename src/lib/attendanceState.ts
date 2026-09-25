import type { AttendanceRecord, AttendanceType } from "../types";

export interface AttendanceOption {
  type: AttendanceType;
  label: string;
  enabled: boolean;
  reason?: string;
}

function lastOfPair(
  records: AttendanceRecord[],
  inType: AttendanceType,
  outType: AttendanceType
): AttendanceType | null {
  const relevant = records
    .filter((r) => r.type === inType || r.type === outType)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (relevant.length === 0) return null;
  return relevant[relevant.length - 1].type;
}

/** Menentukan pilihan presensi apa saja yang bisa dilakukan sekarang berdasarkan riwayat hari ini. */
export function getAttendanceOptions(todayRecords: AttendanceRecord[]): AttendanceOption[] {
  const mainState = lastOfPair(todayRecords, "in", "out");
  const visitState = lastOfPair(todayRecords, "visit_in", "visit_out");
  const overtimeState = lastOfPair(todayRecords, "overtime_in", "overtime_out");

  return [
    {
      type: "in",
      label: "Presensi Masuk",
      enabled: mainState === null,
      reason: mainState !== null ? "Sudah absen masuk hari ini" : undefined,
    },
    {
      type: "out",
      label: "Presensi Keluar",
      enabled: mainState === "in",
      reason: mainState === null ? "Belum absen masuk" : mainState === "out" ? "Sudah absen keluar" : undefined,
    },
    {
      type: "visit_in",
      label: "Kunjungan Klien Masuk",
      enabled: visitState === null || visitState === "visit_out",
      reason: visitState === "visit_in" ? "Ada kunjungan yang belum diselesaikan" : undefined,
    },
    {
      type: "visit_out",
      label: "Kunjungan Klien Selesai",
      enabled: visitState === "visit_in",
      reason: visitState !== "visit_in" ? "Belum ada kunjungan yang berjalan" : undefined,
    },
    {
      type: "overtime_in",
      label: "Lembur Masuk",
      enabled: overtimeState === null || overtimeState === "overtime_out",
      reason: overtimeState === "overtime_in" ? "Lembur sedang berjalan" : undefined,
    },
    {
      type: "overtime_out",
      label: "Lembur Selesai",
      enabled: overtimeState === "overtime_in",
      reason: overtimeState !== "overtime_in" ? "Belum ada lembur yang berjalan" : undefined,
    },
  ];
}

export function typeLabel(type: AttendanceType): string {
  switch (type) {
    case "in": return "Presensi Masuk";
    case "out": return "Presensi Keluar";
    case "visit_in": return "Kunjungan Klien Masuk";
    case "visit_out": return "Kunjungan Klien Selesai";
    case "overtime_in": return "Lembur Masuk";
    case "overtime_out": return "Lembur Selesai";
  }
}

export function requiresNote(type: AttendanceType): boolean {
  return type === "visit_in";
}

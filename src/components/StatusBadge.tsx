import { typeLabel } from "../lib/attendanceState";
import type { AttendanceType } from "../types";

export function StatusBadge({ withinRadius }: { withinRadius: boolean | null }) {
  if (withinRadius === null) {
    return (
      <span className="inline-flex items-center rounded-sm bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink/60">
        Tanpa validasi
      </span>
    );
  }
  if (withinRadius) {
    return (
      <span className="inline-flex items-center rounded-sm bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-dark">
        Dalam radius
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-sm bg-rust-soft px-2 py-0.5 text-xs font-semibold text-rust">
      Luar radius
    </span>
  );
}

const TYPE_COLORS: Record<AttendanceType, string> = {
  in: "bg-primary-soft text-primary-dark",
  out: "bg-amber-soft text-amber",
  visit_in: "bg-lilac-soft text-primary-dark",
  visit_out: "bg-lilac-soft text-primary-dark",
  overtime_in: "bg-rust-soft text-rust",
  overtime_out: "bg-rust-soft text-rust",
};

export function TypeBadge({ type }: { type: AttendanceType }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[type]}`}>
      {typeLabel(type)}
    </span>
  );
}

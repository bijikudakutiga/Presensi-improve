import type { AttendanceOption } from "../lib/attendanceState";
import type { AttendanceType } from "../types";

const ICONS: Record<AttendanceType, string> = {
  in: "/icons/02-presensi-masuk.png",
  out: "/icons/03-presensi-keluar.png",
  visit_in: "/icons/04-kunjungan-masuk.png",
  visit_out: "/icons/05-kunjungan-selesai.png",
  overtime_in: "/icons/06-lembur-masuk.png",
  overtime_out: "/icons/07-lembur-selesai.png",
};

interface Props {
  options: AttendanceOption[];
  onSelect: (type: AttendanceOption["type"]) => void;
  onClose: () => void;
}

export function AttendanceSheet({ options, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <p className="field-label mb-3 text-center">Pilih jenis presensi</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.type}
              disabled={!opt.enabled}
              onClick={() => onSelect(opt.type)}
              className="flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left text-sm font-semibold transition-colors enabled:hover:border-primary enabled:hover:bg-primary-soft disabled:opacity-40"
            >
              <img src={ICONS[opt.type]} alt="" className="h-9 w-9 shrink-0 object-contain" />
              <span className="flex-1">{opt.label}</span>
              {!opt.enabled && opt.reason && (
                <span className="text-xs font-normal text-ink/40">{opt.reason}</span>
              )}
            </button>
          ))}
        </div>
        <button className="btn-outline w-full mt-3" onClick={onClose}>
          Batal
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "../supabaseClient";
import { typeLabel } from "../lib/attendanceState";
import type { AttendanceRecord, AttendanceType, EmployeeDirectoryEntry } from "../types";

interface Props {
  record: AttendanceRecord | null;
  employees: EmployeeDirectoryEntry[];
  onClose: () => void;
  onSaved: () => void;
}

const TYPES: AttendanceType[] = ["in", "out", "visit_in", "visit_out", "overtime_in", "overtime_out"];

function toLocalInputValue(iso: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AttendanceEditModal({ record, employees, onClose, onSaved }: Props) {
  const [userId, setUserId] = useState(record?.user_id || employees[0]?.id || "");
  const [type, setType] = useState<AttendanceType>(record?.type || "in");
  const [dateTime, setDateTime] = useState(toLocalInputValue(record?.created_at || null));
  const [reason, setReason] = useState(record?.manual_reason || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!dateTime) return;
    if (!record && !reason.trim()) {
      setError("Isi alasan penambahan presensi manual ini (mis. lupa absen, kendala sistem).");
      return;
    }
    setSaving(true);
    setError(null);
    const isoDateTime = new Date(dateTime).toISOString();

    const { error: rpcError } = record
      ? await supabase.rpc("admin_update_attendance", {
          p_id: record.id,
          p_type: type,
          p_created_at: isoDateTime,
          p_reason: reason.trim() || null,
        })
      : await supabase.rpc("admin_create_attendance", {
          p_user_id: userId,
          p_type: type,
          p_created_at: isoDateTime,
          p_reason: reason.trim(),
        });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSaved();
  }

  async function handleDelete() {
    if (!record) return;
    if (!confirm("Hapus data presensi ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeleting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("admin_delete_attendance", { p_id: record.id });
    setDeleting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg">{record ? "Edit Presensi" : "Tambah Presensi Manual"}</h2>
          <button className="text-sm font-semibold text-ink/50" onClick={onClose}>
            Tutup
          </button>
        </div>

        {!record && (
          <label className="block">
            <span className="field-label block mb-1">Karyawan</span>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name || "(tanpa nama)"}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="field-label block mb-1">Jenis Presensi</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AttendanceType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label block mb-1">Tanggal & Waktu</span>
          <input
            type="datetime-local"
            className="input"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="field-label block mb-1">
            Alasan {record ? "perubahan" : "penambahan manual"} {!record && <span className="text-rust">*</span>}
          </span>
          <textarea
            className="input"
            rows={2}
            placeholder="mis. karyawan lupa absen, kendala sistem, dsb."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        {record?.is_manual && (
          <p className="text-xs text-ink/40">
            Data ini sudah pernah diisi/diubah manual sebelumnya
            {record.edited_at && ` pada ${new Date(record.edited_at).toLocaleString("id-ID")}`}.
          </p>
        )}

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex gap-2 pt-1">
          {record && (
            <button className="btn-outline text-rust" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

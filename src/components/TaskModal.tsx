import { useState } from "react";
import { supabase } from "../supabaseClient";
import type { EmployeeDirectoryEntry, Task, TaskPriority, TaskStatus } from "../types";

interface Props {
  projectId: string;
  userId: string;
  members: EmployeeDirectoryEntry[];
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  belum_dimulai: "Belum Dimulai",
  sedang_berlangsung: "Sedang Berlangsung",
  selesai: "Selesai",
};

export function TaskModal({ projectId, userId, members, task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title || "");
  const [detail, setDetail] = useState(task?.detail || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "Sedang");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "belum_dimulai");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || userId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      detail: detail.trim() || null,
      priority,
      status,
      assigned_to: assignedTo || null,
    };
    const { error: saveError } = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id)
      : await supabase.from("tasks").insert({ ...payload, project_id: projectId, created_by: userId });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm("Hapus task ini?")) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
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
          <h2 className="font-extrabold text-lg">{task ? "Edit Task" : "Task Baru"}</h2>
          <button className="text-sm font-semibold text-ink/50" onClick={onClose}>
            Tutup
          </button>
        </div>

        <label className="block">
          <span className="field-label block mb-1">Judul</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block">
          <span className="field-label block mb-1">Detail (opsional)</span>
          <textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label block mb-1">Prioritas</span>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="Rendah">Rendah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tinggi">Tinggi</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label block mb-1">Status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="field-label block mb-1">Karyawan ditugaskan</span>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Belum ditentukan</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || "(tanpa nama)"}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex gap-2 pt-1">
          {task && (
            <button className="btn-outline text-rust" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

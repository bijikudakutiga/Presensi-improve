import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getEmployeeDirectory, directoryToMap } from "../lib/employeeDirectory";
import { downloadCsv } from "../lib/csv";
import { TaskModal } from "../components/TaskModal";
import type { EmployeeDirectoryEntry, Project, Task, TaskStatus } from "../types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "belum_dimulai", label: "Belum Dimulai" },
  { status: "sedang_berlangsung", label: "Sedang Berlangsung" },
  { status: "selesai", label: "Selesai" },
];

const PRIORITY_COLOR: Record<string, string> = {
  Rendah: "bg-primary-soft text-primary-dark",
  Sedang: "bg-amber-soft text-amber",
  Tinggi: "bg-rust-soft text-rust",
};

export function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [directory, setDirectory] = useState<Record<string, EmployeeDirectoryEntry>>({});
  const [loading, setLoading] = useState(true);
  const [modalTask, setModalTask] = useState<Task | null | "new">(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [pickMember, setPickMember] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [{ data: projectData, error: projErr }, { data: tasksData }, { data: membersData }, dir] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
        supabase.from("project_members").select("user_id").eq("project_id", id),
        getEmployeeDirectory(),
      ]);
    if (projErr) {
      setError("Proyek tidak ditemukan atau kamu tidak memiliki akses.");
      setLoading(false);
      return;
    }
    setProject(projectData as Project);
    setTasks((tasksData as Task[]) || []);
    setMemberIds(((membersData as { user_id: string }[]) || []).map((m) => m.user_id));
    setDirectory(directoryToMap(dir));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const members = memberIds.map((uid) => directory[uid]).filter(Boolean) as EmployeeDirectoryEntry[];
  const nonMembers = Object.values(directory).filter((e) => !memberIds.includes(e.id));

  async function handleAddMember() {
    if (!pickMember || !id) return;
    await supabase.from("project_members").insert({ project_id: id, user_id: pickMember });
    setPickMember("");
    setShowAddMember(false);
    load();
  }

  async function moveTask(task: Task, direction: 1 | -1) {
    const idx = COLUMNS.findIndex((c) => c.status === task.status);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= COLUMNS.length) return;
    await supabase.from("tasks").update({ status: COLUMNS[nextIdx].status }).eq("id", task.id);
    load();
  }

  function exportCsv() {
    downloadCsv(
      `task-${project?.name || "proyek"}.csv`,
      tasks.map((t) => ({
        judul: t.title,
        dibuat_oleh: directory[t.created_by]?.full_name || "-",
        waktu_mulai: t.started_at ? new Date(t.started_at).toLocaleString("id-ID") : "",
        waktu_selesai: t.completed_at ? new Date(t.completed_at).toLocaleString("id-ID") : "",
        detail: t.detail || "",
        status: COLUMNS.find((c) => c.status === t.status)?.label || t.status,
        prioritas: t.priority,
        karyawan_ditugaskan: t.assigned_to ? directory[t.assigned_to]?.full_name || "-" : "",
      }))
    );
  }

  if (loading) return <p className="text-sm text-ink/50">Memuat...</p>;
  if (error || !project) return <p className="text-sm text-rust">{error}</p>;

  return (
    <div className="space-y-4">
      <button className="text-sm font-semibold text-ink/50" onClick={() => navigate("/proyek")}>
        ← Semua Proyek
      </button>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-sm text-ink/50">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-sm" onClick={exportCsv} disabled={tasks.length === 0}>
            Ekspor CSV
          </button>
          <button className="btn-primary text-sm" onClick={() => setModalTask("new")}>
            + Task
          </button>
        </div>
      </div>

      {!project.is_personal && (
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="field-label">Anggota Proyek</p>
            <button className="text-xs font-semibold text-primary-dark" onClick={() => setShowAddMember((s) => !s)}>
              {showAddMember ? "Batal" : "+ Tambah"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="rounded-sm bg-primary-soft px-2 py-1 text-xs font-semibold text-primary-dark">
                {m.full_name || m.id}
              </span>
            ))}
          </div>
          {showAddMember && (
            <div className="mt-3 flex gap-2">
              <select className="input" value={pickMember} onChange={(e) => setPickMember(e.target.value)}>
                <option value="">Pilih karyawan...</option>
                {nonMembers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name || "(tanpa nama)"}
                  </option>
                ))}
              </select>
              <button className="btn-primary text-sm" onClick={handleAddMember} disabled={!pickMember}>
                Tambah
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COLUMNS.map((col, colIdx) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="space-y-2">
              <p className="field-label flex items-center justify-between">
                {col.label}
                <span className="rounded-full bg-line px-2 text-ink/50">{colTasks.length}</span>
              </p>
              <div className="space-y-2 min-h-[60px]">
                {colTasks.map((t) => (
                  <div key={t.id} className="card cursor-pointer" onClick={() => setModalTask(t)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{t.title}</p>
                      <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[t.priority]}`}>
                        {t.priority}
                      </span>
                    </div>
                    {t.assigned_to && (
                      <p className="mt-1 text-xs text-ink/50">{directory[t.assigned_to]?.full_name || "-"}</p>
                    )}
                    <div className="mt-2 flex justify-between" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="text-xs text-ink/40 disabled:opacity-0"
                        disabled={colIdx === 0}
                        onClick={() => moveTask(t, -1)}
                      >
                        ← Mundur
                      </button>
                      <button
                        className="text-xs text-primary-dark font-semibold disabled:opacity-0"
                        disabled={colIdx === COLUMNS.length - 1}
                        onClick={() => moveTask(t, 1)}
                      >
                        Lanjut →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalTask && session?.user && (
        <TaskModal
          projectId={project.id}
          userId={session.user.id}
          members={project.is_personal ? [directory[session.user.id]].filter(Boolean) as EmployeeDirectoryEntry[] : members}
          task={modalTask === "new" ? null : modalTask}
          onClose={() => setModalTask(null)}
          onSaved={() => {
            setModalTask(null);
            load();
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getEmployeeDirectory, directoryToMap } from "../lib/employeeDirectory";
import type { EmployeeDirectoryEntry, Project, Task } from "../types";

interface ProjectRow extends Project {
  taskCount: number;
  doneCount: number;
  memberIds: string[];
}

export function Projects() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [directory, setDirectory] = useState<Record<string, EmployeeDirectoryEntry>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensurePersonalProject(userId: string) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("created_by", userId)
      .eq("is_personal", true)
      .maybeSingle();
    if (!existing) {
      await supabase.from("projects").insert({
        name: "Tugas Pribadi",
        description: "Checklist pekerjaan pribadi.",
        is_personal: true,
        created_by: userId,
      });
    }
  }

  async function load() {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    await ensurePersonalProject(session.user.id);

    const [{ data: projectsData, error: projErr }, dir] = await Promise.all([
      supabase.from("projects").select("*").order("is_personal", { ascending: false }).order("created_at"),
      getEmployeeDirectory(),
    ]);
    if (projErr) {
      setError(projErr.message);
      setLoading(false);
      return;
    }
    setDirectory(directoryToMap(dir));

    const projects = (projectsData as Project[]) || [];
    const ids = projects.map((p) => p.id);
    let tasksByProject: Record<string, Task[]> = {};
    let membersByProject: Record<string, string[]> = {};

    if (ids.length > 0) {
      const [{ data: tasksData }, { data: membersData }] = await Promise.all([
        supabase.from("tasks").select("*").in("project_id", ids),
        supabase.from("project_members").select("*").in("project_id", ids),
      ]);
      tasksByProject = {};
      for (const t of (tasksData as Task[]) || []) {
        (tasksByProject[t.project_id] ??= []).push(t);
      }
      membersByProject = {};
      for (const m of (membersData as { project_id: string; user_id: string }[]) || []) {
        (membersByProject[m.project_id] ??= []).push(m.user_id);
      }
    }

    setRows(
      projects.map((p) => {
        const tasks = tasksByProject[p.id] || [];
        return {
          ...p,
          taskCount: tasks.length,
          doneCount: tasks.filter((t) => t.status === "selesai").length,
          memberIds: membersByProject[p.id] || [],
        };
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function handleCreate() {
    if (!name.trim() || !session?.user) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("projects").insert({
      name: name.trim(),
      description: description.trim() || null,
      created_by: session.user.id,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setDescription("");
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Proyek &amp; Task</h1>
        <button className="btn-primary text-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Batal" : "+ Proyek Baru"}
        </button>
      </div>

      {showForm && (
        <div className="card space-y-3">
          <input
            className="input"
            placeholder="Nama proyek (mis. Kampanye Q4)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="input"
            rows={2}
            placeholder="Deskripsi singkat (opsional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Membuat..." : "Buat Proyek"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const progress = p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
            return (
              <button
                key={p.id}
                className="card w-full text-left hover:border-primary"
                onClick={() => navigate(`/proyek/${p.id}`)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {p.name}
                    {p.is_personal && (
                      <span className="ml-2 rounded-sm bg-lilac-soft px-1.5 py-0.5 text-xs font-semibold text-primary-dark">
                        Pribadi
                      </span>
                    )}
                  </p>
                  <span className="text-sm font-semibold text-primary-dark">{progress}%</span>
                </div>
                {p.description && <p className="text-sm text-ink/50 mt-0.5">{p.description}</p>}
                <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                  <span>
                    {p.doneCount}/{p.taskCount} task selesai
                  </span>
                  {!p.is_personal && (
                    <span className="truncate">
                      {p.memberIds
                        .slice(0, 3)
                        .map((id) => directory[id]?.full_name?.split(" ")[0] || "?")
                        .join(", ")}
                      {p.memberIds.length > 3 ? ` +${p.memberIds.length - 3}` : ""}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

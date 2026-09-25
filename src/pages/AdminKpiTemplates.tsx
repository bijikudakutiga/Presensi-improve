import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { KpiQuestion, KpiRelationScope, KpiTemplate, Position } from "../types";

const RELATION_LABEL: Record<KpiRelationScope, string> = {
  semua: "Semua jenis penilai",
  atasan_ke_bawahan: "Hanya dari atasan",
  bawahan_ke_atasan: "Hanya dari bawahan",
  rekan_setim: "Hanya dari rekan setim",
};

export function AdminKpiTemplates() {
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KpiTemplate | null>(null);
  const [questions, setQuestions] = useState<KpiQuestion[]>([]);
  const [scopedPositionIds, setScopedPositionIds] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionScope, setNewQuestionScope] = useState<KpiRelationScope>("semua");
  const [error, setError] = useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("kpi_templates").select("*").order("created_at"),
      supabase.from("positions").select("*").order("level"),
    ]);
    setTemplates((t as KpiTemplate[]) || []);
    setPositions((p as Position[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function openTemplate(t: KpiTemplate) {
    setSelected(t);
    const [{ data: q }, { data: sp }] = await Promise.all([
      supabase.from("kpi_questions").select("*").eq("template_id", t.id).order("order_index"),
      supabase.from("kpi_template_positions").select("position_id").eq("template_id", t.id),
    ]);
    setQuestions((q as KpiQuestion[]) || []);
    setScopedPositionIds(((sp as { position_id: string }[]) || []).map((r) => r.position_id));
  }

  async function handleCreateTemplate() {
    if (!newName.trim()) return;
    setError(null);
    const { data, error: insertError } = await supabase
      .from("kpi_templates")
      .insert({ name: newName.trim() })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewName("");
    await loadTemplates();
    openTemplate(data as KpiTemplate);
  }

  async function handleAddQuestion() {
    if (!newQuestion.trim() || !selected) return;
    setError(null);
    const { error: insertError } = await supabase.from("kpi_questions").insert({
      template_id: selected.id,
      question_text: newQuestion.trim(),
      relation_scope: newQuestionScope,
      order_index: questions.length,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewQuestion("");
    openTemplate(selected);
  }

  async function handleDeleteQuestion(id: string) {
    if (!selected) return;
    await supabase.from("kpi_questions").delete().eq("id", id);
    openTemplate(selected);
  }

  async function togglePosition(positionId: string) {
    if (!selected) return;
    if (scopedPositionIds.includes(positionId)) {
      await supabase
        .from("kpi_template_positions")
        .delete()
        .eq("template_id", selected.id)
        .eq("position_id", positionId);
    } else {
      await supabase.from("kpi_template_positions").insert({ template_id: selected.id, position_id: positionId });
    }
    openTemplate(selected);
  }

  async function handleDeleteTemplate() {
    if (!selected) return;
    if (!confirm("Hapus template ini beserta seluruh pertanyaannya?")) return;
    await supabase.from("kpi_templates").delete().eq("id", selected.id);
    setSelected(null);
    loadTemplates();
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-ink/50" onClick={() => setSelected(null)}>
          ← Kembali ke daftar template
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">{selected.name}</h1>
          <button className="text-xs font-semibold text-rust" onClick={handleDeleteTemplate}>
            Hapus Template
          </button>
        </div>

        <div className="card space-y-3">
          <p className="field-label">Jabatan yang bisa dinilai memakai template ini</p>
          <p className="text-xs text-ink/40">Tidak pilih apa pun = berlaku untuk semua jabatan.</p>
          <div className="flex flex-wrap gap-2">
            {positions.map((p) => {
              const active = scopedPositionIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePosition(p.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                    active ? "bg-primary text-white border-primary" : "border-line text-ink/60"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card space-y-3">
          <p className="field-label">Pertanyaan</p>
          {questions.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0">
              <div>
                <p className="text-sm">{q.question_text}</p>
                <p className="text-xs text-ink/40">{RELATION_LABEL[q.relation_scope]}</p>
              </div>
              <button className="text-xs font-semibold text-rust shrink-0" onClick={() => handleDeleteQuestion(q.id)}>
                Hapus
              </button>
            </div>
          ))}
          <div className="pt-2 space-y-2">
            <textarea
              className="input"
              rows={2}
              placeholder="Tulis pertanyaan KPI (mis. Seberapa baik komunikasi karyawan ini dengan tim?)"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="input"
                value={newQuestionScope}
                onChange={(e) => setNewQuestionScope(e.target.value as KpiRelationScope)}
              >
                {(Object.keys(RELATION_LABEL) as KpiRelationScope[]).map((s) => (
                  <option key={s} value={s}>
                    {RELATION_LABEL[s]}
                  </option>
                ))}
              </select>
              <button className="btn-primary text-sm shrink-0" onClick={handleAddQuestion} disabled={!newQuestion.trim()}>
                Tambah
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Template KPI</h1>
      <div className="card flex gap-2">
        <input
          className="input"
          placeholder="Nama template (mis. KPI Bulanan Staff)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn-primary text-sm shrink-0" onClick={handleCreateTemplate} disabled={!newName.trim()}>
          Buat
        </button>
      </div>
      {error && <p className="text-sm text-rust">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-ink/50">Belum ada template KPI.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <button key={t.id} className="card w-full text-left hover:border-primary" onClick={() => openTemplate(t)}>
              <p className="font-semibold">{t.name}</p>
              {t.description && <p className="text-xs text-ink/50">{t.description}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

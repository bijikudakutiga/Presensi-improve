import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getEmployeeDirectory, directoryToMap } from "../lib/employeeDirectory";
import type { EmployeeDirectoryEntry, KpiAssignment, KpiPeriod, KpiTemplate } from "../types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Terbuka",
  closed: "Ditutup",
};

export function AdminKpiPeriods() {
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KpiPeriod | null>(null);
  const [assignments, setAssignments] = useState<KpiAssignment[]>([]);
  const [directory, setDirectory] = useState<Record<string, EmployeeDirectoryEntry>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("kpi_periods").select("*").order("created_at", { ascending: false }),
      supabase.from("kpi_templates").select("*"),
    ]);
    setPeriods((p as KpiPeriod[]) || []);
    setTemplates((t as KpiTemplate[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openPeriodDetail(p: KpiPeriod) {
    setSelected(p);
    const [{ data: a }, dir] = await Promise.all([
      supabase.from("kpi_assignments").select("*").eq("period_id", p.id),
      getEmployeeDirectory(),
    ]);
    setAssignments((a as KpiAssignment[]) || []);
    setDirectory(directoryToMap(dir));
  }

  async function handleCreate() {
    if (!name.trim() || !templateId) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("kpi_periods").insert({
      name: name.trim(),
      template_id: templateId,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    load();
  }

  async function handleGenerate(periodId: string) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("generate_kpi_assignments", { p_period_id: periodId });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    load();
    const p = periods.find((x) => x.id === periodId);
    if (p) openPeriodDetail({ ...p, status: "open" });
  }

  async function handleClose(periodId: string) {
    if (!confirm("Tutup periode KPI ini? Hasil akan bisa dilihat oleh karyawan setelah ditutup.")) return;
    setBusy(true);
    const { error: updateError } = await supabase
      .from("kpi_periods")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", periodId);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
    setSelected(null);
  }

  if (selected) {
    const submitted = assignments.filter((a) => a.status === "submitted").length;
    const bySubject: Record<string, KpiAssignment[]> = {};
    for (const a of assignments) (bySubject[a.subject_id] ??= []).push(a);

    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-ink/50" onClick={() => setSelected(null)}>
          ← Kembali ke daftar periode
        </button>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{selected.name}</h1>
            <p className="text-sm text-ink/50">Status: {STATUS_LABEL[selected.status]}</p>
          </div>
          {selected.status === "draft" && (
            <button className="btn-primary text-sm" onClick={() => handleGenerate(selected.id)} disabled={busy}>
              {busy ? "Memproses..." : "Buka Periode (Generate Penugasan)"}
            </button>
          )}
          {selected.status === "open" && (
            <div className="flex gap-2">
              <button className="btn-outline text-sm" onClick={() => handleGenerate(selected.id)} disabled={busy}>
                Perbarui Penugasan
              </button>
              <button className="btn-primary text-sm" onClick={() => handleClose(selected.id)} disabled={busy}>
                Tutup Periode
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        {assignments.length === 0 ? (
          <p className="text-sm text-ink/50">
            Belum ada penugasan. Klik "Buka Periode" untuk membuatnya otomatis dari struktur atasan
            karyawan.
          </p>
        ) : (
          <>
            <div className="card">
              <p className="font-semibold">
                {submitted}/{assignments.length} penilaian selesai diisi
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.round((submitted / assignments.length) * 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(bySubject).map(([subjectId, list]) => (
                <div key={subjectId} className="card">
                  <p className="font-semibold text-sm">{directory[subjectId]?.full_name || subjectId}</p>
                  <div className="mt-1 space-y-1">
                    {list.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs text-ink/60">
                        <span>
                          {a.relation === "atasan_ke_bawahan"
                            ? "Dinilai atasan: "
                            : a.relation === "bawahan_ke_atasan"
                            ? "Dinilai bawahan: "
                            : "Dinilai rekan: "}
                          {directory[a.reviewer_id]?.full_name || a.reviewer_id}
                        </span>
                        <span className={a.status === "submitted" ? "text-primary-dark font-semibold" : ""}>
                          {a.status === "submitted" ? "Selesai" : "Belum"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Periode KPI</h1>

      <div className="card space-y-3">
        <p className="field-label">Buat periode baru</p>
        <input className="input" placeholder="Nama periode (mis. KPI September 2026)" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Pilih template KPI...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary w-full" onClick={handleCreate} disabled={saving || !name.trim() || !templateId}>
          {saving ? "Membuat..." : "Buat Periode"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => (
            <button key={p.id} className="card w-full text-left hover:border-primary" onClick={() => openPeriodDetail(p)}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                <span className="rounded-sm bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-dark">
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatRupiah, periodLabel } from "../lib/payroll";
import type { PayrollItem, PayrollPeriod } from "../types";

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function AdminPayroll() {
  const [month, setMonth] = useState(currentMonthYear().month);
  const [year, setYear] = useState(currentMonthYear().year);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { adjustment: string; note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: periodData } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("period_month", month)
      .eq("period_year", year)
      .maybeSingle();
    setPeriod(periodData as PayrollPeriod | null);

    if (periodData) {
      const { data: itemsData } = await supabase
        .from("payroll_items")
        .select("*, profile:profiles(full_name, email, position)")
        .eq("period_id", (periodData as PayrollPeriod).id)
        .order("created_at", { ascending: true });
      const rows = (itemsData as unknown as PayrollItem[]) || [];
      setItems(rows);
      const d: Record<string, { adjustment: string; note: string }> = {};
      rows.forEach((r) => {
        d[r.id] = { adjustment: String(r.adjustment), note: r.adjustment_note || "" };
      });
      setDrafts(d);
    } else {
      setItems([]);
      setDrafts({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("generate_payroll", { p_month: month, p_year: year });
    setGenerating(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    load();
  }

  async function handleSaveAdjustment(item: PayrollItem) {
    const draft = drafts[item.id];
    if (!draft) return;
    setSavingId(item.id);
    const adjustment = Number(draft.adjustment) || 0;
    const total = item.base_salary - item.lateness_deduction + item.overtime_pay + adjustment;
    const { error: updateError } = await supabase
      .from("payroll_items")
      .update({ adjustment, adjustment_note: draft.note || null, total, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    setSavingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  }

  async function handleFinalize() {
    if (!period) return;
    if (!confirm("Finalisasi payroll periode ini? Setelah final, nilai tidak bisa diubah lagi.")) return;
    const { error: updateError } = await supabase
      .from("payroll_periods")
      .update({ status: "finalized", finalized_at: new Date().toISOString() })
      .eq("id", period.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  }

  const isDraft = period?.status === "draft";
  const totalPayroll = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Payroll</h1>

      <div className="card flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="field-label block mb-1">Bulan</span>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {periodLabel(m, 2000).split(" ")[0]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label block mb-1">Tahun</span>
          <input
            type="number"
            className="input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating || period?.status === "finalized"}>
          {generating ? "Memproses..." : period ? "Perbarui Perhitungan" : "Generate Payroll"}
        </button>
        {period?.status === "finalized" && (
          <span className="rounded-sm bg-primary-soft px-2 py-1 text-xs font-semibold text-primary-dark">
            Final · {new Date(period.finalized_at!).toLocaleDateString("id-ID")}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : !period ? (
        <p className="text-sm text-ink/50">
          Belum ada payroll untuk {periodLabel(month, year)}. Klik "Generate Payroll" untuk membuatnya
          dari data presensi.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.profile?.full_name || item.profile?.email}</p>
                    <p className="text-xs text-ink/50">{item.profile?.position}</p>
                  </div>
                  <p className="font-extrabold text-primary-dark">{formatRupiah(item.total)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-ink/60">
                  <div>
                    <p className="field-label">Gaji pokok</p>
                    <p>{formatRupiah(item.base_salary)}</p>
                  </div>
                  <div>
                    <p className="field-label">Telat</p>
                    <p>
                      {item.late_minutes} mnt · -{formatRupiah(item.lateness_deduction)}
                    </p>
                  </div>
                  <div>
                    <p className="field-label">Lembur</p>
                    <p>
                      {item.overtime_hours} jam · +{formatRupiah(item.overtime_pay)}
                    </p>
                  </div>
                  <div>
                    <p className="field-label">Penyesuaian</p>
                    <p>{formatRupiah(item.adjustment)}</p>
                  </div>
                </div>
                {isDraft && (
                  <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-line">
                    <label className="block">
                      <span className="field-label block mb-1">Penyesuaian (Rp, boleh negatif)</span>
                      <input
                        type="number"
                        className="input w-40"
                        value={drafts[item.id]?.adjustment ?? "0"}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], adjustment: e.target.value } }))
                        }
                      />
                    </label>
                    <label className="block flex-1 min-w-[160px]">
                      <span className="field-label block mb-1">Catatan</span>
                      <input
                        type="text"
                        className="input"
                        placeholder="mis. bonus, potongan kasbon"
                        value={drafts[item.id]?.note ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], note: e.target.value } }))
                        }
                      />
                    </label>
                    <button
                      className="btn-outline text-sm"
                      onClick={() => handleSaveAdjustment(item)}
                      disabled={savingId === item.id}
                    >
                      {savingId === item.id ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card flex items-center justify-between">
            <p className="font-semibold">Total payroll {periodLabel(month, year)}</p>
            <p className="text-lg font-extrabold text-primary-dark">{formatRupiah(totalPayroll)}</p>
          </div>

          {isDraft && (
            <button className="btn-primary w-full" onClick={handleFinalize}>
              Finalisasi Payroll
            </button>
          )}
        </>
      )}
    </div>
  );
}

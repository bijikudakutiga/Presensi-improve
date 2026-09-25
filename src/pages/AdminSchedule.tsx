import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { WorkSchedule } from "../types";

export function AdminSchedule() {
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [grace, setGrace] = useState("0");
  const [lateRate, setLateRate] = useState("0");
  const [overtimeRate, setOvertimeRate] = useState("0");

  useEffect(() => {
    supabase
      .from("work_schedules")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const s = data as WorkSchedule | null;
        setSchedule(s);
        if (s) {
          setStartTime(s.start_time.slice(0, 5));
          setEndTime(s.end_time.slice(0, 5));
          setGrace(String(s.late_grace_minutes));
          setLateRate(String(s.lateness_rate_per_minute));
          setOvertimeRate(String(s.overtime_rate_per_hour));
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const payload = {
      id: schedule?.id, // undefined on first save, DB will generate one
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      late_grace_minutes: Number(grace) || 0,
      lateness_rate_per_minute: Number(lateRate) || 0,
      overtime_rate_per_hour: Number(overtimeRate) || 0,
    };
    const { data, error: upsertError } = await supabase
      .from("work_schedules")
      .upsert(payload)
      .select()
      .single();
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setSchedule(data as WorkSchedule);
    setSaved(true);
  }

  if (loading) return <p className="text-sm text-ink/50">Memuat...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Jadwal Kerja &amp; Tarif Payroll</h1>
      <div className="card space-y-3">
        <p className="field-label">Jam kerja default</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label block mb-1">Jam masuk</span>
            <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label block mb-1">Jam pulang</span>
            <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="field-label block mb-1">Toleransi keterlambatan (menit)</span>
          <input type="number" className="input" value={grace} onChange={(e) => setGrace(e.target.value)} />
        </label>
      </div>

      <div className="card space-y-3">
        <p className="field-label">Tarif perhitungan payroll semi-otomatis</p>
        <label className="block">
          <span className="field-label block mb-1">Potongan keterlambatan (Rp / menit)</span>
          <input type="number" className="input" value={lateRate} onChange={(e) => setLateRate(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label block mb-1">Upah lembur (Rp / jam)</span>
          <input
            type="number"
            className="input"
            value={overtimeRate}
            onChange={(e) => setOvertimeRate(e.target.value)}
          />
        </label>
        <p className="text-xs text-ink/40">
          Nilai ini dipakai sebagai perhitungan awal saat generate payroll. HR tetap bisa menyesuaikan
          angka per karyawan sebelum payroll difinalisasi.
        </p>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}
      {saved && <p className="text-sm text-primary-dark">Pengaturan tersimpan.</p>}
      <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}

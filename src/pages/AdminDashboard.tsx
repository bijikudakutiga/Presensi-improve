import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { StatusBadge, TypeBadge } from "../components/StatusBadge";
import { typeLabel } from "../lib/attendanceState";
import { downloadCsv } from "../lib/csv";
import { getEmployeeDirectory } from "../lib/employeeDirectory";
import { AttendanceEditModal } from "../components/AttendanceEditModal";
import type { AttendanceRecord, EmployeeDirectoryEntry } from "../types";

function todayInputValue(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function AdminDashboard() {
  const [from, setFrom] = useState(todayInputValue(-6));
  const [to, setTo] = useState(todayInputValue(0));
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null | "new">(null);

  async function load() {
    setLoading(true);
    setError(null);
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    const [{ data, error: qError }, dir] = await Promise.all([
      supabase
        .from("attendance")
        .select("*, profile:profiles(full_name, email), office:offices(name)")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: false }),
      getEmployeeDirectory(),
    ]);
    if (qError) {
      setError(qError.message);
      setRecords([]);
    } else {
      setRecords((data as unknown as AttendanceRecord[]) || []);
    }
    setEmployees(dir);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.profile?.full_name?.toLowerCase().includes(q) ||
      r.profile?.email?.toLowerCase().includes(q)
    );
  });

  function exportCsv() {
    downloadCsv(
      `presensi_${from}_sampai_${to}.csv`,
      filtered.map((r) => ({
        nama: r.profile?.full_name || "",
        email: r.profile?.email || "",
        jenis: typeLabel(r.type),
        waktu: new Date(r.created_at).toLocaleString("id-ID"),
        kantor: r.office?.name || "",
        jarak_meter: r.distance_meters !== null ? Math.round(r.distance_meters) : "",
        dalam_radius: r.within_radius === null ? "" : r.within_radius ? "Ya" : "Tidak",
        catatan: r.note || "",
        input_manual: r.is_manual ? "Ya" : "Tidak",
        alasan_manual: r.manual_reason || "",
        latitude: r.latitude,
        longitude: r.longitude,
      }))
    );
  }

  return (
    <div className="space-y-4 animate-fadein">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Dashboard Admin</h1>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" onClick={() => setEditRecord("new")}>
            + Tambah Manual
          </button>
          <button className="btn-outline text-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label block mb-1">Dari</label>
          <input
            type="date"
            className="rounded border border-line px-2 py-1.5 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label block mb-1">Sampai</label>
          <input
            type="date"
            className="rounded border border-line px-2 py-1.5 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="field-label block mb-1">Cari karyawan</label>
          <input
            type="text"
            placeholder="Nama atau email"
            className="w-full rounded border border-line px-2 py-1.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink/50">Tidak ada data pada rentang ini.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="py-2 pr-3 font-semibold">Karyawan</th>
                <th className="py-2 pr-3 font-semibold">Jenis</th>
                <th className="py-2 pr-3 font-semibold">Waktu</th>
                <th className="py-2 pr-3 font-semibold">Kantor</th>
                <th className="py-2 pr-3 font-semibold">Jarak</th>
                <th className="py-2 pr-3 font-semibold">Validasi</th>
                <th className="py-2 pr-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.profile?.full_name || "-"}</div>
                    <div className="text-xs text-ink/50">{r.profile?.email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-2 pr-3">{r.office?.name || "-"}</td>
                  <td className="py-2 pr-3">
                    {r.distance_meters !== null ? `${Math.round(r.distance_meters)} m` : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge withinRadius={r.within_radius} />
                      {r.is_manual && (
                        <span className="text-[10px] font-semibold text-amber">Input manual</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="text-xs font-semibold text-primary-dark"
                      onClick={() => setEditRecord(r)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editRecord && (
        <AttendanceEditModal
          record={editRecord === "new" ? null : editRecord}
          employees={employees}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            load();
          }}
        />
      )}
    </div>
  );
}

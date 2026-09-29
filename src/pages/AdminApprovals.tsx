import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Profile } from "../types";

type Row = Pick<Profile, "id" | "full_name" | "email" | "approval_status" | "created_at">;

export function AdminApprovals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: qError } = await supabase
      .from("profiles")
      .select("id, full_name, email, approval_status, created_at")
      .in("approval_status", ["pending", "rejected"])
      .order("created_at", { ascending: false });
    if (qError) setError(qError.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ approval_status: status })
      .eq("id", id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  }

  const pending = rows.filter((r) => r.approval_status === "pending");
  const rejected = rows.filter((r) => r.approval_status === "rejected");

  function RowCard({ r }: { r: Row }) {
    return (
      <div className="card space-y-3">
        <div>
          <p className="font-semibold">{r.full_name || "(nama belum tersedia)"}</p>
          <p className="text-xs text-ink/50 break-all">{r.email}</p>
          <p className="text-xs text-ink/40 mt-0.5">
            Mendaftar{" "}
            {new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary flex-1 text-sm"
            onClick={() => setStatus(r.id, "approved")}
            disabled={busyId === r.id}
          >
            Setujui
          </button>
          {r.approval_status === "pending" && (
            <button
              className="btn flex-1 text-sm border border-rust text-rust bg-white hover:bg-rust hover:text-white"
              onClick={() => setStatus(r.id, "rejected")}
              disabled={busyId === r.id}
            >
              Tolak
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadein">
      <h1 className="text-xl font-extrabold tracking-tight">Persetujuan Akun</h1>
      <p className="text-sm text-ink/50 -mt-3">
        Akun baru yang login lewat Google tidak bisa memakai aplikasi sebelum disetujui di sini. Setelah
        disetujui, lengkapi jabatan & atasan langsungnya lewat menu Data Karyawan.
      </p>

      {error && <p className="text-sm text-rust">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="field-label">Menunggu persetujuan ({pending.length})</p>
            {pending.length === 0 ? (
              <p className="text-sm text-ink/50">Tidak ada akun yang menunggu persetujuan.</p>
            ) : (
              pending.map((r) => <RowCard key={r.id} r={r} />)
            )}
          </div>

          {rejected.length > 0 && (
            <div className="space-y-2">
              <p className="field-label">Ditolak ({rejected.length})</p>
              {rejected.map((r) => (
                <RowCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

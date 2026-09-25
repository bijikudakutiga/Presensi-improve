import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, TypeBadge } from "../components/StatusBadge";
import type { AttendanceRecord } from "../types";

export function HistoryPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    async function load() {
      if (!session?.user) return;
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      const rows = (data as AttendanceRecord[]) || [];
      setRecords(rows);
      setLoading(false);

      const urls: Record<string, string> = {};
      for (const r of rows) {
        if (r.photo_url) {
          const { data: signed } = await supabase.storage
            .from("attendance-photos")
            .createSignedUrl(r.photo_url, 3600);
          if (signed) urls[r.id] = signed.signedUrl;
        }
      }
      setPhotoUrls(urls);
    }
    load();
  }, [session?.user?.id, days]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Riwayat Presensi</h1>
        <select
          className="rounded border border-line bg-white px-2 py-1.5 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 hari terakhir</option>
          <option value={14}>14 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
          <option value={90}>90 hari terakhir</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-ink/50">Belum ada riwayat pada rentang ini.</p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="card flex items-center gap-4">
              {photoUrls[r.id] ? (
                <img
                  src={photoUrls[r.id]}
                  alt=""
                  className="h-14 w-14 rounded object-cover border border-line flex-shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded bg-ink/5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={r.type} />
                  <StatusBadge withinRadius={r.within_radius} />
                </div>
                <p className="text-sm mt-1">
                  {new Date(r.created_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {r.distance_meters !== null && (
                  <p className="text-xs text-ink/50">
                    Jarak dari kantor: {Math.round(r.distance_meters)} m
                  </p>
                )}
                {r.note && (
                  <p className="text-xs text-ink/60 mt-1 italic">&ldquo;{r.note}&rdquo;</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

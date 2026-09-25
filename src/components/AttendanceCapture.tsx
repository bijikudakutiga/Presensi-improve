import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { CameraCapture } from "./CameraCapture";
import { StatusBadge } from "./StatusBadge";
import { getCurrentPosition, distanceMeters, type Coords } from "../lib/geo";
import { requiresNote, typeLabel } from "../lib/attendanceState";
import type { AttendanceRecord, AttendanceType, Office } from "../types";

interface Props {
  type: AttendanceType;
  offices: Office[];
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AttendanceCapture({ type, offices, userId, onCancel, onSuccess }: Props) {
  const [now, setNow] = useState(new Date());
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentPosition()
      .then((c) => {
        if (!cancelled) setCoords(c);
      })
      .catch((e) => {
        if (!cancelled) setLocError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nearest = useMemo(() => {
    if (!coords || offices.length === 0) return null;
    let best: { office: Office; distance: number } | null = null;
    for (const office of offices) {
      const d = distanceMeters(coords.latitude, coords.longitude, office.latitude, office.longitude);
      if (!best || d < best.distance) best = { office, distance: d };
    }
    return best;
  }, [coords, offices]);

  const needsNote = requiresNote(type);
  const canSubmit = !!photoBlob && !locating && !!coords && (!needsNote || note.trim().length > 0);

  async function handleSubmit() {
    if (!photoBlob || !coords) return;
    setSubmitting(true);
    setError(null);
    try {
      const path = `${userId}/${Date.now()}-${type}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("attendance-photos")
        .upload(path, photoBlob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc("record_attendance", {
        p_type: type,
        p_latitude: coords.latitude,
        p_longitude: coords.longitude,
        p_photo_path: path,
        p_note: needsNote ? note.trim() : null,
      });
      if (rpcError) throw rpcError;
      setResult(data as AttendanceRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim presensi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight">{typeLabel(type)}</h1>
          <button className="text-sm font-semibold text-ink/50" onClick={onCancel}>
            Tutup
          </button>
        </div>

        {result ? (
          <div className="card text-center space-y-3">
            <p className="font-semibold">{typeLabel(type)} berhasil dicatat.</p>
            <div className="flex justify-center">
              <StatusBadge withinRadius={result.within_radius} />
            </div>
            {result.distance_meters !== null && (
              <p className="text-sm text-ink/60">
                Jarak dari kantor terdekat: {Math.round(result.distance_meters)} m
              </p>
            )}
            {result.within_radius === false && (
              <p className="text-sm text-rust">
                Lokasi di luar radius kantor. Presensi tetap tersimpan dan akan terlihat oleh HR.
              </p>
            )}
            <button className="btn-primary w-full" onClick={onSuccess}>
              Selesai
            </button>
          </div>
        ) : (
          <>
            <div className="card flex items-center justify-between text-sm">
              <div>
                <p className="field-label mb-1">Waktu</p>
                <p className="font-semibold">
                  {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
              <div className="text-right">
                <p className="field-label mb-1">Jarak dari kantor</p>
                {locating ? (
                  <p className="font-semibold text-ink/40">Mencari lokasi...</p>
                ) : locError ? (
                  <p className="font-semibold text-rust text-xs">{locError}</p>
                ) : nearest ? (
                  <p className="font-semibold">
                    {Math.round(nearest.distance)} m
                    <span className="block text-xs font-normal text-ink/40">{nearest.office.name}</span>
                  </p>
                ) : (
                  <p className="font-semibold text-ink/40">Belum ada kantor terdaftar</p>
                )}
              </div>
            </div>

            <div className="card">
              <CameraCapture
                capturedUrl={photoPreview}
                onCapture={(blob, url) => {
                  setPhotoBlob(blob);
                  setPhotoPreview(url);
                }}
                onClear={() => {
                  setPhotoBlob(null);
                  setPhotoPreview(null);
                }}
              />
            </div>

            {needsNote && photoBlob && (
              <div className="card space-y-2">
                <label className="field-label block">Kunjungan ke mana?</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Contoh: Kantor PT Sejahtera Abadi, bertemu Bapak Andi untuk follow up penawaran."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-sm text-rust">{error}</p>}

            <button className="btn-primary w-full py-3" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "Mengirim..." : `Kirim ${typeLabel(type)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

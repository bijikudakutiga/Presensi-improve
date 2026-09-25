import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getCurrentPosition } from "../lib/geo";
import type { Office } from "../types";

export function AdminOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: qError } = await supabase
      .from("offices")
      .select("*")
      .order("created_at", { ascending: true });
    if (qError) setError(qError.message);
    setOffices((data as Office[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const coords = await getCurrentPosition();
      setLat(coords.latitude.toFixed(6));
      setLng(coords.longitude.toFixed(6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
    } finally {
      setLocating(false);
    }
  }

  async function addOffice() {
    if (!name || !lat || !lng || !radius) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("offices").insert({
      name,
      latitude: Number(lat),
      longitude: Number(lng),
      radius_meters: Number(radius),
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setLat("");
    setLng("");
    setRadius("150");
    load();
  }

  async function removeOffice(id: string) {
    if (!confirm("Hapus lokasi kantor ini?")) return;
    await supabase.from("offices").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight">Lokasi Kantor</h1>

      <div className="card space-y-3">
        <p className="field-label">Tambah lokasi kantor</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="rounded border border-line px-2 py-1.5 text-sm"
            placeholder="Nama kantor (mis. Kantor Pusat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded border border-line px-2 py-1.5 text-sm"
            placeholder="Radius (meter)"
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
          <input
            className="rounded border border-line px-2 py-1.5 text-sm"
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <input
            className="rounded border border-line px-2 py-1.5 text-sm"
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-sm" onClick={useCurrentLocation} disabled={locating}>
            {locating ? "Mengambil lokasi..." : "Gunakan lokasi saat ini"}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={addOffice}
            disabled={saving || !name || !lat || !lng}
          >
            {saving ? "Menyimpan..." : "Simpan Kantor"}
          </button>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <p className="text-xs text-ink/40">
          Tip: buka halaman ini dari perangkat yang sedang berada di lokasi kantor,
          lalu klik "Gunakan lokasi saat ini" untuk mengisi koordinat otomatis.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : offices.length === 0 ? (
        <p className="text-sm text-ink/50">Belum ada lokasi kantor terdaftar.</p>
      ) : (
        <div className="space-y-3">
          {offices.map((o) => (
            <div key={o.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{o.name}</p>
                <p className="text-xs text-ink/50">
                  {o.latitude.toFixed(6)}, {o.longitude.toFixed(6)} · radius {o.radius_meters} m
                </p>
              </div>
              <button
                className="text-xs font-semibold text-rust hover:underline"
                onClick={() => removeOffice(o.id)}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

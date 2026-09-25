import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Position } from "../types";

export function AdminPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("positions").select("*").order("level").order("name");
    setPositions((data as Position[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("positions")
      .insert({ name: name.trim(), level: Number(level) || 0 });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus jabatan ini? Karyawan dengan jabatan ini akan menjadi tanpa jabatan.")) return;
    await supabase.from("positions").delete().eq("id", id);
    load();
  }

  const levelLabel: Record<number, string> = { 0: "Owner", 1: "Manager", 2: "Staff" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Jabatan</h1>
      <p className="text-sm text-ink/50 -mt-3">
        Level dipakai untuk pengelompokan tampilan saja (0 = Owner, 1 = Manager, 2 = Staff). Atasan
        langsung tiap karyawan diatur lewat menu Data Karyawan.
      </p>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-3">
          <input className="input" placeholder="Nama jabatan" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="0">Owner</option>
            <option value="1">Manager</option>
            <option value="2">Staff</option>
          </select>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary w-full" onClick={handleAdd} disabled={saving || !name.trim()}>
          {saving ? "Menambahkan..." : "Tambah Jabatan"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : (
        <div className="space-y-2">
          {positions.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-ink/50">{levelLabel[p.level] ?? `Level ${p.level}`}</p>
              </div>
              <button className="text-xs font-semibold text-rust" onClick={() => handleDelete(p.id)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

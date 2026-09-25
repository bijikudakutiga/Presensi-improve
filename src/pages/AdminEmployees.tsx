import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { ProfileForm } from "../components/ProfileForm";
import { formatRupiah } from "../lib/payroll";
import type { Profile } from "../types";

export function AdminEmployees() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
    setEmployees((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (selected) {
    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-ink/50" onClick={() => setSelected(null)}>
          ← Kembali ke daftar karyawan
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">{selected.full_name || selected.email}</h1>
        <ProfileForm
          profile={selected}
          isAdmin
          onSaved={() => {
            load();
            setSelected(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Data Karyawan</h1>
      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : (
        <div className="space-y-2">
          {employees.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className="card flex w-full items-center justify-between text-left hover:border-primary"
            >
              <div>
                <p className="font-semibold">{e.full_name || "(nama belum diisi)"}</p>
                <p className="text-xs text-ink/50">{e.email} · {e.position || "Jabatan belum diisi"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase text-ink/40">{e.role}</p>
                <p className="text-xs text-ink/50">{formatRupiah(e.base_salary)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

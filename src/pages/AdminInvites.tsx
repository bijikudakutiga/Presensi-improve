import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { PendingAdminInvite } from "../types";

export function AdminInvites() {
  const [invites, setInvites] = useState<PendingAdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [hrAccess, setHrAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pending_admin_invites")
      .select("*")
      .order("created_at", { ascending: false });
    setInvites((data as PendingAdminInvite[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("pending_admin_invites")
      .upsert({ email: email.trim().toLowerCase(), hr_access: hrAccess });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEmail("");
    setHrAccess(false);
    load();
  }

  async function handleCancel(inviteEmail: string) {
    await supabase.from("pending_admin_invites").delete().eq("email", inviteEmail);
    load();
  }

  return (
    <div className="space-y-4 animate-fadein">
      <h1 className="text-xl font-extrabold tracking-tight">Undang Admin</h1>
      <p className="text-sm text-ink/50 -mt-3">
        Daftarkan email di sini agar begitu orang tersebut login pakai Google untuk pertama kali,
        akunnya otomatis langsung jadi admin — tidak perlu diubah manual lagi di Data Karyawan.
      </p>

      <div className="card space-y-3">
        <label className="block">
          <span className="field-label block mb-1">Email Google calon admin</span>
          <input
            type="email"
            className="input"
            placeholder="nama@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hrAccess} onChange={(e) => setHrAccess(e.target.checked)} />
          Beri juga Akses HR (bisa lihat Payroll & pengaturan KPI)
        </label>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary w-full" onClick={handleInvite} disabled={saving || !email.trim()}>
          {saving ? "Menyimpan..." : "Undang sebagai Admin"}
        </button>
      </div>

      <div className="space-y-2">
        <p className="field-label">Menunggu login pertama</p>
        {loading ? (
          <p className="text-sm text-ink/50">Memuat...</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-ink/50">Tidak ada undangan yang menunggu.</p>
        ) : (
          invites.map((inv) => (
            <div key={inv.email} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{inv.email}</p>
                <p className="text-xs text-ink/50">{inv.hr_access ? "Admin + Akses HR" : "Admin"}</p>
              </div>
              <button className="text-xs font-semibold text-rust" onClick={() => handleCancel(inv.email)}>
                Batalkan
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

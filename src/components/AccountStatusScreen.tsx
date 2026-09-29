import { useState } from "react";

interface Props {
  status: "pending" | "rejected";
  email: string | null | undefined;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function AccountStatusScreen({ status, email, onRefresh, onSignOut }: Props) {
  const [checking, setChecking] = useState(false);

  async function handleRefresh() {
    setChecking(true);
    await onRefresh();
    setChecking(false);
  }

  const pending = status === "pending";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper animate-fadein">
      <div className="w-full max-w-sm text-center space-y-5">
        <img src="/logo-improvehub.png" alt="ImproveHub" className="mx-auto w-44" />
        <div className="card space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl">
            {pending ? "⏳" : "🚫"}
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">
            {pending ? "Menunggu persetujuan" : "Akses belum disetujui"}
          </h1>
          <p className="text-sm text-ink/60">
            {pending
              ? "Akun kamu sudah terdaftar dan sedang menunggu persetujuan dari HR/admin. Kamu bisa menggunakan aplikasi setelah akun disetujui."
              : "Permintaan akses akun ini belum disetujui oleh HR/admin. Silakan hubungi HR jika ini keliru."}
          </p>
          {email && <p className="text-xs text-ink/40 break-all">Login sebagai: {email}</p>}
          {pending && (
            <button className="btn-primary w-full" onClick={handleRefresh} disabled={checking}>
              {checking ? "Memeriksa..." : "Cek status persetujuan"}
            </button>
          )}
          <button
            className="btn w-full border border-line bg-white text-ink/70 hover:border-primary"
            onClick={onSignOut}
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

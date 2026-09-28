import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { MoreMenuSheet } from "./MoreMenuSheet";
import { InstallPrompt } from "./InstallPrompt";

export function Layout() {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] font-semibold transition-colors ${
      isActive ? "text-primary" : "text-ink/40"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <div
        className="sticky top-0 z-20 flex items-center gap-2 bg-white border-b border-line px-4"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          minHeight: "calc(env(safe-area-inset-top, 0px) + 52px)",
        }}
      >
        <img src="/icons/01-app-icon.png" alt="" className="h-7 w-7 object-contain" />
        <span className="font-extrabold text-primary-dark tracking-tight">Presensi</span>
      </div>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex w-full max-w-md items-stretch bg-white border-t border-line px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <NavLink to="/" end className={tabClass}>
          <img src="/icons/01-app-icon.png" alt="" className="h-6 w-6 object-contain" />
          Beranda
        </NavLink>
        <NavLink to="/riwayat" className={tabClass}>
          <img src="/icons/08-riwayat.png" alt="" className="h-6 w-6 object-contain" />
          Riwayat
        </NavLink>

        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => navigate("/?absen=1")}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-soft active:scale-95 transition-transform"
            aria-label="Absen"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
        </div>

        <NavLink to="/proyek" className={tabClass}>
          <span className="h-6 w-6 flex items-center justify-center text-lg">🗂</span>
          Proyek
        </NavLink>
        <button className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] font-semibold text-ink/40`} onClick={() => setMoreOpen(true)}>
          <span className="h-6 w-6 flex items-center justify-center text-lg">⋯</span>
          Lainnya
        </button>
      </nav>

      {moreOpen && <MoreMenuSheet onClose={() => setMoreOpen(false)} />}
      <InstallPrompt />
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
}

const EMPLOYEE_NAV: NavItem[] = [
  { to: "/", label: "Beranda", icon: "/icons/01-app-icon.png", end: true },
  { to: "/riwayat", label: "Riwayat", icon: "/icons/08-riwayat.png" },
  { to: "/proyek", label: "Proyek" },
  { to: "/kpi", label: "KPI" },
  { to: "/slip-gaji", label: "Slip Gaji", icon: "/icons/09-payroll.png" },
  { to: "/data-diri", label: "Data Diri", icon: "/icons/10-data-diri.png" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Rekap Absensi", icon: "/icons/08-riwayat.png" },
  { to: "/admin/karyawan", label: "Data Karyawan", icon: "/icons/10-data-diri.png" },
  { to: "/admin/jabatan", label: "Jabatan" },
  { to: "/admin/payroll", label: "Payroll", icon: "/icons/09-payroll.png" },
  { to: "/admin/kpi-template", label: "Template KPI" },
  { to: "/admin/kpi-periode", label: "Periode KPI" },
  { to: "/admin/kantor", label: "Lokasi Kantor", icon: "/icons/11-lokasi-kantor.png" },
  { to: "/admin/jadwal", label: "Jadwal & Tarif", icon: "/icons/12-jadwal-tarif.png" },
];

export function Layout() {
  const { profile, signOut } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-semibold rounded transition-colors ${
      isActive ? "bg-primary text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-extrabold text-lg tracking-tight text-primary-dark shrink-0">
            <img src="/icons/01-app-icon.png" alt="" className="h-7 w-7 object-contain" />
            Presensi
          </span>
          <button className="btn-outline text-xs px-3 py-1.5 shrink-0" onClick={signOut}>
            Keluar
          </button>
        </div>
        <nav className="mx-auto max-w-4xl px-4 pb-2 flex gap-1 overflow-x-auto">
          {EMPLOYEE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.icon && <img src={item.icon} alt="" className="h-5 w-5 object-contain" />}
              {item.label}
            </NavLink>
          ))}
          {profile?.role === "admin" && (
            <>
              <span className="mx-1 self-center text-line">|</span>
              {ADMIN_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.icon && <img src={item.icon} alt="" className="h-5 w-5 object-contain" />}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

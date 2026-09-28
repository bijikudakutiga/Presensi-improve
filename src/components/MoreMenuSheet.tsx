import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Item {
  to: string;
  label: string;
  icon?: string;
}

export function MoreMenuSheet({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();

  const employeeItems: Item[] = [
    { to: "/slip-gaji", label: "Slip Gaji", icon: "/icons/09-payroll.png" },
    { to: "/kpi", label: "KPI" },
    { to: "/data-diri", label: "Data Diri", icon: "/icons/10-data-diri.png" },
  ];

  const adminItems: Item[] = profile?.role === "admin"
    ? [
        { to: "/admin", label: "Rekap Absensi", icon: "/icons/08-riwayat.png" },
        { to: "/admin/karyawan", label: "Data Karyawan", icon: "/icons/10-data-diri.png" },
        { to: "/admin/jabatan", label: "Jabatan" },
        { to: "/admin/undang", label: "Undang Admin" },
        { to: "/admin/kantor", label: "Lokasi Kantor", icon: "/icons/11-lokasi-kantor.png" },
      ]
    : [];

  const hrItems: Item[] = profile?.role === "admin" && profile?.hr_access
    ? [
        { to: "/admin/payroll", label: "Payroll", icon: "/icons/09-payroll.png" },
        { to: "/admin/jadwal", label: "Jadwal & Tarif", icon: "/icons/12-jadwal-tarif.png" },
        { to: "/admin/kpi-template", label: "Template KPI" },
        { to: "/admin/kpi-periode", label: "Periode KPI" },
      ]
    : [];

  function Row({ item }: { item: Item }) {
    return (
      <NavLink
        to={item.to}
        onClick={onClose}
        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-ink/80 hover:bg-primary-soft"
      >
        {item.icon ? (
          <img src={item.icon} alt="" className="h-6 w-6 object-contain" />
        ) : (
          <span className="h-6 w-6 rounded-full bg-primary-soft" />
        )}
        {item.label}
      </NavLink>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto animate-slideup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="space-y-1">
          {employeeItems.map((item) => (
            <Row key={item.to} item={item} />
          ))}
        </div>
        {adminItems.length > 0 && (
          <>
            <p className="field-label px-3 pt-3 pb-1">Admin</p>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <Row key={item.to} item={item} />
              ))}
            </div>
          </>
        )}
        {hrItems.length > 0 && (
          <>
            <p className="field-label px-3 pt-3 pb-1">HR</p>
            <div className="space-y-1">
              {hrItems.map((item) => (
                <Row key={item.to} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

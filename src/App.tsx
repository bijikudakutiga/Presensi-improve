import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { HistoryPage } from "./pages/HistoryPage";
import { ProfileIdentityPage } from "./pages/ProfileIdentityPage";
import { PayslipPage } from "./pages/Payslip";
import { Projects } from "./pages/Projects";
import { ProjectBoard } from "./pages/ProjectBoard";
import { MyKpi } from "./pages/MyKpi";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminOffices } from "./pages/AdminOffices";
import { AdminSchedule } from "./pages/AdminSchedule";
import { AdminEmployees } from "./pages/AdminEmployees";
import { AdminPayroll } from "./pages/AdminPayroll";
import { AdminPositions } from "./pages/AdminPositions";
import { AdminKpiTemplates } from "./pages/AdminKpiTemplates";
import { AdminKpiPeriods } from "./pages/AdminKpiPeriods";

function AdminRoute({ children }: { children: JSX.Element }) {
  const { profile } = useAuth();
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-ink/50">
        Memuat...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="font-semibold">Akun belum terdaftar sebagai karyawan.</p>
          <p className="text-sm text-ink/60 mt-1">
            Hubungi admin untuk mendaftarkan akun ini ke sistem presensi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/riwayat" element={<HistoryPage />} />
        <Route path="/slip-gaji" element={<PayslipPage />} />
        <Route path="/data-diri" element={<ProfileIdentityPage />} />
        <Route path="/proyek" element={<Projects />} />
        <Route path="/proyek/:id" element={<ProjectBoard />} />
        <Route path="/kpi" element={<MyKpi />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/karyawan"
          element={
            <AdminRoute>
              <AdminEmployees />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payroll"
          element={
            <AdminRoute>
              <AdminPayroll />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/kantor"
          element={
            <AdminRoute>
              <AdminOffices />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/jadwal"
          element={
            <AdminRoute>
              <AdminSchedule />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/jabatan"
          element={
            <AdminRoute>
              <AdminPositions />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/kpi-template"
          element={
            <AdminRoute>
              <AdminKpiTemplates />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/kpi-periode"
          element={
            <AdminRoute>
              <AdminKpiPeriods />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

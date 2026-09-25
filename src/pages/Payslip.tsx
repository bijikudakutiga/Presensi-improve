import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatRupiah, periodLabel } from "../lib/payroll";
import type { PayrollItem, PayrollPeriod } from "../types";

export function PayslipPage() {
  const { session, profile } = useAuth();
  const [items, setItems] = useState<(PayrollItem & { period?: PayrollPeriod })[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session?.user) return;
      setLoading(true);
      const { data } = await supabase
        .from("payroll_items")
        .select("*, period:payroll_periods(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setItems((data as unknown as (PayrollItem & { period?: PayrollPeriod })[]) || []);
      setLoading(false);
    }
    load();
  }, [session?.user?.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">Slip Gaji</h1>
      {loading ? (
        <p className="text-sm text-ink/50">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/50">Belum ada slip gaji yang tersedia.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const open = openId === item.id;
            const period = item.period;
            return (
              <div key={item.id} className="card">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <div>
                    <p className="font-semibold">
                      {period ? periodLabel(period.period_month, period.period_year) : "-"}
                    </p>
                    <p className="text-xs text-ink/50">{profile?.full_name}</p>
                  </div>
                  <p className="font-extrabold text-primary-dark">{formatRupiah(item.total)}</p>
                </button>
                {open && (
                  <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink/60">Gaji pokok</span>
                      <span>{formatRupiah(item.base_salary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink/60">Potongan keterlambatan ({item.late_minutes} menit)</span>
                      <span className="text-rust">-{formatRupiah(item.lateness_deduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink/60">Upah lembur ({item.overtime_hours} jam)</span>
                      <span className="text-primary-dark">+{formatRupiah(item.overtime_pay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink/60">Penyesuaian{item.adjustment_note ? ` (${item.adjustment_note})` : ""}</span>
                      <span>{formatRupiah(item.adjustment)}</span>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2 font-semibold">
                      <span>Total diterima</span>
                      <span>{formatRupiah(item.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

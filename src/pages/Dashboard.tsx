import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getDailyQuote } from "../lib/quotes";
import { getAttendanceOptions, typeLabel } from "../lib/attendanceState";
import { AttendanceSheet } from "../components/AttendanceSheet";
import { AttendanceCapture } from "../components/AttendanceCapture";
import { StatusBadge } from "../components/StatusBadge";
import { MarqueeQuote } from "../components/MarqueeQuote";
import type { AttendanceRecord, AttendanceType, DailyQuote, Office, WorkSchedule } from "../types";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface MenuItem {
  to: string;
  label: string;
  icon?: string;
  emoji?: string;
  show: boolean;
}

export function Dashboard() {
  const { profile, session, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [today, setToday] = useState<AttendanceRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeType, setActiveType] = useState<AttendanceType | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadToday() {
    if (!session?.user) return;
    setLoadingToday(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at", startOfTodayIso())
      .order("created_at", { ascending: true });
    setToday((data as AttendanceRecord[]) || []);
    setLoadingToday(false);
  }

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.from("offices").select("*").then(({ data }) => setOffices((data as Office[]) || []));
    supabase
      .from("work_schedules")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSchedule(data as WorkSchedule | null));
    getDailyQuote().then(setQuote);
  }, []);

  // Tombol "+" di bottom nav mengarah ke /?absen=1 supaya bisa langsung
  // membuka sheet presensi dari halaman mana pun.
  useEffect(() => {
    if (searchParams.get("absen") === "1" && !loadingToday) {
      setSheetOpen(true);
      searchParams.delete("absen");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingToday]);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    setAvatarUploading(true);
    try {
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: `${pub.publicUrl}?t=${Date.now()}` })
        .eq("id", session.user.id);
      await refreshProfile();
    } catch {
      alert("Gagal mengunggah foto profil. Coba lagi.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const options = getAttendanceOptions(today);
  const masuk = today.find((r) => r.type === "in");
  const keluar = today.find((r) => r.type === "out");

  const isHr = profile?.role === "admin" && profile?.hr_access;
  const isAdmin = profile?.role === "admin";

  const menuItems: MenuItem[] = [
    { to: "/riwayat", label: "Riwayat", icon: "/icons/08-riwayat.png", show: true },
    { to: "/slip-gaji", label: "Slip Gaji", icon: "/icons/09-payroll.png", show: true },
    { to: "/kpi", label: "KPI", emoji: "🎯", show: true },
    { to: "/proyek", label: "Proyek", emoji: "🗂", show: true },
    { to: "/data-diri", label: "Data Diri", icon: "/icons/10-data-diri.png", show: true },
    { to: "/admin", label: "Rekap Absensi", icon: "/icons/08-riwayat.png", show: isAdmin },
    { to: "/admin/karyawan", label: "Data Karyawan", icon: "/icons/10-data-diri.png", show: isAdmin },
    { to: "/admin/jabatan", label: "Jabatan", emoji: "🏷", show: isAdmin },
    { to: "/admin/kantor", label: "Lokasi Kantor", icon: "/icons/11-lokasi-kantor.png", show: isAdmin },
    { to: "/admin/payroll", label: "Payroll", icon: "/icons/09-payroll.png", show: isHr },
    { to: "/admin/jadwal", label: "Jadwal & Tarif", icon: "/icons/12-jadwal-tarif.png", show: isHr },
    { to: "/admin/kpi-template", label: "Template KPI", emoji: "📋", show: isHr },
    { to: "/admin/kpi-periode", label: "Periode KPI", emoji: "🗓", show: isHr },
  ].filter((m) => m.show);

  const PAGE_SIZE = 8;
  const pages: MenuItem[][] = [];
  for (let i = 0; i < menuItems.length; i += PAGE_SIZE) pages.push(menuItems.slice(i, i + PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);

  return (
    <div className="animate-fadein">
      <div className="bg-gradient-to-br from-primary to-primary-dark px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-16 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="h-14 w-14 overflow-hidden rounded-full border-2 border-white/50 bg-white/20"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti foto profil"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-extrabold">
                    {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-primary shadow-soft">
                {avatarUploading ? "…" : "✎"}
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/70">Howdy!!</p>
              <h1 className="text-lg font-extrabold tracking-tight truncate max-w-[46vw]">
                {profile?.full_name || profile?.email}
              </h1>
            </div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">🔔</span>
        </div>
      </div>

      <div className="relative -mt-10 px-4 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {schedule && (
              <p className="text-xs text-ink/40">
                Jam kerja {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}
              </p>
            )}
          </div>
          {loadingToday ? (
            <p className="text-sm text-ink/50">Memuat...</p>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="pr-3">
                <p className="field-label mb-1">Presensi Masuk</p>
                {masuk ? (
                  <>
                    <p className="text-xl font-extrabold">
                      {new Date(masuk.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <StatusBadge withinRadius={masuk.within_radius} />
                  </>
                ) : (
                  <p className="text-sm text-ink/40">Belum absen</p>
                )}
              </div>
              <div className="pl-3">
                <p className="field-label mb-1">Presensi Keluar</p>
                {keluar ? (
                  <>
                    <p className="text-xl font-extrabold">
                      {new Date(keluar.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <StatusBadge withinRadius={keluar.within_radius} />
                  </>
                ) : (
                  <p className="text-sm text-ink/40">Belum absen</p>
                )}
              </div>
            </div>
          )}
        </div>

        {quote && <MarqueeQuote text={quote.text} author={quote.author} />}

        <div className="card">
          <div
            className="grid grid-cols-4 gap-y-4"
            onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (swipeStartX === null) return;
              const dx = e.changedTouches[0].clientX - swipeStartX;
              if (dx < -40 && page < pages.length - 1) setPage((p) => p + 1);
              if (dx > 40 && page > 0) setPage((p) => p - 1);
              setSwipeStartX(null);
            }}
          >
            {(pages[page] || []).map((item) => (
              <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-xl active:scale-90 transition-transform">
                  {item.icon ? (
                    <img src={item.icon} alt="" className="h-6 w-6 object-contain" />
                  ) : (
                    item.emoji
                  )}
                </span>
                <span className="text-[11px] font-medium text-ink/70 leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
          {pages.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-1.5 rounded-full transition-all ${i === page ? "w-5 bg-primary" : "w-1.5 bg-line"}`}
                  aria-label={`Halaman ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <p className="field-label mb-2">Aktivitas Hari Ini</p>
          {today.length === 0 ? (
            <p className="text-sm text-ink/50">Belum ada aktivitas presensi hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {today.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm border-l-2 border-primary-soft pl-3">
                  <span className="font-semibold">{typeLabel(r.type)}</span>
                  <span className="text-ink/50">
                    {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sheetOpen && (
        <AttendanceSheet
          options={options}
          onClose={() => setSheetOpen(false)}
          onSelect={(type) => {
            setSheetOpen(false);
            setActiveType(type);
          }}
        />
      )}

      {activeType && session?.user && (
        <AttendanceCapture
          type={activeType}
          offices={offices}
          userId={session.user.id}
          onCancel={() => setActiveType(null)}
          onSuccess={() => {
            setActiveType(null);
            loadToday();
          }}
        />
      )}
    </div>
  );
}

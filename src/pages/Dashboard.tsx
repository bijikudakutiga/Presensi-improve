import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getDailyQuote } from "../lib/quotes";
import { getAttendanceOptions, typeLabel } from "../lib/attendanceState";
import { AttendanceSheet } from "../components/AttendanceSheet";
import { AttendanceCapture } from "../components/AttendanceCapture";
import { StatusBadge } from "../components/StatusBadge";
import type { AttendanceRecord, AttendanceType, DailyQuote, Office, WorkSchedule } from "../types";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function Dashboard() {
  const { profile, session, refreshProfile } = useAuth();
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
    supabase
      .from("offices")
      .select("*")
      .then(({ data }) => setOffices((data as Office[]) || []));
    supabase
      .from("work_schedules")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSchedule(data as WorkSchedule | null));
    getDailyQuote().then(setQuote);
  }, []);

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
  const anyEnabled = options.some((o) => o.enabled);

  return (
    <div className="space-y-5 pb-24">
      <div className="card flex items-center gap-4">
        <div className="relative">
          <button
            className="h-16 w-16 overflow-hidden rounded-full border-2 border-primary-soft bg-primary-soft"
            onClick={() => fileInputRef.current?.click()}
            title="Ganti foto profil"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-extrabold text-primary-dark">
                {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white shadow-soft">
            {avatarUploading ? "…" : "✎"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink/50">
            {nowGreeting()}
          </p>
          <h1 className="text-lg font-extrabold tracking-tight truncate">
            {profile?.full_name || profile?.email}
          </h1>
          {profile?.position && <p className="text-sm text-ink/50">{profile.position}</p>}
        </div>
      </div>

      {quote && (
        <div className="card bg-primary-soft border-primary-soft">
          <p className="text-sm font-medium leading-relaxed text-primary-dark">&ldquo;{quote.text}&rdquo;</p>
          <p className="mt-2 text-xs font-semibold text-primary-dark/70">— {quote.author}</p>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="field-label">Status hari ini</p>
          {schedule && (
            <p className="text-xs text-ink/40">
              Jam kerja {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}
            </p>
          )}
        </div>
        {loadingToday ? (
          <p className="text-sm text-ink/50">Memuat...</p>
        ) : today.length === 0 ? (
          <p className="text-sm text-ink/50">Belum ada presensi hari ini.</p>
        ) : (
          <ul className="space-y-2">
            {today.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{typeLabel(r.type)}</span>
                <span className="text-ink/50">
                  {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <StatusBadge withinRadius={r.within_radius} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-soft disabled:opacity-40"
        onClick={() => setSheetOpen(true)}
        disabled={!anyEnabled}
        aria-label="Absen"
      >
        <span className="text-3xl leading-none">+</span>
      </button>

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

function nowGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

import type { DailyQuote } from "../types";

const CACHE_KEY = "presensi_daily_quote";

// Dipakai hanya jika API sedang tidak bisa diakses (mis. offline / rate limit),
// supaya dashboard tetap tampil dengan baik tanpa error.
const FALLBACK_QUOTES: DailyQuote[] = [
  { text: "Pikiranmu menentukan jalanmu.", author: "John Maxwell" },
  { text: "Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.", author: "Tim Notke" },
  { text: "Datang terlambat lebih baik daripada tidak datang sama sekali, tapi jangan dijadikan kebiasaan.", author: "Anonim" },
  { text: "Senyum hari ini, gaji cair akhir bulan.", author: "Anonim" },
  { text: "Kesuksesan adalah jumlah dari usaha kecil yang diulang hari demi hari.", author: "Robert Collier" },
  { text: "Jangan tunggu motivasi, mulai saja lalu motivasi akan menyusul.", author: "Anonim" },
  { text: "Kopi boleh pahit, tapi semangat kerja harus tetap manis.", author: "Anonim" },
  { text: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function randomFallback(): DailyQuote {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
}

interface CachedQuote {
  date: string;
  quote: DailyQuote;
}

function readCache(): CachedQuote | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedQuote;
  } catch {
    return null;
  }
}

function writeCache(quote: DailyQuote) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), quote }));
  } catch {
    // localStorage tidak tersedia (mode privat, dsb.) — abaikan, tidak fatal.
  }
}

async function fetchFromApi(): Promise<DailyQuote | null> {
  try {
    const res = await fetch("https://zenquotes.io/api/random");
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (first?.q && first?.a) {
      return { text: first.q as string, author: first.a as string };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Kutipan motivasi harian: sama sepanjang hari (disimpan di cache lokal),
 * lalu diganti otomatis dengan kutipan baru esok harinya. Jika API tidak
 * bisa diakses, jatuh ke kutipan cadangan offline supaya dashboard tidak error.
 */
export async function getDailyQuote(): Promise<DailyQuote> {
  const cached = readCache();
  if (cached && cached.date === todayKey()) {
    return cached.quote;
  }
  const fromApi = await fetchFromApi();
  const quote = fromApi || randomFallback();
  writeCache(quote);
  return quote;
}

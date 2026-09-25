export function formatRupiah(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function periodLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

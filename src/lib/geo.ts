export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat ini tidak mendukung layanan lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk melakukan presensi."
              : "Gagal mendapatkan lokasi. Coba lagi di tempat dengan sinyal GPS lebih baik."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/** Jarak antara dua titik koordinat dalam meter (formula haversine). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

# Presensi — Aplikasi Presensi & Payroll Karyawan

Web app presensi karyawan bertema ungu pastel premium: login Google, presensi
masuk/keluar/kunjungan klien/lembur dengan foto + validasi lokasi kantor,
kutipan motivasi harian, data diri karyawan, dan payroll semi-otomatis yang
bisa disesuaikan HR.

**Stack:** React + Vite + TypeScript + Tailwind, Supabase (Auth, Database,
Storage), di-deploy ke Cloudflare Pages lewat repo GitHub.

---

## Ringkasan fitur

- **Login Google** lewat Supabase Auth.
- **Dashboard**: foto profil (bisa diganti), sapaan sesuai jam ("Selamat
  pagi/siang/sore"), kutipan motivasi harian (diambil otomatis dari
  [ZenQuotes API](https://zenquotes.io), dengan cadangan offline bila API
  tidak terjangkau), ringkasan presensi hari ini, dan tombol bulat di tengah
  bawah untuk memulai presensi.
- **6 jenis presensi**: Masuk, Keluar, Kunjungan Klien Masuk/Selesai, Lembur
  Masuk/Selesai. Saat mengambil foto, jarak ke kantor terdekat dan jam
  ditampilkan langsung di layar. Presensi masuk tetap bisa dilakukan di luar
  radius kantor — hanya ditandai "Luar radius" agar HR bisa meninjau. Untuk
  kunjungan klien, setelah foto akan muncul kolom keterangan tujuan kunjungan.
- **Riwayat presensi** pribadi & **Dashboard Admin** (rekap semua karyawan,
  filter tanggal, cari nama, ekspor CSV).
- **Data Diri**: form identitas lengkap (data pribadi, kontak, info bank)
  yang bisa diisi karyawan sendiri, dan dikelola admin lewat menu Data
  Karyawan.
- **Jadwal & Tarif**: admin mengatur jam kerja default (08.00–16.00),
  toleransi keterlambatan, tarif potongan telat per menit, dan tarif lembur
  per jam.
- **Payroll semi-otomatis**: admin generate payroll per bulan → sistem
  menghitung potongan keterlambatan & upah lembur dari data presensi secara
  otomatis → admin bisa menambahkan penyesuaian manual (bonus/potongan lain)
  per karyawan sebelum **finalisasi**. Setelah final, karyawan bisa melihat
  slip gajinya sendiri di menu Slip Gaji.
- **Proyek & Task (Kanban)**: setiap karyawan otomatis punya proyek "Tugas
  Pribadi" untuk checklist sendiri, dan bisa membuat/bergabung ke proyek tim
  untuk menugaskan task ke rekan kerja. Board 3 kolom (Belum Dimulai/Sedang
  Berlangsung/Selesai), waktu mulai & selesai tercatat otomatis, dan tiap
  proyek bisa diekspor sebagai laporan CSV (bisa dibuka di Excel).
- **KPI 360°**: HR membuat template pertanyaan KPI (bisa dibatasi hanya
  berlaku untuk jabatan tertentu, dan tiap pertanyaan bisa dikhususkan untuk
  penilaian dari atasan/bawahan/rekan setim saja). Saat HR membuka sebuah
  periode, sistem otomatis membuat penugasan penilaian atasan→bawahan,
  bawahan→atasan, dan sesama rekan setim berdasarkan data "atasan langsung"
  tiap karyawan. Penilaian pakai skala 1–5, nama penilai tetap terlihat
  (tidak anonim), dan hasil baru bisa dilihat karyawan setelah periode
  ditutup HR.

---

## 1. Siapkan proyek Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan **berurutan** 3 file berikut (tempel isinya,
   klik Run, baru lanjut ke file berikutnya). Semuanya aman dijalankan ulang:
   1. [`supabase/schema.sql`](./supabase/schema.sql) — profil, presensi,
      payroll. Membuat tabel `profiles`, `offices`, `work_schedules`,
      `attendance`, `payroll_periods`, `payroll_items`; RLS + trigger anti
      privilege-escalation; fungsi `record_attendance()` &
      `generate_payroll()`; bucket Storage `attendance-photos` & `avatars`.
   2. [`supabase/schema_tasks.sql`](./supabase/schema_tasks.sql) — proyek &
      task. Membuat tabel `projects`, `project_members`, `tasks` + RLS.
   3. [`supabase/schema_kpi.sql`](./supabase/schema_kpi.sql) — jabatan,
      atasan langsung, dan KPI 360°. Membuat tabel `positions`,
      kolom `position_id`/`supervisor_id` di `profiles`, tabel
      `kpi_templates`/`kpi_questions`/`kpi_periods`/`kpi_assignments`/
      `kpi_responses`, fungsi `generate_kpi_assignments()`, dan direktori
      karyawan terbatas `get_employee_directory()`.
3. Ambil kredensial API: **Project Settings → API** → `Project URL` dan
   `anon public key`.

## 2. Aktifkan Login Google

1. Buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/)
   (APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application).
2. Di Supabase Dashboard → **Authentication → Providers → Google**, salin
   **Callback URL**, tempelkan sebagai **Authorized redirect URI** di Google Cloud.
3. Salin **Client ID** & **Client Secret** dari Google ke Supabase, aktifkan, **Save**.

## 3. Jalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
```

Tambahkan `http://localhost:5173` ke Supabase **Authentication → URL
Configuration → Redirect URLs** supaya login Google berfungsi saat development.

## 4. Setup awal setelah login pertama kali

1. Login sekali dengan akun Google yang akan jadi admin.
2. Di Supabase SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-anda@contoh.com';
   ```
3. Login ulang → menu admin (Rekap Absensi, Data Karyawan, Jabatan, Payroll,
   Template KPI, Periode KPI, Lokasi Kantor, Jadwal & Tarif) akan muncul.
4. Buka **Lokasi Kantor** → tambahkan minimal satu kantor + radius toleransi.
5. Buka **Jadwal & Tarif** → atur jam kerja, toleransi telat, tarif potongan
   telat, dan tarif lembur.
6. Buka **Jabatan** → sesuaikan daftar jabatan bila perlu (sudah terisi
   contoh awal: Owner, HR Manager, Creative Project Manager, Creative Design
   Manager, Secretary, HR Staff, Partnership, Community & Event, Creative
   Design).
7. Buka **Data Karyawan** → untuk tiap karyawan isi **gaji pokok** (untuk
   payroll) serta **jabatan** dan **atasan langsung** (dipakai KPI 360° untuk
   tahu siapa menilai siapa).
8. Setiap karyawan mengisi sendiri menu **Data Diri** masing-masing.

## 5. Alur payroll bulanan

1. Admin buka menu **Payroll**, pilih bulan/tahun, klik **Generate Payroll**.
   Sistem menghitung potongan telat & upah lembur dari data presensi bulan itu.
2. Admin bisa menambahkan **penyesuaian** (bonus, potongan kasbon, dll,
   boleh angka negatif) per karyawan beserta catatannya, lalu **Simpan**.
   Klik **Generate/Perbarui Perhitungan** lagi kapan saja selama masih draft —
   nilai presensi dihitung ulang, tapi penyesuaian manual yang sudah
   disimpan tidak akan hilang.
3. Setelah yakin, klik **Finalisasi Payroll**. Setelah final, data tidak
   bisa diubah lagi (dijaga di level database, bukan cuma di tampilan), dan
   karyawan bisa melihat slip gajinya di menu **Slip Gaji**.

## 6. Alur KPI 360°

1. Admin buka **Template KPI** → buat template, tambahkan pertanyaan
   (masing-masing bisa dikhususkan untuk penilaian dari atasan/bawahan/rekan
   setim saja, atau berlaku untuk semua), dan pilih jabatan mana saja yang
   bisa dinilai pakai template ini (kosongkan = semua jabatan).
2. Admin buka **Periode KPI** → buat periode baru, pilih template, klik
   **Buka Periode**. Sistem otomatis membuat penugasan penilaian berdasarkan
   kolom "atasan langsung" tiap karyawan (diisi lewat Data Karyawan).
3. Karyawan mengisi penilaian lewat menu **KPI → Perlu Dinilai**.
4. Setelah cukup banyak yang mengisi, admin klik **Tutup Periode**. Karyawan
   baru bisa melihat hasilnya sendiri (menu **KPI → Hasil Saya**) setelah ini.

## 7. Proyek & Task

Menu **Proyek** berisi daftar proyek yang diikuti karyawan (termasuk "Tugas
Pribadi" otomatis). Buka salah satu untuk melihat board Kanban, menambahkan
anggota tim (khusus proyek non-pribadi), membuat/mengedit task, memindahkan
status lewat tombol Mundur/Lanjut, dan mengekspor daftar task proyek itu
sebagai CSV (kolom sama seperti laporan Kerjoo: Judul, Dibuat oleh, Waktu
mulai, Waktu selesai, Detail, Status, Prioritas, Karyawan ditugaskan).

## 8. Push ke GitHub & Deploy ke Cloudflare Pages

```bash
git init && git add . && git commit -m "Inisialisasi aplikasi presensi"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Di Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**:
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Setelah dapat URL `https://xxxx.pages.dev`, tambahkan ke Supabase
**Authentication → URL Configuration** (Site URL & Redirect URLs).

---

## Struktur proyek

```
src/
  pages/Dashboard.tsx          beranda: profil, kutipan, tombol presensi
  pages/HistoryPage.tsx        riwayat presensi karyawan
  pages/ProfileIdentityPage.tsx  form data diri karyawan
  pages/Payslip.tsx            slip gaji karyawan (periode final)
  pages/Projects.tsx           daftar proyek (+ proyek pribadi otomatis)
  pages/ProjectBoard.tsx       board Kanban per proyek + ekspor CSV
  pages/MyKpi.tsx              isi penilaian KPI & lihat hasil sendiri
  pages/AdminDashboard.tsx     rekap semua karyawan + ekspor CSV
  pages/AdminEmployees.tsx     direktori & edit data karyawan (admin)
  pages/AdminPositions.tsx     kelola daftar jabatan
  pages/AdminPayroll.tsx       generate/adjust/finalisasi payroll
  pages/AdminKpiTemplates.tsx  kelola pertanyaan & lingkup template KPI
  pages/AdminKpiPeriods.tsx    buka/tutup periode KPI, pantau progres
  pages/AdminOffices.tsx       kelola lokasi & radius kantor
  pages/AdminSchedule.tsx      jam kerja & tarif payroll
  components/AttendanceSheet.tsx    pemilihan jenis presensi
  components/AttendanceCapture.tsx  alur foto + lokasi + catatan
  components/CameraCapture.tsx      akses kamera device
  components/TaskModal.tsx          form tambah/edit task
  lib/quotes.ts                 kutipan motivasi harian (API + fallback)
  lib/attendanceState.ts        aturan jenis presensi apa yang tersedia
  lib/employeeDirectory.ts      direktori nama karyawan lintas-modul
supabase/schema.sql             presensi, profil, payroll
supabase/schema_tasks.sql       proyek & task (Kanban)
supabase/schema_kpi.sql         jabatan, atasan langsung, KPI 360°
```

## Catatan keamanan & keterbatasan

- Jarak ke kantor dihitung **di server** (fungsi `record_attendance`), bukan
  di browser, sehingga tidak bisa diakali lewat DevTools.
- Perlindungan tambahan: trigger database mencegah karyawan mengubah
  `role`, `base_salary`, `position_id`, atau `supervisor_id` miliknya sendiri
  meski mencoba memanggil API langsung (kolom-kolom ini menentukan struktur
  organisasi yang dipakai KPI); payroll & KPI yang sudah difinalisasi/ditutup
  juga dikunci di level database, bukan cuma disembunyikan di tampilan.
- Nama & jabatan dasar semua karyawan bisa dilihat siapa saja yang login
  (lewat fungsi `get_employee_directory()`) — dibutuhkan supaya karyawan bisa
  memilih rekan di proyek dan melihat nama penilai KPI. Data sensitif (gaji,
  alamat, nomor identitas) tetap hanya bisa dilihat pemiliknya & admin.
- **Tidak** bisa dicegah sepenuhnya: perangkat yang di-root/jailbreak dengan
  aplikasi GPS-spoofing bisa memalsukan koordinat yang dikirim browser itu
  sendiri. Untuk kontrol lebih ketat, pertimbangkan verifikasi Wi-Fi kantor
  atau kode QR fisik sebagai lapisan tambahan.
- Perhitungan lembur mengasumsikan satu sesi lembur per hari per karyawan
  (satu "Lembur Masuk" dipasangkan dengan "Lembur Selesai" berikutnya dalam
  16 jam). Payroll bersifat **semi-otomatis** — selalu cek hasil generate
  sebelum finalisasi.
- Kutipan motivasi diambil dari API publik berbahasa Inggris (ZenQuotes);
  jika ingin kutipan berbahasa Indonesia atau daftar buatan sendiri, edit
  `src/lib/quotes.ts`.

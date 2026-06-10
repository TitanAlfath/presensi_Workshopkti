# Presify — Digital Event Attendance System

A modern, responsive, and real-time Digital Event Attendance Web Application. Designed for university activities, seminars, workshops, and official student organization events. 

Built with **React.js + TypeScript** on the Frontend and **Node.js + Express.js + PostgreSQL (Prisma)** on the Backend.

---

## 🚀 Fitur Premium & Utama

- **Public Landing Page**: Menampilkan informasi acara, lokasi, countdown timer, dan QR Code utama.
- **Formulir Presensi Cepat**: Pendaftaran kehadiran terpisah untuk **Peserta (Mahasiswa)** dan **Tamu Undangan**.
- **Digital QR Ticket**: Halaman sukses check-in otomatis memunculkan welcome text dan kartu tiket digital dengan QR code yang bisa diunduh langsung sebagai file gambar PNG.
- **SaaS Admin Dashboard**: Panel administrator lengkap dengan widget statistik (Total Hadir, Total Peserta, Total Tamu, Hadir Hari Ini) dan grafik interaktif (Line Chart harian, Bar Chart Prodi, Doughnut Chart Fakultas).
- **Realtime Attendance Updates**: Dashboard admin langsung terupdate otomatis saat ada peserta melakukan presensi menggunakan teknologi **Socket.IO** tanpa reload halaman.
- **Webcam QR Scanner**: Fitur untuk melakukan check-in / verifikasi tiket kehadiran dengan memindai kode QR dari HP peserta menggunakan kamera/webcam.
- **Excel Importer**: Unggah file Excel untuk mendaftarkan dan check-in data mahasiswa/peserta dalam jumlah banyak secara massal.
- **Excel & PDF Exports**: Unduh seluruh daftar log kehadiran atau saring berdasarkan kategori & tanggal ke dalam format Excel (.xlsx) dan PDF profesional.
- **Database Backup & Recovery**: Backup seluruh isi database menjadi satu file `.json` dan memulihkannya kembali (khusus Super Admin).
- **Responsive Layout**: Desain visual premium, minimalis, dan clean yang kompatibel untuk mobile maupun desktop dengan mode Gelap/Terang.

---

## 🛠️ Tech Stack

### Frontend
- **React.js (TypeScript)** + **Vite**
- **Tailwind CSS** (Styling & Animasi)
- **Framer Motion** (Animasi transisi halus)
- **React Hook Form** (Validasi input form)
- **TanStack Query** / React Query (Data Fetching & Cache)
- **Chart.js** & **React-Chartjs-2** (Visualisasi statistik)
- **Socket.IO-Client** (Komunikasi realtime)
- **html5-qrcode** (Webcam Scanner)

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **Socket.IO** (Realtime WebSockets)
- **JWT (JsonWebToken)** + **bcryptjs** (Keamanan & Autentikasi)
- **ExcelJS** & **PDFKit** (Generator file rekapitulasi)
- **Multer** (Pengunggah berkas logo dan banner event)

---

## 📂 Struktur Folder Proyek

```
presensi-diesnat/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Skema Database Prisma (PostgreSQL)
│   │   └── seed.ts         # Script data dummy untuk inisialisasi awal
│   ├── src/
│   │   ├── config/         # Konfigurasi DB Client
│   │   ├── controllers/    # Logika bisnis endpoint API
│   │   ├── middleware/     # Auth JWT & Upload Multer
│   │   ├── routes/         # Pemetaan endpoint router Express
│   │   ├── utils/          # Generator PDF, Excel, Socket, Backup
│   │   └── index.ts        # Entrypoint server Express
│   ├── .env                # Variabel lingkungan backend (Port, DB_URL, JWT)
│   ├── tsconfig.json       # Konfigurasi TypeScript backend
│   └── package.json        # Dependensi backend
│
└── frontend/
    ├── src/
    │   ├── api/            # Client Axios & interceptor token
    │   ├── components/     # Layout umum & Admin SaaS layout
    │   ├── context/        # Global Auth & Socket.IO State
    │   ├── pages/          # LandingPage, Form, SuccessPage, Admin, Scanner
    │   ├── App.tsx         # Routing & Provider setup
    │   ├── index.css       # Styling global, glassmorphism, variable dark mode
    │   └── main.tsx        # File entrypoint React
    ├── tailwind.config.js  # Kustomisasi palet warna & animasi Tailwind
    ├── postcss.config.js   # Konfigurasi compiler Tailwind
    ├── index.html          # HTML entry point (SEO optimized)
    └── package.json        # Dependensi frontend
```

---

## ⚙️ Langkah Instalasi Lokal

### Prasyarat
- **Node.js** (Versi 18 atau lebih baru)
- **PostgreSQL Database** (Lokal atau cloud seperti Supabase)

### 1. Klon & Setup Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Pasang semua dependensi:
   ```bash
   npm install
   ```
3. Salin file konfigurasi lingkungan `.env` dan sesuaikan URL koneksi database PostgreSQL Anda:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/nama_db?schema=public"
   JWT_SECRET="masukkan_key_jwt_rahasia_anda_disini"
   ```
4. Jalankan migrasi Prisma untuk membuat tabel-tabel di database:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Isi database dengan data awal / dummy (Akun Admin, Event Pertama, dan data kehadiran dummy):
   ```bash
   npm run prisma:seed
   ```
6. Jalankan backend dalam mode pengembangan:
   ```bash
   npm run dev
   ```
   *Server akan berjalan di http://localhost:5000*

### 2. Setup Frontend
1. Buka terminal baru dan masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Pasang semua dependensi:
   ```bash
   npm install
   ```
3. Jalankan frontend dalam mode pengembangan:
   ```bash
   npm run dev
   ```
   *Aplikasi akan berjalan di http://localhost:5173 (atau port lain yang ditunjuk)*

---

## 🔐 Akun Akses Default (Data Dummy)

Setelah menjalankan perintah `npm run prisma:seed` pada backend, Anda dapat masuk ke Dashboard Admin menggunakan akun berikut:
- **Email**: `admin@diesnat.com`
- **Kata Sandi**: `adminpassword123`
- **Role**: `SUPER_ADMIN`

---

## 📖 Dokumentasi Endpoint API

### 1. Autentikasi (`/api/auth`)
- **POST** `/login` - Autentikasi kredensial administrator.
- **POST** `/register` - Pendaftaran administrator baru (membutuhkan otorisasi Super Admin jika akun sudah ada).
- **GET** `/me` - Mengambil info profil administrator yang sedang aktif (Membutuhkan Header `Authorization: Bearer <JWT>`).

### 2. Event (`/api/event`)
- **GET** `/active` - Mengambil data event yang sedang aktif.
- **GET** `/list` - Mengambil daftar seluruh event (Membutuhkan Header JWT).
- **POST** `/create` - Membuat event baru (Multipart upload `logo` & `banner`, Membutuhkan Header JWT).
- **PUT** `/update/:id` - Memperbarui detail event (Multipart upload `logo` & `banner`, Membutuhkan Header JWT).
- **POST** `/set-active` - Mengubah status event aktif berdasarkan Event ID (Membutuhkan Header JWT).

### 3. Kehadiran (`/api/attendance`)
- **POST** `/check-in` - Mencatat data kehadiran peserta/tamu.
- **GET** `/stats` - Mengambil statistik kehadiran untuk dashboard (Membutuhkan Header JWT).
- **GET** `/list` - Mengambil daftar log kehadiran dengan filter & pencarian (Membutuhkan Header JWT).
- **DELETE** `/delete/:id` - Menghapus log kehadiran (Membutuhkan Header JWT).
- **GET** `/export/excel` - Mengunduh laporan rekapitulasi kehadiran berupa file Excel.
- **GET** `/export/pdf` - Mengunduh laporan rekapitulasi kehadiran berupa file PDF.
- **POST** `/import/excel` - Mengunggah file Excel berisi daftar peserta untuk didaftarkan secara massal.

### 4. Pengaturan Sistem (`/api/settings`)
- **GET** `/` - Mengambil parameter pengaturan sistem (Membutuhkan Header JWT).
- **POST** `/update` - Memperbarui konfigurasi sistem (Membutuhkan Header JWT).
- **GET** `/backup` - Mengunduh cadangan seluruh database dalam format JSON (Super Admin saja).
- **POST** `/restore` - Memulihkan database dari file cadangan JSON (Super Admin saja).

---

## 🌐 Panduan Deployment (VPS & Vercel)

### 1. Backend (Deployment ke VPS Ubuntu / Debian)
Untuk deploy backend Node.js, disarankan menggunakan **PM2** sebagai process manager agar server tetap berjalan di background.

1. Hubungkan VPS via SSH dan klon proyek.
2. Pasang Node.js, npm, dan PostgreSQL di VPS.
3. Masuk ke folder backend, buat file `.env` produksi dengan password database produksi dan JWT_SECRET yang aman.
4. Lakukan instalasi, build, dan migrasi:
   ```bash
   npm install
   npm run build
   npx prisma db push
   ```
5. Install PM2 secara global:
   ```bash
   npm install -g pm2
   ```
6. Jalankan server menggunakan PM2:
   ```bash
   pm2 start dist/index.js --name "presify-backend"
   ```
7. Aktifkan PM2 agar berjalan otomatis saat VPS direstart:
   ```bash
   pm2 startup
   pm2 save
   ```
8. Konfigurasikan **Nginx** sebagai Reverse Proxy untuk menyalurkan traffic dari port 80/443 (HTTP/HTTPS) ke port 5000 backend Node.js.

### 2. Frontend (Deployment ke Vercel)
Frontend React dapat di-deploy dengan mudah dan gratis di **Vercel**:

1. Buat akun di [Vercel](https://vercel.com).
2. Hubungkan akun GitHub/GitLab Anda yang berisi kode proyek ini.
3. Pilih menu **Add New Project**, pilih repositori proyek ini.
4. Pada bagian pengaturan proyek:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Tambahkan **Environment Variables** berikut:
   - `VITE_API_URL` : URL Nginx/VPS API backend Anda (contoh: `https://api.domainanda.com/api`)
   - `VITE_SOCKET_URL` : URL Websocket backend Anda (contoh: `https://api.domainanda.com`)
6. Klik **Deploy**. Vercel akan otomatis melakukan build dan menyediakannya dengan SSL gratis secara global.

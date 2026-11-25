# RT Net Panel

SaaS manajemen MikroTik untuk RT/RW Net & ISP kecil: panel web untuk memantau router, voucher hotspot, pelanggan PPPoE, tagihan otomatis + invoice PDF, agen/reseller, laporan, dan tiket bantuan.

## Tech Stack

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS** — frontend dan REST API dalam satu project (Route Handlers)
- **PostgreSQL + Prisma 5**
- **Auth**: JWT di cookie httpOnly, password bcrypt, verifikasi email & reset password via token (hash SHA-256), rate limiting login, middleware proteksi semua halaman panel
- **Koneksi MikroTik**: RouterOS REST API v7 (default) atau RouterOS API port 8728 — router dijangkau lewat IP tunnel OpenVPN (10.8.0.x), tanpa IP publik
- **Enkripsi**: kredensial router / API key di database dienkripsi AES-256-GCM
- **PDF**: pdfkit (invoice). **CSV**: csv-stringify (laporan)
- **WhatsApp**: Fonnte / Wablas (modul on/off di Pengaturan)
- **Payment gateway**: Midtrans / Xendit (mode sandbox, konfigurasi di Pengaturan)

## Fitur

| Modul | Keterangan |
|---|---|
| Autentikasi | register, verifikasi email, login, logout, lupa password, profil; role Admin & Agen |
| Dashboard | statistik live dari DB, grafik traffic & penjualan 7/30 hari, status router real-time |
| Router | tambah via flow OpenVPN (generate script MikroTik), batas paket ditegakkan di server |
| Monitoring | traffic per interface (polling 5s), histori traffic ke DB, DHCP leases, log router |
| Profil Paket | CRUD nama/harga/kecepatan/durasi, tipe Hotspot atau PPPoE |
| Voucher | generate massal 1–500, sinkron ke MikroTik, cetak kartu, jual, alokasi ke agen |
| PPPoE | CRUD sinkron `/ppp secret`, isolir, daftar koneksi aktif dari router |
| Tagihan | generate bulanan otomatis, tandai lunas, pengingat WA, invoice PDF, halaman bayar publik `/pay/<nomor>` |
| Agen | akun login sendiri, stok voucher terpisah, komisi otomatis, saldo, laporan |
| Laporan | penjualan voucher + tagihan per periode, export CSV/Excel |
| Tiket | nomor otomatis `IN` + 2 digit tahun + 6 digit urut (contoh `IN26000001`), thread balasan |
| Panduan | 8 topik penggunaan |
| Pengaturan | profil usaha, WhatsApp gateway, payment gateway, isolir otomatis, upgrade/downgrade paket |
| Scheduler | 6 job background (lihat bawah) |

## Paket Langganan

| Paket | Harga | Batas Router |
|---|---|---|
| Free | Rp0 | 1 |
| Basic | Rp25.000/bulan | 2 |
| Pro | Rp50.000/bulan | 5 |

Ganti paket di Pengaturan — batas router di server berubah langsung.

## Cara Install

```bash
# 1. Dependensi
npm install

# 2. Database PostgreSQL (contoh via Docker)
docker run -d --name pg-rtnet -e POSTGRES_PASSWORD=<password-anda> \
  -e POSTGRES_DB=rtnet -p 5432:5432 postgres:16-alpine

# 3. Konfigurasi environment
cp .env.example .env   # atau buat manual (lihat bawah)
openssl rand -hex 32   # untuk ENCRYPTION_KEY & JWT_SECRET

# 4. Migrasi database
npx prisma migrate dev

# 5. Jalankan aplikasi + scheduler
npm run dev        # aplikasi di http://localhost:3000
npm run scheduler  # job background (proses terpisah)
```

### Konfigurasi .env

```env
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/rtnet"
JWT_SECRET="<openssl rand -hex 32>"
ENCRYPTION_KEY="<openssl rand -hex 32>"   # AES-256-GCM utk kredensial router & API key
# Opsional:
SMTP_HOST= "host SMTP untuk email verifikasi/reset"
OPENVPN_SERVER_IP="IP publik server OpenVPN"
BASE_URL="http://localhost:3000"
```

> Semua nilai rahasia HANYA di `.env`. Kredensial router dan API key WA/payment diinput lewat UI dan disimpan terenkripsi di database — jangan pernah ditulis di kode.

## Scheduler

`npm run scheduler` menjalankan:

- **tiap 1 menit** — cek status router (online/offline, uptime, CPU, versi RouterOS)
- **tiap 5 menit** — simpan histori traffic per interface
- **tiap 10 menit** — ulangi sinkronisasi voucher yang belum masuk router (router offline saat dibuat)
- **harian 00:05** — generate tagihan bulanan pelanggan PPPoE aktif (tanggal 1)
- **harian 08:00** — kirim pengingat WhatsApp tagihan lewat jatuh tempo
- **harian 08:10** — isolir otomatis pelanggan menunggak (hanya jika diaktifkan di Pengaturan)

Untuk produksi jalankan dengan process manager, mis. `pm2 start npm --name rtnet-scheduler -- run scheduler`.

## Cara Kerja OpenVPN

1. Tambah router di panel → sistem membuat kredensial VPN unik + script konfigurasi.
2. Jalankan script itu di terminal MikroTik (Winbox → New Terminal). Script mengaktifkan service API dan membuat klien OpenVPN ke server panel.
3. Router mendapat IP tunnel 10.8.0.x → panel konek ke API router lewat IP itu, tanpa IP publik.
4. Status berubah ONLINE otomatis (cek manual atau scheduler 1 menit).

## Skema Database (16 tabel)

users, subscriptions, routers, router_logs, profiles, vouchers, pppoe_users, customers, invoices, payments, agents, agent_vouchers, tickets, ticket_replies, traffic_history, settings — migrasi di `prisma/migrations/`. Semua tabel terkait router punya `router_id`; semua data transaksi punya `user_id` pemilik akun (isolasi antar akun ditegakkan di setiap endpoint).

## Keamanan

- Password di-hash bcrypt (cost 12); kredensial router & API key dienkripsi AES-256-GCM
- Setiap endpoint memeriksa sesi + kepemilikan data (`userId`), bukan hanya ID
- Validasi input server-side dengan zod di semua endpoint tulis
- Token verifikasi/reset disimpan sebagai hash SHA-256 (bukan plaintext)
- Rate limiting login (5/menit/IP) dan forgot-password (3/menit/IP)
- API key & token tidak pernah dikirim balik ke client (hanya indikator `keySet`)
- Login error identik untuk email/salah password (anti user-enumeration)

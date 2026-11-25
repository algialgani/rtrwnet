# Panduan Deploy RT Net Panel

Panduan lengkap deploy ke **VPS** (produksi) dan **lokal** (tes/dev).

---

## A. Deploy ke VPS (Produksi)

Kebutuhan: VPS 1GB RAM cukup (DigitalOcean/Vultr/Racknerd dll), Ubuntu 22.04/24.04, dan opsional domain.

### Langkah 1 — Setup dasar

```bash
# Update & install dependensi
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx git
sudo npm i -g pm2
```

### Langkah 2 — Database PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE rtnet;
CREATE USER rtnet WITH PASSWORD 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON DATABASE rtnet TO rtnet;
SQL
```

### Langkah 3 — Clone & konfigurasi aplikasi

```bash
cd /opt
sudo git clone https://github.com/algialgani/rtrwnet.git
sudo chown -R $USER:$USER /opt/rtrwnet
cd /opt/rtrwnet

npm install

# Buat .env (JANGAN pakai .env.example langsung)
openssl rand -hex 32   # → isi ke JWT_SECRET
openssl rand -hex 32   # → isi ke ENCRYPTION_KEY
nano .env
```

Isi `.env`:

```env
DATABASE_URL="postgresql://rtnet:GANTI_PASSWORD_KUAT@localhost:5432/rtnet"
JWT_SECRET="<hasil openssl rand -hex 32>"
ENCRYPTION_KEY="<hasil openssl rand -hex 32>"
BASE_URL="https://domainmu.com"     # atau http://IP-VPS kalau tanpa domain
# SMTP (opsional, untuk verifikasi email & reset password):
SMTP_HOST="smtp.gmail.com"
SMTP_USER="emailkamu@gmail.com"
SMTP_PASS="app-password-gmail"
# OpenVPN (opsional, untuk koneksi router MikroTik):
OPENVPN_SERVER_IP="IP_PUBLIK_VPS"
```

### Langkah 4 — Migrasi & build

```bash
npx prisma migrate deploy   # gunakan deploy, BUKAN migrate dev, di produksi
npm run build
```

### Langkah 5 — Jalankan aplikasi dengan pm2

```bash
pm2 start npm --name rtnet-web -- start
pm2 start npm --name rtnet-scheduler -- run scheduler
pm2 save
pm2 startup   # ikuti perintah yang muncul supaya auto-start saat reboot
```

Cek: `pm2 status` → dua proses `online`. Aplikasi jalan di port 3000.

### Langkah 6 — Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/rtrwnet
```

Isi:

```nginx
server {
    listen 80;
    server_name domainmu.com;   # atau _ kalau tanpa domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rtrwnet /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Langkah 7 — HTTPS (wajib jika pakai WhatsApp gateway)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainmu.com
```

HTTPS wajib karena Fonnte/Wablas dan Midtrans/Xendit mengirim data lewat request ke server kamu (webhook/callback butuh URL https).

### Langkah 8 — OpenVPN server (agar MikroTik bisa dikonekkan)

Panel menghubungi router lewat tunnel OpenVPN. Install server OpenVPN di VPS yang sama, contoh cepat pakai script:

```bash
curl -O https://raw.githubusercontent.com/angristan/openvpn-install/master/openvpn-install.sh
chmod +x openvpn-install.sh
sudo ./openvpn-install.sh
```

- Pilih protokol UDP 1194
- Buat client credentials untuk panel (atau biarkan panel yang membuat user tunnel per router saat "Tambah Router")
- Set `OPENVPN_SERVER_IP` di `.env` = IP publik VPS, lalu `pm2 restart rtnet-web`

Setelah itu, di panel: **Router → Tambah Router** → jalankan script yang digenerate di terminal MikroTik → status berubah **ONLINE**.

### Langkah 9 — Firewall

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 1194/udp   # OpenVPN
sudo ufw enable
```

Jangan buka port 3000 & 5432 ke publik.

### Langkah 10 — Backup otomatis

```bash
sudo crontab -e
# tambahkan (backup tiap jam 3 pagi, simpan 30 hari):
0 3 * * * sudo -u postgres pg_dump rtnet | gzip > /root/backup/rtnet-$(date +\%F).sql.gz
```

### Update kode di VPS

```bash
cd /opt/rtrwnet
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart rtnet-web rtnet-scheduler
```

---

## B. Jalankan di Lokal (Tes/Dev)

### 1. Clone & dependensi

```bash
git clone https://github.com/algialgani/rtrwnet.git
cd rtrwnet
npm install
```

### 2. Database via Docker

```bash
docker run -d --name rtnet-db \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=rtnet \
  -p 5432:5432 postgres:16-alpine
```

### 3. Konfigurasi & migrasi

```bash
cp .env.example .env
# edit .env: DATABASE_URL=postgresql://postgres:devpass@localhost:5432/rtnet
# JWT_SECRET & ENCRYPTION_KEY: openssl rand -hex 32
npx prisma migrate dev
```

### 4. Jalankan

```bash
npm run dev          # terminal 1 → http://localhost:3000
npm run scheduler    # terminal 2 → job background
```

Supaya bisa diakses dari HP/PC lain dalam WiFi yang sama:

```bash
npm run dev -- -H 0.0.0.0
# buka http://<IP-komputer>:3000 (cek IP dengan: hostname -I atau ipconfig)
```

> Di lokal, verifikasi email bisa dilewati dengan menandai user terverifikasi langsung di database (dev saja), atau konfigurasi SMTP Gmail (App Password).

---

## C. Daftar ceklis sebelum go-live

- [ ] `.env` berisi secrets yang berbeda dari contoh (JWT_SECRET & ENCRYPTION_KEY unik)
- [ ] `npx prisma migrate deploy` sukses
- [ ] `pm2 status` → rtnet-web & rtnet-scheduler online
- [ ] HTTPS aktif (certbot) jika pakai WhatsApp gateway
- [ ] UFW aktif; port 3000/5432 tidak terbuka ke publik
- [ ] Login pertama berhasil, user terverifikasi
- [ ] Tambah router → status ONLINE (butuh OpenVPN server + MikroTik asli)
- [ ] Backup cron berjalan
- [ ] Token GitHub yang dipakai push sudah di-revoke

---

## D. Troubleshooting

| Masalah | Cek |
|---|---|
| `pm2 status` error / restart terus | `pm2 logs rtnet-web --lines 50` — biasanya `.env` salah (DATABASE_URL / ENCRYPTION_KEY) |
| Halaman 502 dari nginx | Aplikasi belum jalan (`pm2 status`) atau port 3000 tidak match |
| Router tetap PENDING | Script belum dijalankan di terminal MikroTik, atau OpenVPN server belum terpasang / `OPENVPN_SERVER_IP` salah |
| Voucher/PPPoE tidak muncul di MikroTik | Router offline saat dibuat → scheduler akan retry otomatis saat router ONLINE; cek `pm2 logs rtnet-scheduler` |
| WA tidak terkirim | Pengaturan → WhatsApp Gateway: provider + API key terisi & Aktif dicentang; kredensial disimpan terenkripsi |
| Email verifikasi tidak terkirim | SMTP belum dikonfigurasi di `.env` (tanpa SMTP, token tercetak di log server: `pm2 logs rtnet-web`) |

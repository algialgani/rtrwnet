// Panduan penggunaan panel — 8+ topik, konten statis server-rendered
const TOPICS = [
  {
    title: "1. Cara Tambah Router",
    body: `Buka menu Router → + Tambah Router. Isi nama router, user API MikroTik dan password-nya, lalu klik "Generate Script Konfigurasi".
Sistem akan membuat script yang harus dijalankan di terminal MikroTik (Winbox → New Terminal atau SSH). Script itu mengaktifkan service API dan membuat klien OpenVPN ke server panel — tanpa perlu IP publik.
Setelah script dijalankan dan klien OpenVPN "connected", klik "Cek Status". Router berubah ONLINE otomatis (scheduler juga mengecek tiap 1 menit).`,
  },
  {
    title: "2. Cara Buat Profil Paket Internet",
    body: `Menu Paket Internet → isi nama paket, harga, kecepatan download/upload, durasi (jam/hari/bulan), dan tipe (Hotspot untuk voucher, PPPoE untuk pelanggan tetap).
Profil ini yang nanti dipakai saat generate voucher dan menambah pelanggan PPPoE.`,
  },
  {
    title: "3. Cara Buat & Cetak Voucher Hotspot",
    body: `Menu Voucher → + Generate Voucher. Pilih router dan profil hotspot, isi jumlah (1–500) dan panjang kode.
Kode voucher dibuat di panel DAN user hotspot-nya langsung dibuat di MikroTik. Klik "Cetak Voucher" untuk halaman kartu siap print (5 kartu per baris, ukuran pas).
Untuk menjual, klik "Jual" pada voucher yang masih belum terjual, isi nama pembeli dan harga aktual.`,
  },
  {
    title: "4. Cara Setting Pelanggan PPPoE",
    body: `Menu PPPoE → isi nama pelanggan, nomor WhatsApp, username & password PPPoE, lalu pilih profil PPPoE.
Secret langsung dibuat di /ppp secret router. Tombol "Isolir" men-disable secret di router (dan "Aktifkan" mengembalikannya).
Daftar "Koneksi Aktif" di bawah membaca /ppp active langsung dari router: username, IP, dan uptime sesi.`,
  },
  {
    title: "5. Cara Kelola Tagihan",
    body: `Menu Tagihan → "Generate Tagihan Bulanan" membuat tagihan untuk semua pelanggan PPPoE aktif (jatuh tempo +7 hari). Scheduler juga menjalankan ini otomatis tiap tanggal 1.
Tombol "WA" mengirim pengingat via WhatsApp berisi nomor invoice dan link bayar. Tombol "Lunas" mencatat pembayaran. "PDF" mengunduh invoice siap kirim.
Pelanggan membayar lewat link /pay/<nomor-invoice> yang berlaku tanpa login.`,
  },
  {
    title: "6. Cara Tambah Agen / Reseller",
    body: `Menu Agen → + Tambah Agen. Isi nama, kontak, persentase komisi, dan (opsional) email + password untuk akun login agen.
Generate voucher dengan pilihan "alokasi agen" — agen hanya bisa melihat dan menjual voucher miliknya setelah login.
Tombol "Saldo" untuk tambah/kurang saldo agen; komisi masuk otomatis tiap voucher terjual. Tombol "Laporan" menampilkan penjualan agen.`,
  },
  {
    title: "7. Cara Cetak Voucher (layout kartu)",
    body: `Di daftar voucher, centang voucher tertentu lalu klik "Cetak N voucher terpilih" — atau cetak semua sesuai filter aktif.
Halaman cetak membuka dialog print browser otomatis. Saran: kertas A4, margin default, skala 100%.`,
  },
  {
    title: "8. Troubleshooting Koneksi Router",
    body: `Router PENDING terus? Pastikan script sudah dijalankan di terminal MikroTik dan /interface ovpn-client print status menunjukkan "connected".
Router OFFLINE padahal sebelumnya online? Cek kabel/wan router dan status OpenVPN server panel. Panel menandai offline setelah gagal konek API.
Gagal sync voucher/PPPoE? Perubahan disimpan di panel dan diulang otomatis oleh job sinkronisasi saat router kembali online.
Pakai RouterOS v6? Uncheck "Pakai REST API RouterOS v7" saat menambah router (mode API port 8728).`,
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Panduan</h1>
      <p className="mt-1 text-sm text-slate-400">Cara memakai RT Net Panel dari nol sampai jalan.</p>
      <div className="mt-6 space-y-4">
        {TOPICS.map((t) => (
          <details key={t.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <summary className="cursor-pointer font-semibold text-cyan-400">{t.title}</summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{t.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

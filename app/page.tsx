import Link from "next/link";

// ============ Landing page publik ============
const FEATURES = [
  { icon: "📡", title: "Manajemen Multi-Router", desc: "Kelola banyak router MikroTik dari satu panel, lengkap dengan status online/offline, CPU load, dan versi RouterOS." },
  { icon: "🎟️", title: "Voucher Hotspot", desc: "Generate voucher massal (1–500), cetak kartu voucher siap print, dan jual ke pelanggan atau agen." },
  { icon: "🔌", title: "Pelanggan PPPoE", desc: "CRUD pelanggan PPPoE yang tersinkron langsung ke /ppp secret di router, plus daftar koneksi aktif." },
  { icon: "🧾", title: "Tagihan & Invoice Otomatis", desc: "Tagihan bulanan dibuat otomatis, pengingat via WhatsApp, invoice PDF siap unduh, pembayaran via gateway." },
  { icon: "📊", title: "Monitoring Traffic", desc: "Grafik traffic per interface dengan histori tersimpan di database, bisa dilihat per jam/hari." },
  { icon: "👥", title: "Agen & Reseller", desc: "Kelola agen dengan saldo/komisi; agen menjual voucher dari stok yang dialokasikan dan lihat laporannya sendiri." },
  { icon: "🤖", title: "Notifikasi WhatsApp", desc: "Kirim voucher dan pengingat tagihan otomatis via Fonnte/Wablas — aktif/nonaktif dari pengaturan." },
  { icon: "🔐", title: "Aman & Terisolasi", desc: "Kredensial terenkripsi, data antar akun terisolasi, koneksi router via OpenVPN tanpa IP publik." },
];

const PLANS = [
  { name: "Free", price: "Rp0", routers: "1 router", cta: "Mulai Gratis" },
  { name: "Basic", price: "Rp25.000/bln", routers: "2 router", cta: "Pilih Basic" },
  { name: "Pro", price: "Rp50.000/bln", routers: "5 router", cta: "Pilih Pro" },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-cyan-400">◆</span> RT Net Panel
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <a href="#fitur" className="hover:text-cyan-400">Fitur</a>
            <a href="#harga" className="hover:text-cyan-400">Harga</a>
            <a href="#kontak" className="hover:text-cyan-400">Kontak</a>
            <Link href="/login" className="rounded bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400">
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Kelola WiFi RT/RW Net Anda <span className="text-cyan-400">dari Satu Panel</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-400">
          Pantau router MikroTik, buat voucher hotspot, kelola pelanggan PPPoE,
          tagih pelanggan, dan kelola agen/reseller — semuanya otomatis.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register" className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400">
            Daftar Gratis
          </Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-6 py-3 font-semibold hover:border-cyan-500">
            Buka Panel
          </Link>
        </div>
        {/* Mockup dashboard sederhana */}
        <div className="mx-auto mt-14 max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-6 text-left shadow-2xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[["Router Online", "3"], ["Pelanggan Aktif", "128"], ["Voucher Terjual", "42"], ["Tagihan Belum Bayar", "7"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">{k}</p>
                <p className="text-2xl font-bold text-cyan-400">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-40 rounded-lg bg-slate-800 flex items-end gap-1 p-3">
            {[40, 55, 35, 70, 60, 80, 50, 65, 75, 45, 85, 60].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-cyan-600/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="border-t border-slate-800 bg-slate-900/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Fitur Utama</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Link key={f.title} href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold">Pilih Paket</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <div key={p.name} className={`rounded-xl border p-6 ${i === 2 ? "border-cyan-500 bg-cyan-950/30" : "border-slate-800 bg-slate-900"}`}>
                <h3 className="text-lg font-bold text-cyan-400">{p.name}</h3>
                <p className="mt-2 text-3xl font-extrabold">{p.price}</p>
                <p className="mt-1 text-sm text-slate-400">{p.routers}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li>✓ Voucher hotspot & PPPoE</li>
                  <li>✓ Tagihan otomatis + WhatsApp</li>
                  <li>✓ Laporan penjualan & export</li>
                  <li>✓ Agen/reseller {i >= 1 ? "✓" : "—"}</li>
                </ul>
                <Link href="/register" className="mt-6 block rounded-lg bg-cyan-500 py-2 text-center font-semibold text-slate-950 hover:bg-cyan-400">
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="border-t border-slate-800 bg-slate-900/50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Hubungi Kami</h2>
          <p className="mt-3 text-slate-400">
            Ada pertanyaan sebelum berlangganan? Email: <span className="text-cyan-400">support@rtnetpanel.id</span> · WhatsApp: <span className="text-cyan-400">0812-0000-0000</span>
          </p>
          <Link href="/tickets" className="mt-6 inline-block rounded-lg border border-cyan-500 px-6 py-2 font-semibold text-cyan-400 hover:bg-cyan-950">
            Kirim Tiket Bantuan
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} RT Net Panel — Panel manajemen MikroTik untuk RT/RW Net & ISP kecil.
      </footer>
    </main>
  );
}

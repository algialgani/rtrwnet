import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

// Layout panel: sidebar navigasi + proteksi (middleware juga melindungi route ini)
const NAV = [
  ["/dashboard", "📊 Dashboard"],
  ["/routers", "📡 Router"],
  ["/monitoring", "📈 Monitoring"],
  ["/profiles", "⚙️ Paket Internet"],
  ["/vouchers", "🎟️ Voucher"],
  ["/pppoe", "🔌 PPPoE"],
  ["/invoices", "🧾 Tagihan"],
  ["/agents", "👥 Agen"],
  ["/reports", "📑 Laporan"],
  ["/tickets", "🎫 Tiket"],
  ["/guide", "📖 Panduan"],
  ["/settings", "🛠️ Pengaturan"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-slate-900 md:block print:hidden">
        <div className="p-4 font-bold text-lg"><span className="text-cyan-400">◆</span> RT Net Panel</div>
        <nav className="space-y-1 px-2 pb-6 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded px-3 py-2 hover:bg-slate-800">{label}</Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <p className="text-sm text-slate-400">
            {user?.emailVerifiedAt ? "" : "⚠️ Email belum diverifikasi"} 
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/profile" className="hover:text-cyan-400">{user?.name}</Link>
            <span className="rounded bg-slate-800 px-2 py-1 text-xs">{user?.subscription?.plan}</span>
            <LogoutButton />
          </div>
        </header>
        {/* Nav mobile */}
        <nav className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs md:hidden">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded bg-slate-800 px-2 py-1">{label}</Link>
          ))}
        </nav>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

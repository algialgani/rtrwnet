/**
 * Scheduler RT Net Panel — dijalankan berdampingan dengan Next.js (`npm run scheduler`).
 * Jobs:
 *  - tiap 60 detik : cek status router (online/offline, uptime, CPU, versi)
 *  - tiap 5 menit  : simpan histori traffic per interface router online
 *  - harian 00:05  : generate tagihan bulanan pelanggan PPPoE aktif (tanggal 1)
 *  - harian 08:00  : pengingat WhatsApp tagihan lewat jatuh tempo
 *  - harian 08:10  : isolir otomatis menunggak (jika autoIsolate aktif)
 *  - tiap 10 menit : ulangi sinkronisasi voucher yang belum tersimpan di router
 */
import { prisma } from "../lib/db";
import { checkRouterStatus, connectRouter } from "../lib/mikrotik";
import { addHotspotUser, ensureHotspotProfile } from "../lib/mikrotik-sync";
import { sendWa } from "../lib/wa";

const TAG = "[scheduler]";
const log = (...a: unknown[]) => console.log(new Date().toISOString(), TAG, ...a);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ---------- Job 1: status router tiap 1 menit ----------
async function checkRouters() {
  const routers = await prisma.router.findMany({ select: { id: true } });
  let online = 0;
  for (const r of routers) {
    const st = await checkRouterStatus(r.id); // fungsi ini sudah update DB + set OFFLINE saat gagal
    if (st === "ONLINE") online++;
  }
  log(`cek router: ${routers.length} router, ${online} online`);
}

// ---------- Job 2: histori traffic tiap 5 menit ----------
async function collectTraffic() {
  const routers = await prisma.router.findMany({ where: { status: "ONLINE" } });
  for (const r of routers) {
    try {
      const { client } = await connectRouter(r.id);
      const ifs = (await client.rest("/interface")) as Array<{ name: string; "rx-byte": string; "tx-byte": string }>;
      const now = Date.now();
      for (const i of ifs) {
        await prisma.trafficHistory.create({
          data: {
            routerId: r.id,
            interface: i.name,
            rxBytes: BigInt(i["rx-byte"] || 0),
            txBytes: BigInt(i["tx-byte"] || 0),
            rxSpeed: 0, // kecepatan dihitung di UI dari selisih antar sample
            txSpeed: 0,
            sampledAt: new Date(now),
          },
        });
      }
      client.close();
    } catch (e) {
      log("traffic gagal", r.name, (e as Error).message);
    }
  }
  if (routers.length) log(`histori traffic: ${routers.length} router`);
}

// ---------- Job 3: tagihan bulanan (tanggal 1, jam 00:05) ----------
async function generateMonthlyInvoices() {
  const now = new Date();
  if (now.getDate() !== 1) return;
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const dueDate = new Date(periodEnd.getTime() + 7 * 86400e3);
  const actives = await prisma.pppoeUser.findMany({ where: { status: "ACTIVE" }, include: { profile: true } });
  let made = 0;
  for (const p of actives) {
    const dup = await prisma.invoice.findFirst({ where: { userId: p.userId, pppoeUserId: p.id, periodStart } });
    if (dup) continue;
    const seq = (await prisma.invoice.count({ where: { userId: p.userId, number: { startsWith: `INV-${period}` } } })) + 1;
    await prisma.invoice.create({
      data: {
        userId: p.userId,
        pppoeUserId: p.id,
        customerId: p.customerId,
        number: `INV-${period}-${String(seq).padStart(4, "0")}`,
        amount: p.profile.price,
        periodStart, periodEnd, dueDate,
        status: "UNPAID",
      },
    });
    made++;
  }
  log(`tagihan bulanan ${period}: ${made} dibuat`);
}

// ---------- Job 4: pengingat WhatsApp jam 08:00 ----------
async function sendReminders() {
  const overdue = await prisma.invoice.findMany({
    where: { status: "UNPAID", dueDate: { lt: new Date() } },
    include: { user: { include: { settings: true } }, pppoeUser: { include: { customer: true } } },
  });
  let sent = 0;
  for (const inv of overdue) {
    const s = inv.user.settings;
    const phone = inv.pppoeUser?.customer?.phone;
    if (!s?.waEnabled || !phone) continue;
    const msg = `Yth ${inv.pppoeUser!.customer!.name}, tagihan ${inv.number} sebesar Rp${inv.amount.toLocaleString("id-ID")} sudah lewat jatuh tempo (${inv.dueDate.toLocaleDateString("id-ID")}). Bayar di ${BASE_URL}/pay/${inv.number}`;
    const r = await sendWa(inv.userId, phone, msg);
    if (r.sent) sent++;
    else log("reminder gagal", inv.number, r.error);
  }
  if (sent) log(`reminder terkirim: ${sent}`);
}

// ---------- Job 5: isolir otomatis menunggak jam 08:10 ----------
async function autoIsolate() {
  const users = await prisma.user.findMany({ include: { settings: true } });
  for (const u of users) {
    if (!u.settings?.autoIsolate) continue;
    const overdue = await prisma.pppoeUser.findMany({
      where: {
        userId: u.id, status: "ACTIVE",
        invoices: { some: { status: "UNPAID", dueDate: { lt: new Date() } } },
      },
    });
    for (const p of overdue) {
      await prisma.pppoeUser.update({ where: { id: p.id }, data: { status: "SUSPENDED", isolated: true } });
      log(`isolir: ${p.username} (user ${u.email})`);
    }
    if (overdue.length) log(`isolir otomatis: ${overdue.length} pelanggan user ${u.email}`);
  }
}

// ---------- Job 6: ulangi sync voucher yang belum masuk router (tiap 10 menit) ----------
async function resyncVouchers() {
  const pending = await prisma.voucher.findMany({
    where: { syncedAt: null, status: { in: ["UNSOLD", "SOLD", "ACTIVE"] } },
    include: { profile: true, router: true },
    take: 200,
  });
  let ok = 0;
  for (const v of pending) {
    if (v.router.status !== "ONLINE") continue;
    try {
      await ensureHotspotProfile(v.routerId, v.profileId);
      await addHotspotUser(v.routerId, v.code, v.profile.name, v.profile.durationValue, v.profile.durationUnit);
      await prisma.voucher.update({ where: { id: v.id }, data: { syncedAt: new Date() } });
      ok++;
    } catch (e) {
      log("resync gagal", v.code, (e as Error).message);
    }
  }
  if (pending.length) log(`resync voucher: ${ok}/${pending.length}`);
}

function every(ms: number, fn: () => Promise<void>) {
  const run = async () => { try { await fn(); } catch (e) { log("job error:", (e as Error).message); } };
  run();
  return setInterval(run, ms);
}

function dailyAt(hour: number, minute: number, fn: () => Promise<void>) {
  setInterval(() => {
    const n = new Date();
    if (n.getHours() === hour && n.getMinutes() === minute)
      fn().catch((e) => log("daily job error:", (e as Error).message));
  }, 60_000);
}

log("scheduler start");
every(60_000, checkRouters);
every(5 * 60_000, collectTraffic);
every(10 * 60_000, resyncVouchers);
dailyAt(0, 5, generateMonthlyInvoices);
dailyAt(8, 0, sendReminders);
dailyAt(8, 10, autoIsolate);

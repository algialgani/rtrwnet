import { prisma } from "./db";
import { connectRouter } from "./mikrotik";

// ============ Sinkronisasi voucher hotspot & PPPoE ke MikroTik ============
// Semua perubahan user di panel DIKIRIM ke router via API — bukan hanya
// disimpan di database lokal. Kalau router sedang offline, perubahan
// ditandai belum sinkron (syncedAt=null) dan diulang oleh job harian.

function durationToSeconds(value: number, unit: string): number {
  if (unit === "HOURS") return value * 3600;
  if (unit === "MONTHS") return value * 30 * 86400;
  return value * 86400;
}

// Pastikan /ip/hotspot/user/profile ada di router (create kalau belum),
// dengan rate-limit dari kecepatan profil panel.
export async function ensureHotspotProfile(routerId: string, profileId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) throw new Error("Profil tidak ditemukan");
  const { client } = await connectRouter(routerId);
  try {
    const existing = await client.rest("/ip/hotspot/user/profile");
    const found = Array.isArray(existing)
      ? existing.find((p: any) => p.name === profile.name)
      : null;
    if (!found) {
      await client.restWrite("/ip/hotspot/user/profile", "POST", {
        name: profile.name,
        "rate-limit": `${profile.upSpeed}/${profile.downSpeed}`,
      });
    }
  } finally {
    client.close();
  }
}

// Buat satu user hotspot di router (kode voucher = username & password)
export async function addHotspotUser(
  routerId: string,
  code: string,
  profileName: string,
  durationValue: number,
  durationUnit: string
) {
  const { client } = await connectRouter(routerId);
  try {
    await client.restWrite("/ip/hotspot/user", "POST", {
      name: code,
      password: code,
      profile: profileName,
      "limit-uptime": `${durationToSeconds(durationValue, durationUnit)}s`,
      comment: "RTNetPanel",
    });
  } finally {
    client.close();
  }
}

// Hapus user hotspot di router (saat voucher dihapus dari panel)
export async function removeHotspotUser(routerId: string, code: string) {
  const { client } = await connectRouter(routerId);
  try {
    const users = await client.rest("/ip/hotspot/user");
    const found = Array.isArray(users) ? users.find((u: any) => u.name === code) : null;
    if (found?.id)
      await client.restWrite(`/ip/hotspot/user/${found.id}`, "DELETE");
  } finally {
    client.close();
  }
}

// Buat secret PPPoE di router: /ppp/secret
export async function addPppoeSecret(
  routerId: string,
  username: string,
  password: string,
  profileName: string,
  comment: string
) {
  const { client } = await connectRouter(routerId);
  try {
    await client.restWrite("/ppp/secret", "POST", {
      name: username,
      password,
      service: "pppoe",
      profile: profileName,
      comment,
    });
  } finally {
    client.close();
  }
}

// Hapus secret PPPoE di router
export async function removePppoeSecret(routerId: string, username: string) {
  const { client } = await connectRouter(routerId);
  try {
    const secrets = await client.rest("/ppp/secret");
    const found = Array.isArray(secrets) ? secrets.find((s: any) => s.name === username) : null;
    if (found?.id)
      await client.restWrite(`/ppp/secret/${found.id}`, "DELETE");
  } finally {
    client.close();
  }
}

// Daftar koneksi PPPoE aktif: /ppp/active (service=pppoe)
export async function listPppoeActive(routerId: string) {
  const { client } = await connectRouter(routerId);
  try {
    const act = await client.rest("/ppp/active");
    return Array.isArray(act) ? act.filter((a: any) => a.service === "pppoe") : [];
  } finally {
    client.close();
  }
}

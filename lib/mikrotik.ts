import { RouterOSAPI } from "routeros-api";
import { prisma } from "./db";
import { decrypt } from "./crypto";
import { RouterStatus } from "@prisma/client";

// ============ Klien MikroTik ============
// Dua jalur koneksi:
// 1) REST API RouterOS v7  (http://<vpnIp>/rest, auth basic)  — default
// 2) RouterOS API (port 8728) via library routeros-api        — fallback/legacy
// Router selalu dijangkau lewat IP tunnel OpenVPN (vpnIp), bukan IP publik.

export interface MtClient {
  // GET generic path, mis. "/rest/system/resource"
  rest(path: string): Promise<any>;
  // POST/PUT/DELETE generic untuk REST v7 (create/update/hapus resource)
  restWrite(path: string, method: "POST" | "PUT" | "DELETE", body?: any): Promise<any>;
  // menjalankan command via API binary (path seperti "/ip/hotspot/user" + params array)
  api(cmd: string, params?: string[]): Promise<any>;
  close(): void;
}

export async function connectRouter(routerId: string): Promise<{
  client: MtClient;
  router: { id: string; name: string; vpnIp: string | null };
}> {
  const r = await prisma.router.findUnique({ where: { id: routerId } });
  if (!r) throw new Error("Router tidak ditemukan");
  if (!r.vpnIp) throw new Error("Router belum punya IP VPN (script belum dijalankan?)");
  const pass = r.apiPassEnc ? decrypt(r.apiPassEnc) : "";

  if (r.useRest) {
    // REST v7: kredensial via Authorization basic; koneksi dibuat per-request
    const auth = Buffer.from(`${r.apiUser ?? "admin"}:${pass}`).toString("base64");
    const base = `http://${r.vpnIp}:${r.apiPort === 8729 ? 80 : 80}/rest`;
    const client: MtClient = {
      async rest(path) {
        const res = await fetch(`${base}${path}`, {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`REST ${path}: HTTP ${res.status}`);
        return res.json();
      },
      async restWrite(path, method, body) {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`REST ${method} ${path}: HTTP ${res.status}`);
        return res.json().catch(() => null);
      },
      async api() {
        throw new Error("Mode REST tidak mendukung command binary");
      },
      close() {},
    };
    return { client, router: r };
  }

  // RouterOS API (8728)
  const conn = new RouterOSAPI({
    host: r.vpnIp,
    user: r.apiUser ?? "admin",
    password: pass,
    port: r.apiPort,
    timeout: 8,
  });
  await conn.connect();
  const client: MtClient = {
    async rest() {
      throw new Error("Mode API tidak mendukung REST");
    },
    async restWrite() {
      throw new Error("Mode API tidak mendukung REST");
    },
    async api(cmd: string, params?: string[]) {
      const [path, action] = cmd.split(".");
      const res = await conn.write(`/${path}/${action ?? ""}`, params ?? []);
      return res;
    },
    close() {
      conn.close();
    },
  };
  return { client, router: r };
}

// Ping cepat: baca /system/resource; update status router di DB
export async function checkRouterStatus(routerId: string): Promise<RouterStatus> {
  try {
    const { client } = await connectRouter(routerId);
    const res = await client.rest("/system/resource");
    client.close();
    const data = Array.isArray(res) ? res[0] : res;
    await prisma.router.update({
      where: { id: routerId },
      data: {
        status: "ONLINE",
        lastSeenAt: new Date(),
        uptime: data?.uptime,
        cpuLoad: data?.["cpu-load"] != null ? Number(data["cpu-load"]) : null,
        rosVersion: data?.version,
      },
    });
    return "ONLINE";
  } catch (e) {
    await prisma.router.update({
      where: { id: routerId },
      data: { status: "OFFLINE" },
    }).catch(() => {});
    return "OFFLINE";
  }
}

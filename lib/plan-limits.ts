// Batas router per paket — DITEGAKKAN DI SERVER (dipakai API, bukan hanya UI)
export const PLAN_LIMITS: Record<string, number> = {
  FREE: 1,
  BASIC: 2,
  PRO: 5,
};

export const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  BASIC: 25000,
  PRO: 50000,
};

export function maxRouters(plan: string): number {
  return PLAN_LIMITS[plan] ?? 1;
}

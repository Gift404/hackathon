import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
} from "./crypto";
import { centsToRands } from "./money";

export const DEMO_TRADER_PHONE = "0821234567";

export function sessionCookieAttributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  };
}

export async function createSession(traderId: string) {
  const token = createSessionToken(traderId, SESSION_MAX_AGE_SEC);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieAttributes());
}

/** Seeded pitch trader, or any active trader if the seed phone is missing. */
export async function findDemoTrader() {
  return (
    (await prisma.trader.findUnique({
      where: { phone: DEMO_TRADER_PHONE },
    })) ?? (await prisma.trader.findFirst({ where: { active: true } }))
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionTraderId(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(raw);
  return payload?.sub ?? null;
}

export async function getCurrentTrader() {
  const traderId = await getSessionTraderId();
  if (!traderId) return null;
  return prisma.trader.findUnique({ where: { id: traderId } });
}

export async function requireTrader() {
  const trader = await getCurrentTrader();
  if (!trader) {
    throw new Error("UNAUTHORIZED");
  }
  return trader;
}

/** Public trader shape — money as rands for the UI; mask SA ID. */
export function publicTrader(trader: {
  id: string;
  phone: string;
  idNumber: string;
  fullName: string;
  businessName: string | null;
  tier: number;
  dailyLimitCents: number;
  totalVerifiedCents: number;
  livenessVerified: boolean;
  idVerified: boolean;
  active: boolean;
  createdAt: Date;
}, opts?: { maskId?: boolean }) {
  const maskId = opts?.maskId !== false;
  return {
    id: trader.id,
    phone: trader.phone,
    idNumber: maskId
      ? `${"*".repeat(9)}${trader.idNumber.slice(-4)}`
      : trader.idNumber,
    fullName: trader.fullName,
    businessName: trader.businessName,
    tier: trader.tier,
    dailyLimit: centsToRands(trader.dailyLimitCents),
    totalVerified: centsToRands(trader.totalVerifiedCents),
    livenessVerified: trader.livenessVerified,
    idVerified: trader.idVerified,
    active: trader.active,
    createdAt: trader.createdAt.toISOString(),
  };
}

export function publicTransaction(tx: {
  id: string;
  traderId: string;
  amountCents: number;
  currency: string;
  customerPhone: string | null;
  customerName: string | null;
  method: string;
  status: string;
  reference: string;
  stitchRef: string | null;
  createdAt: Date;
  settledAt: Date | null;
}) {
  return {
    id: tx.id,
    traderId: tx.traderId,
    amount: centsToRands(tx.amountCents),
    currency: tx.currency,
    customerPhone: tx.customerPhone,
    customerName: tx.customerName,
    method: tx.method,
    status: tx.status,
    reference: tx.reference,
    stitchRef: tx.stitchRef,
    createdAt: tx.createdAt.toISOString(),
    settledAt: tx.settledAt?.toISOString() ?? null,
  };
}

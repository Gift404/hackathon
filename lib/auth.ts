import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "imali_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(traderId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, traderId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionTraderId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
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

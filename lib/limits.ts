import { prisma } from "./prisma";
import { startOfDay } from "date-fns";

/** Sum of today's COMPLETED + PENDING payment amounts (cents) for daily limit. */
export async function getTodaySpendCents(traderId: string): Promise<number> {
  const todayStart = startOfDay(new Date());
  const rows = await prisma.transaction.findMany({
    where: {
      traderId,
      createdAt: { gte: todayStart },
      status: { in: ["COMPLETED", "PENDING"] },
    },
    select: { amountCents: true },
  });
  return rows.reduce((s, t) => s + t.amountCents, 0);
}

export async function assertWithinDailyLimit(params: {
  traderId: string;
  dailyLimitCents: number;
  amountCents: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const spent = await getTodaySpendCents(params.traderId);
  if (spent + params.amountCents > params.dailyLimitCents) {
    const remaining = Math.max(0, params.dailyLimitCents - spent);
    return {
      ok: false,
      message: `Daily limit exceeded. Remaining today: R${(remaining / 100).toFixed(2)}`,
    };
  }
  return { ok: true };
}

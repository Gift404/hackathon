import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader, publicTrader, publicTransaction } from "@/lib/auth";
import {
  calculateFinancialScore,
  getAmountToNextTier,
  getTierProgress,
} from "@/lib/utils";
import { centsToRands } from "@/lib/money";
import {
  startOfDay,
  startOfMonth,
  subMonths,
  endOfMonth,
  subDays,
  format,
} from "date-fns";

export async function GET() {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const weekStart = startOfDay(subDays(now, 6));

    const [todayTx, monthTx, lastMonthTx, recent, allForScore, weekTx] =
      await Promise.all([
      prisma.transaction.findMany({
        where: {
          traderId: trader.id,
          status: "COMPLETED",
          createdAt: { gte: todayStart },
        },
      }),
      prisma.transaction.findMany({
        where: {
          traderId: trader.id,
          status: "COMPLETED",
          createdAt: { gte: monthStart },
        },
      }),
      prisma.transaction.findMany({
        where: {
          traderId: trader.id,
          status: "COMPLETED",
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.transaction.findMany({
        where: { traderId: trader.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.transaction.findMany({
        where: { traderId: trader.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.transaction.findMany({
        where: {
          traderId: trader.id,
          status: "COMPLETED",
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    const todayTotal = centsToRands(todayTx.reduce((s, t) => s + t.amountCents, 0));
    const monthTotal = centsToRands(monthTx.reduce((s, t) => s + t.amountCents, 0));
    const lastMonthTotal = centsToRands(
      lastMonthTx.reduce((s, t) => s + t.amountCents, 0)
    );

    const byDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      byDay.set(format(subDays(now, i), "yyyy-MM-dd"), 0);
    }
    for (const t of weekTx) {
      const key = format(t.createdAt, "yyyy-MM-dd");
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) || 0) + t.amountCents);
      }
    }
    const last7Days = Array.from(byDay.entries()).map(([date, cents]) => ({
      date,
      label: format(new Date(date + "T12:00:00"), "EEE"),
      total: centsToRands(cents),
    }));

    const totalVerified = centsToRands(trader.totalVerifiedCents);
    const score = calculateFinancialScore({
      totalVerified,
      transactions: allForScore.map((t) => ({
        amount: centsToRands(t.amountCents),
        createdAt: t.createdAt,
        status: t.status,
      })),
      memberSince: trader.createdAt,
    });

    return NextResponse.json({
      trader: publicTrader(trader),
      todayTotal,
      todayCount: todayTx.length,
      monthTotal,
      lastMonthTotal,
      last7Days,
      transactions: recent.map(publicTransaction),
      tier: trader.tier,
      tierProgress: getTierProgress(totalVerified, trader.tier),
      amountToNextTier: getAmountToNextTier(totalVerified, trader.tier),
      score,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Dashboard failed" }, { status: 500 });
  }
}


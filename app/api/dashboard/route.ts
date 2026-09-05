import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import {
  calculateFinancialScore,
  getAmountToNextTier,
  getTierProgress,
} from "@/lib/utils";
import {
  startOfDay,
  startOfMonth,
  subMonths,
  endOfMonth,
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

    const [todayTx, monthTx, lastMonthTx, recent, allForScore] = await Promise.all([
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
    ]);

    const todayTotal = todayTx.reduce((s, t) => s + t.amount, 0);
    const monthTotal = monthTx.reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = lastMonthTx.reduce((s, t) => s + t.amount, 0);

    const score = calculateFinancialScore({
      totalVerified: trader.totalVerified,
      transactions: allForScore,
      memberSince: trader.createdAt,
    });

    return NextResponse.json({
      trader: {
        id: trader.id,
        phone: trader.phone,
        idNumber: trader.idNumber,
        fullName: trader.fullName,
        businessName: trader.businessName,
        tier: trader.tier,
        dailyLimit: trader.dailyLimit,
        totalVerified: trader.totalVerified,
        livenessVerified: trader.livenessVerified,
        idVerified: trader.idVerified,
        active: trader.active,
        createdAt: trader.createdAt.toISOString(),
      },
      todayTotal,
      todayCount: todayTx.length,
      monthTotal,
      lastMonthTotal,
      transactions: recent.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        settledAt: t.settledAt?.toISOString() ?? null,
      })),
      tier: trader.tier,
      tierProgress: getTierProgress(trader.totalVerified, trader.tier),
      amountToNextTier: getAmountToNextTier(trader.totalVerified, trader.tier),
      score,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Dashboard failed" }, { status: 500 });
  }
}

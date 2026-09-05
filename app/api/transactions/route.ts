import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = req.nextUrl.searchParams.get("period") || "all";
    const now = new Date();
    let gte: Date | undefined;

    if (period === "today") gte = startOfDay(now);
    else if (period === "week") gte = startOfWeek(now, { weekStartsOn: 1 });
    else if (period === "month") gte = startOfMonth(now);

    const transactions = await prisma.transaction.findMany({
      where: {
        traderId: trader.id,
        ...(gte ? { createdAt: { gte } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        settledAt: t.settledAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}

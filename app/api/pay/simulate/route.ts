import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { getTierFromTurnover } from "@/lib/utils";

/** Demo-only: mark a pending payment as completed */
export async function POST(req: NextRequest) {
  try {
    if (process.env.DEMO_MODE !== "true") {
      return NextResponse.json({ error: "Demo only" }, { status: 403 });
    }

    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await req.json();
    const tx = await prisma.transaction.findUnique({ where: { reference } });
    if (!tx || tx.traderId !== trader.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (tx.status === "COMPLETED") {
      return NextResponse.json({ status: "COMPLETED", transaction: tx });
    }

    const names = ["Sipho M.", "Thabo K.", "Lerato N.", "Fatima A.", "Johan P."];
    const customerName =
      tx.customerName ||
      names[Math.floor(Math.random() * names.length)];

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "COMPLETED",
        settledAt: new Date(),
        customerName,
      },
    });

    const newTotal = trader.totalVerified + tx.amount;
    const tierInfo = getTierFromTurnover(newTotal);

    await prisma.trader.update({
      where: { id: trader.id },
      data: {
        totalVerified: newTotal,
        tier: tierInfo.tier,
        dailyLimit: tierInfo.dailyLimit,
      },
    });

    if (tx.method === "PAYSHAP_QR") {
      await prisma.paymentLink.updateMany({
        where: { traderId: trader.id, used: false, amount: tx.amount },
        data: { used: true },
      });
    }

    return NextResponse.json({ status: "COMPLETED", transaction: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Simulate failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await params;
    const tx = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (!tx || tx.traderId !== trader.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: tx.status,
      settledAt: tx.settledAt,
      amount: tx.amount,
      customerName: tx.customerName,
      customerPhone: tx.customerPhone,
      reference: tx.reference,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

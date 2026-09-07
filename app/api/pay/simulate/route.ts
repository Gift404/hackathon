import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader, publicTransaction } from "@/lib/auth";
import { completePaymentOnce } from "@/lib/settlement";

/** Demo/mock: mark a pending payment as completed */
export async function POST(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await req.json();
    const tx = await prisma.transaction.findUnique({ where: { reference } });
    if (!tx || tx.traderId !== trader.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isMockRef =
      !tx.stitchRef ||
      tx.stitchRef.startsWith("STITCH-QR-") ||
      tx.stitchRef.startsWith("STITCH-DEB-");
    if (process.env.DEMO_MODE !== "true" && !isMockRef) {
      return NextResponse.json(
        { error: "Simulate only available for demo/mock payments" },
        { status: 403 }
      );
    }

    if (tx.status === "COMPLETED") {
      return NextResponse.json({
        status: "COMPLETED",
        transaction: publicTransaction(tx),
      });
    }

    const names = ["Sipho M.", "Thabo K.", "Lerato N.", "Fatima A.", "Johan P."];
    const customerName =
      tx.customerName || names[Math.floor(Math.random() * names.length)];

    await completePaymentOnce({
      transactionId: tx.id,
      traderId: trader.id,
      amountCents: tx.amountCents,
      reference: tx.reference,
      method: tx.method,
      customerName,
    });

    const updated = await prisma.transaction.findUniqueOrThrow({
      where: { id: tx.id },
    });

    return NextResponse.json({
      status: updated.status,
      transaction: publicTransaction(updated),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Simulate failed" }, { status: 500 });
  }
}

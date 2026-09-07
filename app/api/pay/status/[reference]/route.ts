import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { centsToRands } from "@/lib/money";
import { checkPaymentStatus } from "@/lib/stitch";
import { completePaymentOnce } from "@/lib/settlement";

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
    let tx = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (!tx || tx.traderId !== trader.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Live: poll Stitch and settle if bank confirmed (webhook may also do this)
    if (
      tx.status === "PENDING" &&
      tx.stitchRef &&
      process.env.DEMO_MODE !== "true" &&
      process.env.STITCH_CLIENT_ID
    ) {
      try {
        const remote = await checkPaymentStatus(tx.stitchRef);
        if (remote.status === "COMPLETED") {
          await completePaymentOnce({
            transactionId: tx.id,
            traderId: tx.traderId,
            amountCents: tx.amountCents,
            reference: tx.reference,
            method: tx.method,
          });
          tx = (await prisma.transaction.findUnique({ where: { reference } }))!;
        } else if (remote.status === "FAILED") {
          await prisma.transaction.updateMany({
            where: { id: tx.id, status: "PENDING" },
            data: { status: "FAILED" },
          });
          tx = (await prisma.transaction.findUnique({ where: { reference } }))!;
        }
      } catch (e) {
        console.error("Stitch status poll failed:", e);
      }
    }

    return NextResponse.json({
      status: tx.status,
      settledAt: tx.settledAt,
      amount: centsToRands(tx.amountCents),
      customerName: tx.customerName,
      customerPhone: tx.customerPhone,
      reference: tx.reference,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

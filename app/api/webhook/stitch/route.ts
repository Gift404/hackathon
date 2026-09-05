import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/stitch";
import { getTierFromTurnover } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-stitch-signature");

    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(raw);
    const stitchRef = payload.stitchRef || payload.reference || payload.id;
    const status = payload.status === "completed" || payload.status === "COMPLETED"
      ? "COMPLETED"
      : payload.status === "failed" || payload.status === "FAILED"
        ? "FAILED"
        : "PENDING";

    const tx = await prisma.transaction.findFirst({
      where: {
        OR: [{ stitchRef: String(stitchRef) }, { reference: String(stitchRef) }],
      },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (tx.status === "COMPLETED") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status,
        settledAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    if (status === "COMPLETED") {
      const trader = await prisma.trader.findUnique({ where: { id: tx.traderId } });
      if (trader) {
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
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseStitchWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/stitch";
import { completePaymentOnce } from "@/lib/settlement";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-stitch-signature");

    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { stitchRef, status } = parseStitchWebhookPayload(payload);
    if (!stitchRef) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const tx = await prisma.transaction.findFirst({
      where: {
        OR: [{ stitchRef: String(stitchRef) }, { reference: String(stitchRef) }],
      },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (tx.status === "COMPLETED" || tx.status === "FAILED") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        status: tx.status,
      });
    }

    if (status === "FAILED") {
      await prisma.transaction.updateMany({
        where: { id: tx.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ ok: true });
    }

    if (status === "COMPLETED") {
      const result = await completePaymentOnce({
        transactionId: tx.id,
        traderId: tx.traderId,
        amountCents: tx.amountCents,
        reference: tx.reference,
        method: tx.method,
      });
      return NextResponse.json({
        ok: true,
        completed: result.completed,
        alreadyProcessed: !result.completed,
      });
    }

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

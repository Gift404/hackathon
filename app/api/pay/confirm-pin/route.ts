import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader, publicTransaction } from "@/lib/auth";
import { hashOtp, timingSafeEqualHex } from "@/lib/crypto";
import { completePaymentOnce } from "@/lib/settlement";
import { rateLimit } from "@/lib/rate-limit";

/** Trader enters the PIN SMS'd to the customer → mark payment completed. */
export async function POST(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const reference = String(body.reference || "").trim();
    const pin = String(body.pin || "").replace(/\D/g, "");

    if (!reference || pin.length !== 6) {
      return NextResponse.json(
        { error: "Reference and 6-digit PIN required" },
        { status: 400 }
      );
    }

    const limited = rateLimit(
      `pay-pin:${trader.id}:${reference}`,
      8,
      15 * 60 * 1000
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many PIN attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const tx = await prisma.transaction.findUnique({ where: { reference } });
    if (!tx || tx.traderId !== trader.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (tx.status === "COMPLETED") {
      return NextResponse.json({
        status: "COMPLETED",
        transaction: publicTransaction(tx),
      });
    }

    if (tx.status !== "PENDING") {
      return NextResponse.json(
        { error: "Payment is no longer pending" },
        { status: 400 }
      );
    }

    if (!tx.approvalPinHash || !tx.approvalPinExpiresAt) {
      return NextResponse.json(
        { error: "This payment has no SMS PIN. Create a new phone request." },
        { status: 400 }
      );
    }

    if (tx.approvalPinExpiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "PIN expired. Send a new payment request." },
        { status: 400 }
      );
    }

    const phone = tx.customerPhone || "";
    const expected = hashOtp(`${reference}:${phone}`, pin);
    if (!timingSafeEqualHex(expected, tx.approvalPinHash)) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    await completePaymentOnce({
      transactionId: tx.id,
      traderId: trader.id,
      amountCents: tx.amountCents,
      reference: tx.reference,
      method: tx.method,
      customerName: tx.customerName || maskNameFromPhone(phone),
    });

    // Clear pin after use
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { approvalPinHash: null, approvalPinExpiresAt: null },
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
    return NextResponse.json({ error: "PIN confirmation failed" }, { status: 500 });
  }
}

function maskNameFromPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length >= 4) return `Customer …${d.slice(-4)}`;
  return "Customer";
}

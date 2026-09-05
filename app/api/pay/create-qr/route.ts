import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { generateReference } from "@/lib/utils";
import { createPayShapQR } from "@/lib/stitch";

export async function POST(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (amount > trader.dailyLimit) {
      return NextResponse.json(
        { error: `Amount exceeds daily limit of R${trader.dailyLimit}` },
        { status: 400 }
      );
    }

    const reference = generateReference();
    const stitch = await createPayShapQR({
      amount,
      reference,
      traderPhone: trader.phone,
    });

    const link = await prisma.paymentLink.create({
      data: {
        traderId: trader.id,
        amount,
        qrData: stitch.qrData,
        expiresAt: stitch.expiresAt,
      },
    });

    await prisma.transaction.create({
      data: {
        traderId: trader.id,
        amount,
        method: "PAYSHAP_QR",
        status: "PENDING",
        reference,
        stitchRef: stitch.stitchRef,
        customerName: null,
      },
    });

    return NextResponse.json({
      qrData: stitch.qrData,
      linkId: link.id,
      reference,
      expiresAt: stitch.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create QR" }, { status: 500 });
  }
}

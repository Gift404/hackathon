import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { generateReference } from "@/lib/utils";
import { createPayShapQR } from "@/lib/stitch";
import { randsToCents, centsToRands } from "@/lib/money";
import { assertWithinDailyLimit } from "@/lib/limits";

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

    const amountCents = randsToCents(amount);
    if (amountCents > trader.dailyLimitCents) {
      return NextResponse.json(
        {
          error: `Single payment cannot exceed your daily limit of R${centsToRands(trader.dailyLimitCents).toFixed(2)}`,
        },
        { status: 400 }
      );
    }
    const limitCheck = await assertWithinDailyLimit({
      traderId: trader.id,
      dailyLimitCents: trader.dailyLimitCents,
      amountCents,
    });
    if (!limitCheck.ok) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    const reference = generateReference();
    const stitch = await createPayShapQR({
      amount: centsToRands(amountCents),
      reference,
      traderPhone: trader.phone,
      traderId: trader.id,
    });

    const link = await prisma.paymentLink.create({
      data: {
        traderId: trader.id,
        amountCents,
        reference,
        qrData: stitch.qrData,
        expiresAt: stitch.expiresAt,
      },
    });

    await prisma.transaction.create({
      data: {
        traderId: trader.id,
        amountCents,
        method: "PAYSHAP_QR",
        status: "PENDING",
        reference,
        stitchRef: stitch.stitchRef,
        customerName: null,
      },
    });

    return NextResponse.json({
      qrData: stitch.qrData,
      paymentUrl: stitch.paymentUrl,
      linkId: link.id,
      reference,
      expiresAt: stitch.expiresAt.toISOString(),
      mock: stitch.mock,
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to create QR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

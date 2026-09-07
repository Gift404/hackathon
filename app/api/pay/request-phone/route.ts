import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { generateReference, normalizePhone, validateSAPhone } from "@/lib/utils";
import { initiatePayShapDebit } from "@/lib/stitch";
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
    const customerPhone = normalizePhone(body.customerPhone || "");

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!validateSAPhone(customerPhone)) {
      return NextResponse.json(
        { error: "Invalid customer phone" },
        { status: 400 }
      );
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
    const stitch = await initiatePayShapDebit({
      amount: centsToRands(amountCents),
      reference,
      customerPhone,
      traderPhone: trader.phone,
      traderId: trader.id,
    });

    await prisma.transaction.create({
      data: {
        traderId: trader.id,
        amountCents,
        method: "PAYSHAP_PHONE",
        status: "PENDING",
        reference,
        stitchRef: stitch.stitchRef,
        customerPhone,
      },
    });

    return NextResponse.json({
      reference,
      status: stitch.status,
      stitchRef: stitch.stitchRef,
      paymentUrl: stitch.paymentUrl,
      mock: stitch.mock,
    });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error ? e.message : "Failed to send payment request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

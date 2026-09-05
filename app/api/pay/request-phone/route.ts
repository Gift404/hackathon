import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { generateReference, normalizePhone, validateSAPhone } from "@/lib/utils";
import { initiatePayShapDebit } from "@/lib/stitch";

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

    const reference = generateReference();
    const stitch = await initiatePayShapDebit({
      amount,
      reference,
      customerPhone,
      traderPhone: trader.phone,
    });

    await prisma.transaction.create({
      data: {
        traderId: trader.id,
        amount,
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
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to send payment request" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import {
  generateReference,
  generateOTP,
  normalizePhone,
  validateSAPhone,
  formatZAR,
} from "@/lib/utils";
import { initiatePayShapDebit } from "@/lib/stitch";
import { randsToCents, centsToRands } from "@/lib/money";
import { assertWithinDailyLimit } from "@/lib/limits";
import { sendPaymentPinSms, isSmsLive } from "@/lib/otp";
import { hashOtp } from "@/lib/crypto";

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

    // SMS PIN is the approval path until a live payment gateway is wired.
    const pin = generateOTP();
    const pinExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const approvalPinHash = hashOtp(`${reference}:${customerPhone}`, pin);

    await prisma.transaction.create({
      data: {
        traderId: trader.id,
        amountCents,
        method: "PAYSHAP_PHONE",
        status: "PENDING",
        reference,
        stitchRef: stitch.stitchRef,
        customerPhone,
        approvalPinHash,
        approvalPinExpiresAt: pinExpiresAt,
      },
    });

    const traderLabel =
      trader.businessName?.trim() ||
      trader.fullName.split(" ")[0] ||
      "A trader";

    const amountLabel = formatZAR(centsToRands(amountCents));
    const smsLive = isSmsLive();
    const smsSent = await sendPaymentPinSms({
      customerPhone,
      traderName: traderLabel,
      amountLabel,
      pin,
    });

    if (smsLive && !smsSent) {
      // Still return the PIN on-screen in DEMO_MODE so the demo is not blocked
      if (process.env.DEMO_MODE !== "true") {
        return NextResponse.json(
          {
            error:
              "Payment created but SMS failed. On a Twilio trial, verify the customer's number in Twilio first, then try again.",
            code: "SMS_FAILED",
            reference,
          },
          { status: 502 }
        );
      }
    }

    const showPinOnScreen =
      process.env.DEMO_MODE === "true" || !smsLive;

    return NextResponse.json({
      reference,
      status: "PENDING",
      stitchRef: stitch.stitchRef,
      paymentUrl: stitch.paymentUrl,
      mock: stitch.mock,
      smsSent: Boolean(smsSent && smsLive),
      ...(showPinOnScreen ? { demoPin: pin } : {}),
      message: smsLive
        ? showPinOnScreen
          ? "PIN sent by SMS (also shown for demo)."
          : "PIN sent to customer. Ask them for the code to confirm."
        : "Demo PIN shown — configure Twilio to SMS customers.",
    });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error ? e.message : "Failed to send payment request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

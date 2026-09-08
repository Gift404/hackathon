import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, normalizePhone, validateSAPhone } from "@/lib/utils";
import { sendOTP, isSmsLive } from "@/lib/otp";
import { hashOtp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone || "");

    if (!validateSAPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid SA phone number" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limited = rateLimit(`otp:${phone}:${ip}`, 5, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many OTP requests. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const trader = await prisma.trader.findUnique({ where: { phone } });
    if (!trader) {
      return NextResponse.json(
        {
          error:
            "No account found for this number. Use the same phone you registered with, or sign up.",
          code: "ACCOUNT_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = hashOtp(phone, code);

    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    const smsLive = isSmsLive();
    const sent = await sendOTP(phone, code);

    // Demo safety net: show code on screen when DEMO_MODE=true,
    // while still sending real SMS when Twilio is configured.
    const showOnScreen =
      process.env.DEMO_MODE === "true" || !smsLive;

    if (smsLive && !sent && !showOnScreen) {
      return NextResponse.json(
        {
          error:
            "Could not send SMS. On a Twilio trial, verify this number in the Twilio console first.",
          code: "SMS_FAILED",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      smsSent: Boolean(sent && smsLive),
      ...(showOnScreen ? { demoCode: code } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

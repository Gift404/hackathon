import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, normalizePhone, validateSAPhone } from "@/lib/utils";
import { sendOTP } from "@/lib/otp";
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
        { error: "No account found for this number. Please register first." },
        { status: 404 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = hashOtp(phone, code);

    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    await sendOTP(phone, code);

    const demo =
      process.env.DEMO_MODE === "true" ||
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER;

    return NextResponse.json({
      success: true,
      // Only return demoCode when SMS is not live — never leak OTP when Twilio is on
      ...(demo ? { demoCode: code } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

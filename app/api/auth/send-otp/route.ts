import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, normalizePhone, validateSAPhone } from "@/lib/utils";
import { sendOTP } from "@/lib/otp";

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

    const trader = await prisma.trader.findUnique({ where: { phone } });
    if (!trader) {
      return NextResponse.json(
        { error: "No account found for this number. Please register first." },
        { status: 404 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    await sendOTP(phone, code);

    const demo = process.env.DEMO_MODE === "true";
    return NextResponse.json({
      success: true,
      ...(demo ? { demoCode: code } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { createSession, publicTrader } from "@/lib/auth";
import { hashOtp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone || "");
    const code = String(body.code || "").trim();

    if (!phone || code.length !== 6) {
      return NextResponse.json(
        { error: "Phone and 6-digit code required" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limited = rateLimit(`otp-verify:${phone}:${ip}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const codeHash = hashOtp(phone, code);
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        codeHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    const trader = await prisma.trader.findUnique({ where: { phone } });
    if (!trader || !trader.active) {
      return NextResponse.json(
        { error: "Trader account not found" },
        { status: 404 }
      );
    }

    await createSession(trader.id);
    const pub = publicTrader(trader);

    return NextResponse.json({
      trader: {
        id: pub.id,
        phone: pub.phone,
        fullName: pub.fullName,
        businessName: pub.businessName,
        tier: pub.tier,
        dailyLimit: pub.dailyLimit,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

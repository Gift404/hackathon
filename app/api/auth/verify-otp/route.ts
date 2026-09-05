import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { createSession } from "@/lib/auth";

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

    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
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

    return NextResponse.json({
      token: trader.id,
      trader: {
        id: trader.id,
        phone: trader.phone,
        fullName: trader.fullName,
        businessName: trader.businessName,
        tier: trader.tier,
        dailyLimit: trader.dailyLimit,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

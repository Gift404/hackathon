import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader } from "@/lib/auth";
import { verifyLiveness } from "@/lib/smile-identity";

export async function POST(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await verifyLiveness(body.imageBase64);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await prisma.trader.update({
      where: { id: trader.id },
      data: { livenessVerified: true },
    });

    return NextResponse.json({
      success: true,
      confidence: result.confidence,
      mock: result.mock,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Liveness check failed" }, { status: 500 });
  }
}

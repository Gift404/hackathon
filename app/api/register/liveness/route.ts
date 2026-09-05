import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLiveness } from "@/lib/smile-identity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const traderId = body.traderId as string;
    if (!traderId) {
      return NextResponse.json({ error: "traderId required" }, { status: 400 });
    }

    const result = await verifyLiveness(body.imageBase64);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await prisma.trader.update({
      where: { id: traderId },
      data: { livenessVerified: true },
    });

    return NextResponse.json({ success: true, confidence: result.confidence });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Liveness check failed" }, { status: 500 });
  }
}

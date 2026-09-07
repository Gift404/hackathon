import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "ezipay",
      demoMode: process.env.DEMO_MODE === "true",
      integrations: {
        stitch: Boolean(process.env.STITCH_CLIENT_ID),
        smile: Boolean(process.env.SMILE_API_KEY && process.env.SMILE_PARTNER_ID),
        twilio: Boolean(process.env.TWILIO_ACCOUNT_SID),
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", error: "database_unreachable" },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrader, publicTrader } from "@/lib/auth";
import { getTodaySpendCents } from "@/lib/limits";
import { centsToRands } from "@/lib/money";
import {
  generateOTP,
  normalizePhone,
  validateSAPhone,
} from "@/lib/utils";
import { sendOTP } from "@/lib/otp";
import { hashOtp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

/** Lightweight auth + daily limit snapshot for the pay screen */
export async function GET() {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todaySpendCents = await getTodaySpendCents(trader.id);
    const remainingCents = Math.max(0, trader.dailyLimitCents - todaySpendCents);

    return NextResponse.json({
      trader: publicTrader(trader),
      dailyLimit: centsToRands(trader.dailyLimitCents),
      todaySpend: centsToRands(todaySpendCents),
      remaining: centsToRands(remainingCents),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Update business name (and optionally request phone change — see /api/me/phone) */
export async function PATCH(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const businessName =
      typeof body.businessName === "string"
        ? body.businessName.trim().slice(0, 80)
        : undefined;

    if (businessName === undefined) {
      return NextResponse.json(
        { error: "businessName required" },
        { status: 400 }
      );
    }

    const updated = await prisma.trader.update({
      where: { id: trader.id },
      data: { businessName: businessName || null },
    });

    return NextResponse.json({ trader: publicTrader(updated) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** Start phone change: OTP sent to the *new* number */
export async function POST(req: NextRequest) {
  try {
    const trader = await getCurrentTrader();
    if (!trader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "request-phone") {
      const phone = normalizePhone(body.phone || "");
      if (!validateSAPhone(phone)) {
        return NextResponse.json(
          { error: "Invalid SA phone number" },
          { status: 400 }
        );
      }
      if (phone === trader.phone) {
        return NextResponse.json(
          { error: "That is already your phone number" },
          { status: 400 }
        );
      }
      const taken = await prisma.trader.findUnique({ where: { phone } });
      if (taken) {
        return NextResponse.json(
          { error: "That number is already registered" },
          { status: 409 }
        );
      }

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      const limited = rateLimit(`phone-change:${trader.id}:${ip}`, 5, 15 * 60 * 1000);
      if (!limited.ok) {
        return NextResponse.json(
          { error: `Too many requests. Try again in ${limited.retryAfterSec}s.` },
          { status: 429 }
        );
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const codeHash = hashOtp(phone, code);
      await prisma.otpCode.create({
        data: { phone, codeHash, expiresAt },
      });
      await sendOTP(phone, code);

      const demo = process.env.DEMO_MODE === "true";
      return NextResponse.json({
        success: true,
        ...(demo ? { demoCode: code } : {}),
      });
    }

    if (action === "confirm-phone") {
      const phone = normalizePhone(body.phone || "");
      const code = String(body.code || "").trim();
      if (!validateSAPhone(phone) || code.length !== 6) {
        return NextResponse.json(
          { error: "Phone and 6-digit code required" },
          { status: 400 }
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

      const taken = await prisma.trader.findUnique({ where: { phone } });
      if (taken && taken.id !== trader.id) {
        return NextResponse.json(
          { error: "That number is already registered" },
          { status: 409 }
        );
      }

      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { used: true },
      });

      const updated = await prisma.trader.update({
        where: { id: trader.id },
        data: { phone },
      });

      return NextResponse.json({ trader: publicTrader(updated) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

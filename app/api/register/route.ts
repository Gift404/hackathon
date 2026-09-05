import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  validateSAID,
  validateSAPhone,
} from "@/lib/utils";
import { verifySAID } from "@/lib/smile-identity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const idNumber = String(body.idNumber || "").replace(/\D/g, "");
    const phone = normalizePhone(body.phone || "");

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!validateSAID(idNumber)) {
      return NextResponse.json(
        { error: "Invalid SA ID number" },
        { status: 400 }
      );
    }
    if (!validateSAPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid SA phone number" },
        { status: 400 }
      );
    }

    const existingPhone = await prisma.trader.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this phone already exists. Please sign in." },
        { status: 409 }
      );
    }

    const existingId = await prisma.trader.findUnique({ where: { idNumber } });
    if (existingId) {
      return NextResponse.json(
        { error: "An account with this ID number already exists." },
        { status: 409 }
      );
    }

    const idCheck = await verifySAID({ idNumber, fullName });
    if (!idCheck.success) {
      return NextResponse.json({ error: idCheck.message }, { status: 400 });
    }

    const trader = await prisma.trader.create({
      data: {
        fullName,
        idNumber,
        phone,
        tier: 1,
        dailyLimit: 5000,
        idVerified: true,
        livenessVerified: false,
      },
    });

    return NextResponse.json({
      trader: {
        id: trader.id,
        fullName: trader.fullName,
        phone: trader.phone,
        tier: trader.tier,
        dailyLimit: trader.dailyLimit,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

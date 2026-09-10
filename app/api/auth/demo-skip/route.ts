import { NextRequest, NextResponse } from "next/server";
import {
  findDemoTrader,
  sessionCookieAttributes,
} from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/crypto";

/** Pitch shortcut: sign in as the demo trader and go to the dashboard. */
export async function GET(req: NextRequest) {
  const trader = await findDemoTrader();
  if (!trader) {
    return NextResponse.json(
      { error: "Demo trader not found. Seed the database." },
      { status: 503 }
    );
  }

  const dest = new URL("/dashboard", req.url);
  const res = NextResponse.redirect(dest);
  res.cookies.set(
    SESSION_COOKIE,
    createSessionToken(trader.id),
    sessionCookieAttributes()
  );
  return res;
}

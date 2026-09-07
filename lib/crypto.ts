import { createHmac, timingSafeEqual, randomBytes, createHash } from "crypto";

const SESSION_COOKIE = "ezipay_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET (min 32 chars) is required in production");
    }
    // Deterministic local fallback so demo works without .env; never use in prod
    return "dev-only-ezipay-session-secret-change-me!!";
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

export type SessionPayload = {
  sub: string; // traderId
  exp: number; // unix seconds
};

/** Create a signed session token (HMAC). Not forgeable without SESSION_SECRET. */
export function createSessionToken(traderId: string, maxAgeSec = SESSION_MAX_AGE_SEC): string {
  const payload: SessionPayload = {
    sub: traderId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sub || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE_SEC };

/** Hash OTP before storage — plaintext never lands in DB. */
export function hashOtp(phone: string, code: string): string {
  const pepper = sessionSecret();
  return createHash("sha256").update(`${phone}:${code}:${pepper}`).digest("hex");
}

/** Timing-safe HMAC-SHA256 hex digest for webhook bodies. */
export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

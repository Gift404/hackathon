/**
 * SMS via Twilio.
 * Sends real SMS whenever TWILIO_* credentials are set.
 * Falls back to console log otherwise (local / no keys).
 *
 * DEMO_MODE only mocks Stitch/Smile — it does NOT disable Twilio.
 */

function hasTwilio(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  // SA local 0xxxxxxxxx → +27xxxxxxxxx
  if (digits.startsWith("0") && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }
  if (digits.startsWith("27") && digits.length === 11) {
    return `+${digits}`;
  }
  return `+27${digits}`;
}

export async function sendSms(phone: string, body: string): Promise<boolean> {
  const to = toE164(phone);

  if (!hasTwilio()) {
    console.log(`[DEMO SMS] To: ${to} | ${body}`);
    return true;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Twilio send failed:", res.status, errText);
      return false;
    }

    console.log(`[Twilio] SMS sent to ${to}`);
    return true;
  } catch (e) {
    console.error("Twilio send failed:", e);
    return false;
  }
}

export async function sendOTP(phone: string, code: string): Promise<boolean> {
  return sendSms(
    phone,
    `Your EZIPAY login code is ${code}. Valid for 5 minutes. Do not share this code.`
  );
}

/** Customer approval PIN for phone-pay (stand-in until a real payment gateway). */
export async function sendPaymentPinSms(params: {
  customerPhone: string;
  traderName: string;
  amountLabel: string;
  pin: string;
}): Promise<boolean> {
  const body =
    `EZIPAY: ${params.traderName} requests ${params.amountLabel}. ` +
    `Your confirmation PIN is ${params.pin}. ` +
    `Tell this PIN to the trader to approve payment. Valid 10 minutes.`;

  return sendSms(params.customerPhone, body.slice(0, 320));
}

export function isSmsLive(): boolean {
  return hasTwilio();
}

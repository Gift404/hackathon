/**
 * SMS via Twilio.
 * Sends real SMS whenever TWILIO_* credentials are set.
 * Falls back to console log otherwise.
 */

function hasTwilio(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

function toE164(phone: string): string {
  return phone.startsWith("+") ? phone : `+27${phone.replace(/\D/g, "").slice(1)}`;
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
    `Your EZIPAY code is ${code}. Valid for 5 minutes.`
  );
}

export async function sendPaymentRequestSms(params: {
  customerPhone: string;
  traderName: string;
  amountLabel: string;
  paymentUrl?: string | null;
}): Promise<boolean> {
  const link = params.paymentUrl
    ? ` Pay here: ${params.paymentUrl}`
    : " Open your banking app to approve the PayShap request.";

  const body = `EZIPAY: ${params.traderName} requests ${params.amountLabel}.${link}`;

  return sendSms(params.customerPhone, body.slice(0, 320));
}

export function isSmsLive(): boolean {
  return hasTwilio();
}

/**
 * OTP / SMS via Twilio.
 * Sends real SMS whenever TWILIO_* credentials are set.
 * Falls back to console log (and demoCode in the API) otherwise.
 */

function hasTwilio(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

export async function sendOTP(phone: string, code: string): Promise<boolean> {
  if (!hasTwilio()) {
    console.log(`[DEMO OTP] Phone: ${phone} | Code: ${code}`);
    console.log(
      "[DEMO OTP] Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env for real SMS"
    );
    return true;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;
  const to = phone.startsWith("+") ? phone : `+27${phone.slice(1)}`;

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
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: `Your EZIPAY code is ${code}. Valid for 5 minutes.`,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Twilio send failed:", res.status, errText);
      return false;
    }

    console.log(`[Twilio] OTP sent to ${to}`);
    return true;
  } catch (e) {
    console.error("Twilio send failed:", e);
    return false;
  }
}

export function isSmsLive(): boolean {
  return hasTwilio();
}

/**
 * OTP / SMS via Twilio (mocked in DEMO_MODE)
 */

const DEMO = () =>
  process.env.DEMO_MODE === "true" || !process.env.TWILIO_ACCOUNT_SID;

export async function sendOTP(phone: string, code: string): Promise<boolean> {
  if (DEMO()) {
    console.log(`[DEMO OTP] Phone: ${phone} | Code: ${code}`);
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
        body: new URLSearchParams({
          To: phone.startsWith("+") ? phone : `+27${phone.slice(1)}`,
          From: from,
          Body: `Your Imali Pay code is ${code}. Valid for 5 minutes.`,
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("Twilio send failed:", e);
    return false;
  }
}

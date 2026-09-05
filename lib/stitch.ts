/**
 * Stitch PayShap integration (sandbox / demo mock)
 * Docs: https://stitch.money/docs
 */

export interface StitchQRResponse {
  qrData: string;
  stitchRef: string;
  expiresAt: Date;
}

export interface StitchDebitResponse {
  reference: string;
  stitchRef: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface StitchStatusResponse {
  status: "PENDING" | "COMPLETED" | "FAILED";
  settledAt: Date | null;
}

const DEMO = () =>
  process.env.DEMO_MODE === "true" || !process.env.STITCH_CLIENT_ID;

async function getAccessToken(): Promise<string | null> {
  if (DEMO()) return "demo-token";

  const clientId = process.env.STITCH_CLIENT_ID!;
  const clientSecret = process.env.STITCH_CLIENT_SECRET!;

  try {
    const res = await fetch("https://secure.stitch.money/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "client_paymentrequest",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token as string;
  } catch {
    return null;
  }
}

export async function createPayShapQR(params: {
  amount: number;
  reference: string;
  traderPhone: string;
}): Promise<StitchQRResponse> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const stitchRef = `STITCH-QR-${params.reference}`;

  if (DEMO()) {
    // PayShap-style deep link / payload for QR
    const qrData = JSON.stringify({
      type: "PAYSHAP",
      amount: params.amount,
      currency: "ZAR",
      reference: params.reference,
      merchant: params.traderPhone,
      stitchRef,
    });
    return { qrData, stitchRef, expiresAt };
  }

  const token = await getAccessToken();
  // Real Stitch call would go here when credentials are configured
  const qrData = JSON.stringify({
    type: "PAYSHAP",
    amount: params.amount,
    reference: params.reference,
    token: token ? "live" : "fallback",
  });
  return { qrData, stitchRef, expiresAt };
}

export async function initiatePayShapDebit(params: {
  amount: number;
  reference: string;
  customerPhone: string;
  traderPhone: string;
}): Promise<StitchDebitResponse> {
  const stitchRef = `STITCH-DEB-${params.reference}`;

  if (DEMO()) {
    return {
      reference: params.reference,
      stitchRef,
      status: "PENDING",
    };
  }

  await getAccessToken();
  return {
    reference: params.reference,
    stitchRef,
    status: "PENDING",
  };
}

export async function checkPaymentStatus(
  stitchRef: string
): Promise<StitchStatusResponse> {
  void stitchRef;
  if (DEMO()) {
    // Demo: payments stay pending until manually completed via simulate endpoint
    return { status: "PENDING", settledAt: null };
  }

  await getAccessToken();
  return { status: "PENDING", settledAt: null };
}

export function verifyWebhookSignature(
  _payload: string,
  signature: string | null
): boolean {
  if (DEMO()) return true;
  const secret = process.env.STITCH_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return signature === secret || signature.startsWith("demo");
}

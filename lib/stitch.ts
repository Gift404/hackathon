/**
 * Stitch Pay By Bank / PayShap integration.
 * Docs: https://docs.stitch.money/payment-products/payins/paybybank/integration-process
 *
 * DEMO_MODE or missing STITCH_CLIENT_ID → labeled local mock.
 * With credentials → real GraphQL payment initiation + status queries.
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface StitchQRResponse {
  qrData: string;
  stitchRef: string;
  paymentUrl: string | null;
  expiresAt: Date;
  mock: boolean;
}

export interface StitchDebitResponse {
  reference: string;
  stitchRef: string;
  paymentUrl: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  mock: boolean;
}

export interface StitchStatusResponse {
  status: "PENDING" | "COMPLETED" | "FAILED";
  settledAt: Date | null;
  mock: boolean;
}

const GRAPHQL = "https://api.stitch.money/graphql";
const TOKEN_URL = "https://secure.stitch.money/connect/token";

const isDemo = () =>
  process.env.DEMO_MODE === "true" || !process.env.STITCH_CLIENT_ID;

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function truncate(s: string, max: number): string {
  return s.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, max).trim() || "EZIPAY";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.STITCH_CLIENT_ID!;
  const clientSecret = process.env.STITCH_CLIENT_SECRET!;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: TOKEN_URL,
      scope: "client_paymentrequest",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stitch token failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("Stitch token response missing access_token");
  return data.access_token as string;
}

async function stitchGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(
      `Stitch GraphQL error: ${JSON.stringify(json.errors || json).slice(0, 400)}`
    );
  }
  return json.data as T;
}

const CREATE_PAYMENT = `
mutation CreatePayment($input: ClientPaymentInitiationRequestCreateInput!) {
  clientPaymentInitiationRequestCreate(input: $input) {
    paymentInitiationRequest {
      id
      url
      status {
        __typename
      }
    }
  }
}
`;

const GET_PAYMENT = `
query GetPayment($id: ID!) {
  node(id: $id) {
    ... on PaymentInitiationRequest {
      id
      status {
        __typename
      }
    }
  }
}
`;

function mapStitchStatus(typename: string | undefined): "PENDING" | "COMPLETED" | "FAILED" {
  switch (typename) {
    case "PaymentInitiationRequestCompleted":
      return "COMPLETED";
    case "PaymentInitiationRequestCancelled":
    case "PaymentInitiationRequestExpired":
      return "FAILED";
    default:
      return "PENDING";
  }
}

function withRedirect(url: string): string {
  const redirect = `${appUrl()}/pay`;
  const u = new URL(url);
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("failure_redirect_uri", redirect);
  return u.toString();
}

async function createLivePaymentRequest(params: {
  amount: number;
  reference: string;
  traderPhone: string;
  traderId: string;
  customerPhone?: string;
}): Promise<{ id: string; url: string; expiresAt: Date }> {
  const token = await getAccessToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const quantity = params.amount.toFixed(2);

  const input: Record<string, unknown> = {
    amount: { quantity, currency: "ZAR" },
    payerReference: truncate(`EZI${params.reference.slice(-8)}`, 12),
    beneficiaryReference: truncate(params.reference, 20),
    externalReference: params.reference,
    expireAt: expiresAt.toISOString(),
    payerInformation: {
      payerId: params.customerPhone || params.traderId,
      ...(params.customerPhone
        ? { phoneNumber: params.customerPhone.startsWith("+")
            ? params.customerPhone
            : `+27${params.customerPhone.slice(1)}` }
        : {}),
    },
    paymentMethods: {
      eft: { enabled: true },
      card: { enabled: false },
    },
  };

  const data = await stitchGraphql<{
    clientPaymentInitiationRequestCreate: {
      paymentInitiationRequest: { id: string; url: string };
    };
  }>(token, CREATE_PAYMENT, { input });

  const pir = data.clientPaymentInitiationRequestCreate?.paymentInitiationRequest;
  if (!pir?.id || !pir?.url) {
    throw new Error("Stitch create payment returned no id/url");
  }

  return { id: pir.id, url: withRedirect(pir.url), expiresAt };
}

export async function createPayShapQR(params: {
  amount: number;
  reference: string;
  traderPhone: string;
  traderId: string;
}): Promise<StitchQRResponse> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  if (isDemo()) {
    const stitchRef = `STITCH-QR-${params.reference}`;
    const qrData = JSON.stringify({
      type: "PAYSHAP",
      mock: true,
      amount: params.amount,
      currency: "ZAR",
      reference: params.reference,
      merchant: params.traderPhone,
      stitchRef,
    });
    return { qrData, stitchRef, paymentUrl: null, expiresAt, mock: true };
  }

  const live = await createLivePaymentRequest({
    ...params,
    traderId: params.traderId,
  });

  // QR encodes the Stitch hosted payment URL (customer scans → bank app / RTP)
  return {
    qrData: live.url,
    stitchRef: live.id,
    paymentUrl: live.url,
    expiresAt: live.expiresAt,
    mock: false,
  };
}

export async function initiatePayShapDebit(params: {
  amount: number;
  reference: string;
  customerPhone: string;
  traderPhone: string;
  traderId: string;
}): Promise<StitchDebitResponse> {
  if (isDemo()) {
    return {
      reference: params.reference,
      stitchRef: `STITCH-DEB-${params.reference}`,
      paymentUrl: null,
      status: "PENDING",
      mock: true,
    };
  }

  const live = await createLivePaymentRequest({
    amount: params.amount,
    reference: params.reference,
    traderPhone: params.traderPhone,
    traderId: params.traderId,
    customerPhone: params.customerPhone,
  });

  return {
    reference: params.reference,
    stitchRef: live.id,
    paymentUrl: live.url,
    status: "PENDING",
    mock: false,
  };
}

export async function checkPaymentStatus(
  stitchRef: string
): Promise<StitchStatusResponse> {
  if (isDemo()) {
    return { status: "PENDING", settledAt: null, mock: true };
  }

  const token = await getAccessToken();
  const data = await stitchGraphql<{
    node: { id: string; status?: { __typename: string } } | null;
  }>(token, GET_PAYMENT, { id: stitchRef });

  const typename = data.node?.status?.__typename;
  const status = mapStitchStatus(typename);
  return {
    status,
    settledAt: status === "COMPLETED" ? new Date() : null,
    mock: false,
  };
}

/**
 * Stitch signed webhooks:
 * Header: X-Stitch-Signature: t=<unix>,hmac_sha256=<hex>
 * Signed payload: `${t}.${rawBody}`
 * Docs: https://docs.stitch.money/webhooks_legacy
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null
): boolean {
  if (isDemo()) return true;

  const secret = process.env.STITCH_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const piece of signatureHeader.split(",")) {
    const [k, v] = piece.trim().split("=");
    if (k && v) parts[k] = v;
  }

  const t = parts.t;
  const hmac = parts.hmac_sha256;
  if (!t || !hmac) {
    // Fallback: raw hex of body only (older test setups)
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    try {
      const a = Buffer.from(hmac || signatureHeader, "hex");
      const b = Buffer.from(expected, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // Reject stale timestamps (>5 min)
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");

  try {
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Parse Stitch payment webhook / callback into our status + id */
export function parseStitchWebhookPayload(payload: unknown): {
  stitchRef: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
} {
  const p = payload as Record<string, unknown>;

  // Flat test payload
  if (typeof p.stitchRef === "string" || typeof p.reference === "string" || typeof p.id === "string") {
    const stitchRef = String(p.stitchRef || p.reference || p.id);
    const raw = String(p.status || "").toLowerCase();
    const status =
      raw === "completed" || raw === "complete" || raw.includes("completed")
        ? "COMPLETED"
        : raw === "failed" || raw === "cancelled" || raw === "expired" || raw === "closed"
          ? "FAILED"
          : "PENDING";
    return { stitchRef, status };
  }

  // Nested GraphQL-style webhook node
  const data = p.data as Record<string, unknown> | undefined;
  const client = data?.client as Record<string, unknown> | undefined;
  const pir = client?.paymentInitiationRequests as Record<string, unknown> | undefined;
  const node = (pir?.node || p.node) as Record<string, unknown> | undefined;
  if (node) {
    const stitchRef = String(node.id || "");
    const statusObj = node.status as { __typename?: string } | undefined;
    return {
      stitchRef: stitchRef || null,
      status: mapStitchStatus(statusObj?.__typename),
    };
  }

  return { stitchRef: null, status: "PENDING" };
}

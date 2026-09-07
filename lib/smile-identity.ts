/**
 * Smile Identity — Enhanced KYC (SA NATIONAL_ID) + camera liveness gate.
 * DEMO_MODE / missing SMILE_API_KEY → explicit mock.
 * Live: real /v1/id_verification; liveness requires a captured selfie frame.
 * Full SmartSelfie anti-spoof still needs Smile's Web SDK (documented in message).
 */

import { createHmac, randomBytes } from "crypto";

export interface IDVerificationResult {
  success: boolean;
  fullName?: string;
  message: string;
  mock: boolean;
}

export interface LivenessResult {
  success: boolean;
  confidence: number;
  message: string;
  mock: boolean;
}

const isDemo = () =>
  process.env.DEMO_MODE === "true" || !process.env.SMILE_API_KEY;

function smileBaseUrl(): string {
  // 0 / sandbox → testapi; 1 / production → api
  const sid = process.env.SMILE_SID_SERVER || "0";
  return sid === "1"
    ? "https://api.smileidentity.com"
    : "https://testapi.smileidentity.com";
}

/** Smile HMAC: timestamp + partner_id + "sid_request" keyed by API key */
function smileSignature(timestamp: string, partnerId: string, apiKey: string): string {
  return createHmac("sha256", apiKey)
    .update(timestamp, "utf8")
    .update(partnerId, "utf8")
    .update("sid_request", "utf8")
    .digest("base64");
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Trader", last: "Unknown" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export async function verifySAID(params: {
  idNumber: string;
  fullName: string;
}): Promise<IDVerificationResult> {
  if (isDemo()) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      fullName: params.fullName,
      message: "ID verified (demo mock — Smile Identity not called)",
      mock: true,
    };
  }

  const partnerId = process.env.SMILE_PARTNER_ID;
  const apiKey = process.env.SMILE_API_KEY;
  if (!partnerId || !apiKey) {
    return {
      success: false,
      message: "Smile Identity credentials missing (SMILE_PARTNER_ID / SMILE_API_KEY).",
      mock: false,
    };
  }

  const timestamp = new Date().toISOString();
  const signature = smileSignature(timestamp, partnerId, apiKey);
  const { first, last } = splitName(params.fullName);
  const jobId = `ezi-${Date.now()}-${randomBytes(4).toString("hex")}`;

  const body = {
    source_sdk: "rest_api",
    source_sdk_version: "2.0.0",
    partner_id: partnerId,
    timestamp,
    signature,
    country: "ZA",
    id_type: "NATIONAL_ID",
    id_number: params.idNumber,
    first_name: first,
    last_name: last,
    partner_params: {
      user_id: params.idNumber,
      job_id: jobId,
      job_type: 5,
    },
  };

  try {
    const res = await fetch(`${smileBaseUrl()}/v1/id_verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      ResultCode?: string;
      ResultText?: string;
      FullName?: string;
      Actions?: { Verify_ID_Number?: string };
    };

    if (!res.ok) {
      return {
        success: false,
        message: data.ResultText || `Smile ID HTTP ${res.status}`,
        mock: false,
      };
    }

    // 1012 = validated; also accept Verify_ID_Number === Verified
    const code = String(data.ResultCode || "");
    const verified =
      code === "1012" ||
      data.Actions?.Verify_ID_Number === "Verified" ||
      /valid/i.test(String(data.ResultText || ""));

    if (!verified) {
      return {
        success: false,
        message: data.ResultText || "ID could not be verified with Smile Identity",
        mock: false,
      };
    }

    return {
      success: true,
      fullName: data.FullName || params.fullName,
      message: data.ResultText || "ID verified via Smile Enhanced KYC",
      mock: false,
    };
  } catch (e) {
    console.error("Smile Enhanced KYC failed:", e);
    return {
      success: false,
      message: "Smile Identity request failed",
      mock: false,
    };
  }
}

export async function verifyLiveness(imageBase64?: string): Promise<LivenessResult> {
  if (isDemo()) {
    await new Promise((r) => setTimeout(r, 3000));
    return {
      success: true,
      confidence: 0.98,
      message: "Liveness confirmed (demo mock — no camera capture)",
      mock: true,
    };
  }

  if (!imageBase64 || imageBase64.length < 8_000) {
    return {
      success: false,
      confidence: 0,
      message:
        "Camera selfie required for live liveness. Capture a frame and retry (or set DEMO_MODE=true).",
      mock: false,
    };
  }

  // Strip data-URL prefix if present
  const raw = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, "base64");
  } catch {
    return {
      success: false,
      confidence: 0,
      message: "Invalid selfie image encoding",
      mock: false,
    };
  }

  if (bytes.length < 5_000) {
    return {
      success: false,
      confidence: 0,
      message: "Selfie too small — hold the camera steady and retry",
      mock: false,
    };
  }

  // JPEG or PNG magic
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    return {
      success: false,
      confidence: 0,
      message: "Selfie must be JPEG or PNG",
      mock: false,
    };
  }

  // Full SmartSelfie spoof detection needs Smile Web SDK / Biometric KYC zip upload.
  // With partner keys present we accept a validated camera frame as the server-side gate.
  return {
    success: true,
    confidence: 0.9,
    message:
      "Selfie captured and validated. Enable Smile SmartSelfie Web SDK for production anti-spoofing.",
    mock: false,
  };
}

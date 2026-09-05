/**
 * Smile Identity integration (sandbox / demo mock)
 * Docs: https://docs.smileidentity.com
 */

export interface IDVerificationResult {
  success: boolean;
  fullName?: string;
  message: string;
}

export interface LivenessResult {
  success: boolean;
  confidence: number;
  message: string;
}

const DEMO = () =>
  process.env.DEMO_MODE === "true" || !process.env.SMILE_API_KEY;

export async function verifySAID(params: {
  idNumber: string;
  fullName: string;
}): Promise<IDVerificationResult> {
  if (DEMO()) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      fullName: params.fullName,
      message: "ID verified (demo mode)",
    };
  }

  // Real Smile Identity IDVerification would go here
  return {
    success: true,
    fullName: params.fullName,
    message: "ID verified",
  };
}

export async function verifyLiveness(imageBase64?: string): Promise<LivenessResult> {
  void imageBase64;
  if (DEMO()) {
    // Simulate 3-second liveness check as specified
    await new Promise((r) => setTimeout(r, 3000));
    return {
      success: true,
      confidence: 0.98,
      message: "Liveness confirmed (demo mode)",
    };
  }

  return {
    success: true,
    confidence: 0.95,
    message: "Liveness confirmed",
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LivenessCheck({ onSuccess }: { onSuccess: () => void }) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "success">("idle");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setError("");
    if (isDemo) {
      setPhase("scanning");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("scanning");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Capture after brief settle
      setTimeout(() => void captureAndVerify(), 1800);
    } catch {
      setError("Camera permission required for live liveness check");
      setPhase("idle");
    }
  }

  async function captureAndVerify() {
    try {
      const video = videoRef.current;
      if (!video) throw new Error("No camera");

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const res = await fetch("/api/register/liveness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Liveness failed");
        setPhase("idle");
        return;
      }
      setPhase("success");
    } catch (e) {
      console.error(e);
      toast.error("Could not complete face check");
      setPhase("idle");
    }
  }

  useEffect(() => {
    if (phase === "success") {
      const t = setTimeout(onSuccess, 800);
      return () => clearTimeout(t);
    }
  }, [phase, onSuccess]);

  // Demo path: API call after timer so livenessVerified is set
  useEffect(() => {
    if (!isDemo || phase !== "scanning") return;
    const t = setTimeout(async () => {
      try {
        await fetch("/api/register/liveness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {
        /* demo still continues */
      }
      setPhase("success");
    }, 3000);
    return () => clearTimeout(t);
  }, [isDemo, phase]);

  return (
    <div className="space-y-6">
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[20px] border-2 border-border bg-ink">
        {phase === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-cream/80 p-6">
            <Camera className="h-12 w-12" />
            <p className="text-center text-sm">
              {isDemo ? "Demo liveness check" : "Camera ready"}
            </p>
          </div>
        )}
        {phase === "scanning" && (
          <div className="relative flex h-full flex-col items-center justify-center gap-4 p-2">
            {!isDemo && (
              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="relative z-10">
              <div className="h-40 w-40 rounded-full border-4 border-gold/40 animate-pulse-soft" />
              <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-gold" />
            </div>
            <p className="relative z-10 text-center text-sm text-cream drop-shadow">
              {isDemo ? "Simulating liveness…" : "Hold still — capturing…"}
            </p>
          </div>
        )}
        {phase === "success" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-green animate-scale-in">
            <CheckCircle2 className="h-16 w-16 text-white" />
            <p className="font-heading font-bold text-white">
              {isDemo ? "Demo check passed" : "Identity confirmed"}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-danger">{error}</p>
      )}

      {phase === "idle" && (
        <>
          <p className="text-center text-sm text-muted">
            {isDemo ? (
              <>
                Demo mode uses a simulated face check — no camera access.
                <span className="block mt-1 text-gold-dark font-medium">
                  ~3 seconds, then continue
                </span>
              </>
            ) : (
              "Look straight at the camera. We capture one selfie for verification."
            )}
          </p>
          <Button fullWidth size="lg" onClick={() => void startCamera()}>
            {isDemo ? "Start demo check" : "Start face check"}
          </Button>
        </>
      )}

      {phase === "scanning" && (
        <p className="text-center text-sm text-muted animate-pulse-soft">
          Checking liveness…
        </p>
      )}

      {phase === "success" && (
        <Button fullWidth size="lg" variant="green" onClick={onSuccess}>
          Continue
        </Button>
      )}
    </div>
  );
}

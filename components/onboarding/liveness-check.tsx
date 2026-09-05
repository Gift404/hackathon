"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

export function LivenessCheck({ onSuccess }: { onSuccess: () => void }) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "success">("idle");

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => {
      setPhase("success");
    }, 3000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "success") {
      const t = setTimeout(onSuccess, 800);
      return () => clearTimeout(t);
    }
  }, [phase, onSuccess]);

  return (
    <div className="space-y-6">
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[20px] border-2 border-border bg-ink">
        {phase === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-cream/80 p-6">
            <Camera className="h-12 w-12" />
            <p className="text-center text-sm">Camera ready</p>
          </div>
        )}
        {phase === "scanning" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <div className="relative">
              <div className="h-40 w-40 rounded-full border-4 border-gold/40 animate-pulse-soft" />
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-gold animate-spin [animation-duration:3s]" />
              <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-gold" />
            </div>
            <p className="text-center text-sm text-cream">
              Look straight, blink once
            </p>
          </div>
        )}
        {phase === "success" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-green animate-scale-in">
            <CheckCircle2 className="h-16 w-16 text-white" />
            <p className="font-heading font-bold text-white">Identity confirmed</p>
          </div>
        )}
      </div>

      {phase === "idle" && (
        <>
          <p className="text-center text-sm text-muted">
            Look straight at the camera and blink once when prompted.
            {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
              <span className="block mt-1 text-gold-dark font-medium">
                Demo mode — simulated check (~3 seconds)
              </span>
            )}
          </p>
          <Button fullWidth size="lg" onClick={() => setPhase("scanning")}>
            Start face check
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

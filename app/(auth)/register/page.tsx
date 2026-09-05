"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegisterStore } from "@/lib/store";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";
import { validateSAID, validateSAPhone, normalizePhone } from "@/lib/utils";
import { LivenessCheck } from "@/components/onboarding/liveness-check";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const store = useRegisterStore();
  const setAuth = useAuthStore((s) => s.setTrader);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [traderResult, setTraderResult] = useState<{
    id: string;
    fullName: string;
    phone: string;
    tier: number;
    dailyLimit: number;
  } | null>(null);

  const step = store.step;

  async function handleDetailsContinue() {
    const errs: Record<string, string> = {};
    if (!store.fullName.trim() || store.fullName.trim().length < 2) {
      errs.fullName = "Enter your full name";
    }
    if (!validateSAID(store.idNumber)) {
      errs.idNumber = "Enter a valid 13-digit SA ID number";
    }
    if (!validateSAPhone(store.phone)) {
      errs.phone = "Enter a valid SA mobile (e.g. 0821234567)";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: store.fullName.trim(),
          idNumber: store.idNumber,
          phone: normalizePhone(store.phone),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      setTraderResult(data.trader);
      store.setStep(2);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLivenessSuccess() {
    store.setLivenessDone(true);
    if (traderResult) {
      await fetch("/api/register/liveness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traderId: traderResult.id }),
      });
    }
    store.setStep(3);
  }

  async function goToDashboard() {
    if (!traderResult) return;
    setLoading(true);
    try {
      // Create session via OTP shortcut in demo — auto-login after register
      const otpRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: traderResult.phone }),
      });
      const otpData = await otpRes.json();
      const code = otpData.demoCode || "000000";

      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: traderResult.phone, code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(verifyData.error || "Could not sign you in");
        router.push("/login");
        return;
      }
      setAuth({
        traderId: verifyData.trader.id,
        fullName: verifyData.trader.fullName,
        phone: verifyData.trader.phone,
      });
      store.reset();
      router.push("/dashboard");
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" />
          <span className="text-sm font-medium text-muted">
            Step {step} of 3
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-gold" : "bg-border"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h1 className="font-heading text-2xl font-bold text-ink">
                Your details
              </h1>
              <p className="mt-1 text-muted">
                We only need your name, ID, and phone to get started.
              </p>
            </div>
            <Input
              label="Full name"
              placeholder="Nomsa Dlamini"
              value={store.fullName}
              onChange={(e) =>
                store.setDetails({
                  fullName: e.target.value,
                  idNumber: store.idNumber,
                  phone: store.phone,
                })
              }
              error={errors.fullName}
              autoComplete="name"
            />
            <Input
              label="SA ID number"
              placeholder="9001015009087"
              inputMode="numeric"
              maxLength={13}
              value={store.idNumber}
              onChange={(e) =>
                store.setDetails({
                  fullName: store.fullName,
                  idNumber: e.target.value.replace(/\D/g, "").slice(0, 13),
                  phone: store.phone,
                })
              }
              error={errors.idNumber}
              hint="13 digits as on your ID book or smart card"
            />
            <Input
              label="Phone number"
              placeholder="0821234567"
              inputMode="tel"
              maxLength={10}
              value={store.phone}
              onChange={(e) =>
                store.setDetails({
                  fullName: store.fullName,
                  idNumber: store.idNumber,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              error={errors.phone}
              hint="SA mobile starting with 06, 07, or 08"
            />
            <Button
              fullWidth
              size="lg"
              loading={loading}
              onClick={handleDetailsContinue}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h1 className="font-heading text-2xl font-bold text-ink">
                Verify your identity
              </h1>
              <p className="mt-1 text-muted">
                We need to confirm it&apos;s really you
              </p>
            </div>
            <LivenessCheck onSuccess={handleLivenessSuccess} />
          </div>
        )}

        {step === 3 && (
          <div className="animate-scale-in space-y-8 text-center py-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green/15 animate-success-ring">
              <CheckCircle2 className="h-14 w-14 text-green" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-ink">
                Welcome to Imali Pay
                {traderResult ? `, ${traderResult.fullName.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-2 text-muted">You&apos;re ready to accept payments</p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-5 text-left space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Your merchant details
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Status</span>
                <span className="font-semibold text-green">Tier 1 Merchant</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Daily limit</span>
                <span className="font-semibold">
                  {formatZAR(traderResult?.dailyLimit ?? 5000)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">PayShap ID</span>
                <span className="font-semibold font-mono">
                  {traderResult?.phone ?? store.phone}
                </span>
              </div>
            </div>
            <Button fullWidth size="lg" loading={loading} onClick={goToDashboard}>
              Go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

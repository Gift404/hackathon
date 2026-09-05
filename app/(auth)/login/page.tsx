"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { validateSAPhone, normalizePhone, maskPhone } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setTrader);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendOtp() {
    setError("");
    if (!validateSAPhone(phone)) {
      setError("Enter a valid SA mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code");
        return;
      }
      if (data.demoCode) setDemoCode(data.demoCode);
      setStep("otp");
      setResendIn(30);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const verifyOtp = useCallback(
    async (code: string) => {
      if (code.length !== 6) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizePhone(phone), code }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid code");
          setOtp(["", "", "", "", "", ""]);
          inputs.current[0]?.focus();
          return;
        }
        setAuth({
          traderId: data.trader.id,
          fullName: data.trader.fullName,
          phone: data.trader.phone,
        });
        toast.success("Welcome back!");
        router.push("/dashboard");
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [phone, router, setAuth]
  );

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    const code = next.join("");
    if (code.length === 6) verifyOtp(code);
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    if (pasted.length === 6) verifyOtp(pasted);
    else inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-6 sm:px-6">
        <Logo size="sm" className="mb-10" />

        {step === "phone" && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h1 className="font-heading text-2xl font-bold text-ink">
                Welcome back
              </h1>
              <p className="mt-1 text-muted">
                Sign in with the phone number you registered with.
              </p>
            </div>
            <Input
              label="Phone number"
              placeholder="0821234567"
              inputMode="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              error={error}
              autoFocus
            />
            <Button fullWidth size="lg" loading={loading} onClick={sendOtp}>
              Send OTP
            </Button>
            <p className="text-center text-sm text-muted">
              New here?{" "}
              <Link href="/register" className="font-semibold text-gold-dark hover:underline">
                Get started free
              </Link>
            </p>
            <p className="text-center text-xs text-muted/80">
              Demo trader: 0821234567
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h1 className="font-heading text-2xl font-bold text-ink">
                Enter your code
              </h1>
              <p className="mt-1 text-muted">
                We sent a code to {maskPhone(normalizePhone(phone))}
              </p>
            </div>
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-14 w-12 rounded-[14px] border-2 border-border bg-white text-center font-heading text-xl font-bold outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-14"
                  disabled={loading}
                />
              ))}
            </div>
            {error && <p className="text-sm text-danger text-center">{error}</p>}
            {demoCode && (
              <p className="rounded-xl bg-gold/10 px-3 py-2 text-center text-sm text-gold-dark">
                Demo code: <strong className="font-mono">{demoCode}</strong>
              </p>
            )}
            <Button
              fullWidth
              size="lg"
              loading={loading}
              onClick={() => verifyOtp(otp.join(""))}
              disabled={otp.join("").length !== 6}
            >
              Verify
            </Button>
            <div className="text-center text-sm">
              {resendIn > 0 ? (
                <span className="text-muted">Resend code in {resendIn}s</span>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-gold-dark hover:underline min-h-[48px]"
                  onClick={sendOtp}
                >
                  Resend code
                </button>
              )}
            </div>
            <button
              type="button"
              className="mx-auto block text-sm text-muted hover:text-ink min-h-[48px]"
              onClick={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
            >
              Change number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

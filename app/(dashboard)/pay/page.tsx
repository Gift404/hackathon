"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatZAR, validateSAPhone, normalizePhone, maskPhone } from "@/lib/utils";
import { CheckCircle2, Delete, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";

type Method = "QR" | "PHONE" | null;
type Phase =
  | "amount"
  | "method"
  | "qr"
  | "phone-input"
  | "waiting"
  | "success";

interface SuccessData {
  amount: number;
  customer: string;
  time: string;
  reference: string;
}

export default function PayPage() {
  const router = useRouter();
  const [amountStr, setAmountStr] = useState("");
  const [, setMethod] = useState<Method>(null);
  const [phase, setPhase] = useState<Phase>("amount");
  const [customerPhone, setCustomerPhone] = useState("");
  const [qrData, setQrData] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [phoneError, setPhoneError] = useState("");

  const amount = parseFloat(amountStr) || 0;

  const pollStatus = useCallback(
    async (ref: string) => {
      try {
        const res = await fetch(`/api/pay/status/${ref}`);
        const data = await res.json();
        if (data.status === "COMPLETED") {
          setSuccess({
            amount: data.amount ?? amount,
            customer: data.customerName || data.customerPhone || "Customer",
            time: new Date().toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            reference: ref,
          });
          setPhase("success");
          try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.value = 0.08;
            o.start();
            o.stop(ctx.currentTime + 0.15);
          } catch {
            /* optional sound */
          }
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    },
    [amount]
  );

  useEffect(() => {
    if (phase !== "waiting" && phase !== "qr") return;
    if (!reference) return;
    const id = setInterval(() => {
      pollStatus(reference);
    }, 2000);
    return () => clearInterval(id);
  }, [phase, reference, pollStatus]);

  function pressDigit(d: string) {
    if (d === "." && amountStr.includes(".")) return;
    if (amountStr.replace(".", "").length >= 7) return;
    setAmountStr((s) => s + d);
  }

  function backspace() {
    setAmountStr((s) => s.slice(0, -1));
  }

  function continueToMethod() {
    if (amount < 1) {
      toast.error("Enter an amount of at least R1");
      return;
    }
    if (amount > 5000) {
      toast.error("Amount exceeds your daily limit");
      return;
    }
    setPhase("method");
  }

  async function startQR() {
    setMethod("QR");
    setLoading(true);
    try {
      const res = await fetch("/api/pay/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create QR");
        return;
      }
      setQrData(data.qrData);
      setReference(data.reference);
      setPhase("qr");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneRequest() {
    setPhoneError("");
    if (!validateSAPhone(customerPhone)) {
      setPhoneError("Enter a valid SA mobile number");
      return;
    }
    setMethod("PHONE");
    setLoading(true);
    try {
      const res = await fetch("/api/pay/request-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          customerPhone: normalizePhone(customerPhone),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not send request");
        return;
      }
      setReference(data.reference);
      setPhase("waiting");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function simulatePayment() {
    if (!reference) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pay/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (!res.ok) {
        toast.error("Simulation failed");
        return;
      }
      await pollStatus(reference);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAmountStr("");
    setMethod(null);
    setPhase("amount");
    setCustomerPhone("");
    setQrData("");
    setReference("");
    setSuccess(null);
  }

  if (phase === "success" && success) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green px-6 text-white animate-fade-up">
        <CheckCircle2 className="h-24 w-24 animate-success-ring" strokeWidth={1.5} />
        <p className="mt-6 font-heading text-2xl font-bold">Payment received</p>
        <p className="mt-4 font-heading text-5xl font-extrabold">
          {formatZAR(success.amount)}
        </p>
        <p className="mt-4 text-white/90">{success.customer}</p>
        <p className="text-sm text-white/70">{success.time}</p>
        <div className="mt-12 flex w-full max-w-sm flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            className="bg-white text-green hover:bg-white/90"
            onClick={reset}
          >
            Accept another
          </Button>
          <Button
            size="lg"
            fullWidth
            variant="outline"
            className="border-white/40 text-white hover:bg-white/10"
            onClick={() => router.push("/dashboard")}
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <PageHeader
        title="Accept Payment"
        backHref="/dashboard"
      />

      {phase === "amount" && (
        <div className="animate-fade-up space-y-6 pb-8">
          <div className="flex items-baseline justify-center gap-1 py-8">
            <span className="font-heading text-3xl font-bold text-muted">R</span>
            <input
              type="text"
              inputMode="decimal"
              readOnly
              value={amountStr || "0"}
              className="w-full max-w-[240px] bg-transparent text-center font-heading text-6xl font-extrabold text-ink outline-none"
            />
          </div>

          <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    key === "⌫" ? backspace() : pressDigit(key)
                  }
                  className="flex h-16 items-center justify-center rounded-2xl bg-white border border-border/80 font-heading text-2xl font-semibold text-ink transition-colors hover:bg-gold/10 active:bg-gold/20"
                >
                  {key === "⌫" ? <Delete className="h-6 w-6" /> : key}
                </button>
              )
            )}
          </div>

          <Button fullWidth size="lg" onClick={continueToMethod}>
            Continue
          </Button>
        </div>
      )}

      {phase === "method" && (
        <div className="animate-fade-up space-y-6 pb-8">
          <div className="text-center">
            <p className="text-sm text-muted">Amount</p>
            <p className="font-heading text-4xl font-bold text-ink">
              {formatZAR(amount)}
            </p>
          </div>
          <p className="text-center font-medium text-ink">
            How should the customer pay?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startQR}
              disabled={loading}
              className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-border bg-white p-4 transition-all hover:border-gold hover:bg-gold/5 active:scale-[0.98]"
            >
              <QrCode className="h-10 w-10 text-gold-dark" />
              <div>
                <p className="font-heading font-bold text-ink">QR Code</p>
                <p className="text-xs text-muted">Customer scans</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPhase("phone-input")}
              disabled={loading}
              className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-border bg-white p-4 transition-all hover:border-gold hover:bg-gold/5 active:scale-[0.98]"
            >
              <Smartphone className="h-10 w-10 text-green" />
              <div>
                <p className="font-heading font-bold text-ink">Phone Number</p>
                <p className="text-xs text-muted">Send request</p>
              </div>
            </button>
          </div>
          <Button variant="ghost" fullWidth onClick={() => setPhase("amount")}>
            Change amount
          </Button>
        </div>
      )}

      {phase === "phone-input" && (
        <div className="animate-fade-up space-y-6 pb-8">
          <div className="text-center">
            <p className="font-heading text-3xl font-bold">{formatZAR(amount)}</p>
          </div>
          <Input
            label="Customer's phone number"
            placeholder="0821234567"
            inputMode="tel"
            maxLength={10}
            value={customerPhone}
            onChange={(e) =>
              setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            error={phoneError}
            autoFocus
          />
          <Button fullWidth size="lg" loading={loading} onClick={sendPhoneRequest}>
            Send payment request
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setPhase("method")}>
            Back
          </Button>
        </div>
      )}

      {phase === "qr" && (
        <div className="animate-fade-up space-y-5 pb-8 text-center">
          <div>
            <p className="font-heading text-3xl font-bold">{formatZAR(amount)}</p>
            <p className="mt-1 text-muted">Show this to your customer</p>
          </div>
          <div className="mx-auto flex max-w-[280px] items-center justify-center rounded-[16px] bg-white p-5 border border-border shadow-sm">
            {qrData ? (
              <QRCodeSVG value={qrData} size={240} level="M" includeMargin />
            ) : (
              <div className="h-[240px] w-[240px] animate-pulse bg-border rounded" />
            )}
          </div>
          <p className="animate-pulse-soft text-sm font-medium text-gold-dark">
            Waiting for payment…
          </p>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <Button variant="secondary" fullWidth loading={loading} onClick={simulatePayment}>
              Simulate payment received
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={reset}>
            Cancel
          </Button>
        </div>
      )}

      {phase === "waiting" && (
        <div className="animate-fade-up space-y-6 py-12 text-center">
          <div className="mx-auto h-20 w-20 rounded-full border-4 border-gold/30 border-t-gold animate-spin" />
          <div>
            <p className="font-heading text-xl font-bold text-ink">
              Request sent to {maskPhone(normalizePhone(customerPhone))}
            </p>
            <p className="mt-2 animate-pulse-soft text-muted">
              Waiting for customer to approve…
            </p>
          </div>
          <p className="text-sm text-muted">
            They&apos;ll see a PayShap request in their banking app
          </p>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <Button variant="secondary" fullWidth loading={loading} onClick={simulatePayment}>
              Simulate approval
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={reset}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

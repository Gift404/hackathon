"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatZAR,
  formatPhoneDisplay,
  getInitials,
  getAmountToNextTier,
  getTierProgress,
} from "@/lib/utils";
import { TIER_CONFIG } from "@/types";
import { useAuthStore } from "@/lib/store";
import { Check, Lock, LogOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProfileData {
  trader: {
    id: string;
    fullName: string;
    phone: string;
    businessName: string | null;
    tier: number;
    dailyLimit: number;
    totalVerified: number;
    livenessVerified: boolean;
    idVerified: boolean;
    createdAt: string;
  };
  score: {
    overall: number;
    consistency: number;
    activeDays: number;
    avgRevenue: number;
  };
  daysTrading: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        const daysTrading = Math.max(
          1,
          Math.ceil(
            (Date.now() - new Date(d.trader.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        setData({
          trader: d.trader,
          score: d.score,
          daysTrading,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearAuth();
      router.push("/login");
    } catch {
      toast.error("Could not sign out");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4 py-6 animate-pulse">
        <div className="h-8 w-32 rounded-lg bg-border" />
        <div className="h-28 rounded-[14px] bg-border" />
        <div className="h-40 rounded-[14px] bg-border" />
      </div>
    );
  }

  const { trader, score, daysTrading } = data;
  const amountToNext = getAmountToNextTier(trader.totalVerified, trader.tier);
  const progress = getTierProgress(trader.totalVerified, trader.tier);

  return (
    <div className="space-y-5 py-2 pb-8">
      <PageHeader title="Profile" />

      {/* Trader card */}
      <Card className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold font-heading text-xl font-bold text-ink">
          {getInitials(trader.fullName)}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold text-ink truncate">
            {trader.fullName}
          </p>
          <p className="text-sm text-muted">{formatPhoneDisplay(trader.phone)}</p>
          <p className="text-xs text-muted mt-0.5">
            Member since {format(new Date(trader.createdAt), "MMM yyyy")}
          </p>
        </div>
      </Card>

      {/* Merchant status */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-heading font-bold text-ink">Merchant status</p>
          <span className="rounded-lg bg-gold/20 px-2.5 py-1 text-xs font-bold text-gold-dark">
            Tier {trader.tier}
          </span>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Daily limit</span>
            <span className="font-semibold">{formatZAR(trader.dailyLimit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">ID verified</span>
            <span className="text-green font-medium flex items-center gap-1">
              {trader.idVerified ? (
                <>
                  <Check className="h-4 w-4" /> Yes
                </>
              ) : (
                "Pending"
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Liveness check</span>
            <span className="text-green font-medium flex items-center gap-1">
              {trader.livenessVerified ? (
                <>
                  <Check className="h-4 w-4" /> Yes
                </>
              ) : (
                "Pending"
              )}
            </span>
          </div>
        </div>
      </Card>

      {/* Tier progression */}
      <Card>
        <p className="font-heading font-bold text-ink">Tier progression</p>
        <div className="mt-4 space-y-4">
          {TIER_CONFIG.map((t) => {
            const unlocked = trader.tier >= t.tier;
            const current = trader.tier === t.tier;
            return (
              <div
                key={t.tier}
                className={`rounded-xl border p-3 ${
                  current
                    ? "border-gold bg-gold/5"
                    : unlocked
                      ? "border-green/30 bg-green/5"
                      : "border-border opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">
                    Tier {t.tier} — {t.label}
                  </p>
                  {unlocked ? (
                    <Check className="h-4 w-4 text-green" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted" />
                  )}
                </div>
                <ul className="mt-2 space-y-0.5">
                  {t.perks.map((p) => (
                    <li key={p} className="text-xs text-muted">
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {trader.tier < 3 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted">Toward Tier {trader.tier + 1}</span>
              <span className="font-medium">{formatZAR(amountToNext)} to go</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Financial identity */}
      <Card>
        <p className="font-heading font-bold text-ink">Financial identity</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-cream-dark/80 p-3">
            <p className="text-xs text-muted">Verified turnover</p>
            <p className="font-heading font-bold text-ink">
              {formatZAR(trader.totalVerified)}
            </p>
          </div>
          <div className="rounded-xl bg-cream-dark/80 p-3">
            <p className="text-xs text-muted">Days trading</p>
            <p className="font-heading font-bold text-ink">{daysTrading}</p>
          </div>
          <div className="rounded-xl bg-cream-dark/80 p-3">
            <p className="text-xs text-muted">Consistency</p>
            <p className="font-heading font-bold text-ink">{score.consistency}%</p>
          </div>
          <div className="rounded-xl bg-cream-dark/80 p-3">
            <p className="text-xs text-muted">Score</p>
            <p className="font-heading font-bold text-ink">{score.overall}/100</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted leading-relaxed">
          This record is yours and grows over time — every verified payment
          strengthens your financial identity.
        </p>
      </Card>

      {/* Settings */}
      <Card padding="sm">
        <button
          type="button"
          className="flex w-full min-h-[48px] items-center px-2 text-left text-sm font-medium text-ink hover:bg-ink/5 rounded-lg"
          onClick={() => toast.message("Coming soon — demo focus is payments")}
        >
          Change phone number
        </button>
        <button
          type="button"
          className="flex w-full min-h-[48px] items-center px-2 text-left text-sm font-medium text-ink hover:bg-ink/5 rounded-lg"
          onClick={() => toast.message("Coming soon — demo focus is payments")}
        >
          Business name
        </button>
        <Button
          variant="ghost"
          fullWidth
          loading={signingOut}
          onClick={signOut}
          className="justify-start text-danger hover:bg-danger/5"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  formatZAR,
  getGreeting,
  formatPhoneDisplay,
  getAmountToNextTier,
  getTierProgress,
} from "@/lib/utils";
import { TIER_CONFIG, type DashboardData } from "@/types";
import { Bell, Plus, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4 py-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-border" />
        <div className="h-36 rounded-[14px] bg-border" />
        <div className="h-24 rounded-[14px] bg-border" />
        <div className="h-24 rounded-[14px] bg-border" />
      </div>
    );
  }

  const firstName = data.trader.fullName.split(" ")[0];
  const amountToNext = getAmountToNextTier(data.trader.totalVerified, data.trader.tier);
  const progress = getTierProgress(data.trader.totalVerified, data.trader.tier);
  const nextTier = TIER_CONFIG.find((t) => t.tier === data.trader.tier + 1);
  const monthProgress =
    data.lastMonthTotal > 0
      ? Math.min(100, (data.monthTotal / data.lastMonthTotal) * 100)
      : 100;

  const score = data.score;
  const circumference = 2 * Math.PI * 42;
  const scoreOffset = circumference - (score.overall / 100) * circumference;

  return (
    <div className="relative space-y-5 py-4 pb-8">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted">
            {data.trader.businessName || "Your stall"}
          </p>
        </div>
        <button
          className="relative flex h-12 w-12 items-center justify-center rounded-xl hover:bg-ink/5"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-ink" />
        </button>
      </div>

      {/* Today's earnings — gold */}
      <div className="animate-fade-up rounded-[16px] bg-gold p-6 shadow-lg shadow-gold/25">
        <p className="text-sm font-medium text-ink/70">Today&apos;s earnings</p>
        <p className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-ink">
          {formatZAR(data.todayTotal)}
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Today • {data.todayCount} transaction{data.todayCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* This month */}
      <Card className="animate-fade-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">This month</p>
            <p className="font-heading text-2xl font-bold text-ink">
              {formatZAR(data.monthTotal)}
            </p>
          </div>
          <p className="text-xs text-muted">
            vs {formatZAR(data.lastMonthTotal)} last month
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-dark">
          <div
            className="h-full rounded-full bg-green transition-all duration-700"
            style={{ width: `${monthProgress}%` }}
          />
        </div>
      </Card>

      {/* Tier progress */}
      <Card>
        <p className="text-sm font-semibold text-ink">Tier progress</p>
        <div className="mt-4 flex items-center justify-between text-xs font-medium">
          {TIER_CONFIG.map((t, i) => (
            <div key={t.tier} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    data.trader.tier >= t.tier
                      ? "bg-gold text-ink"
                      : "bg-border text-muted"
                  }`}
                >
                  {t.tier}
                </div>
                <span className={data.trader.tier >= t.tier ? "text-ink" : "text-muted"}>
                  Tier {t.tier}
                </span>
              </div>
              {i < TIER_CONFIG.length - 1 && (
                <div className="mx-1 mb-5 h-1 flex-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{
                      width:
                        data.trader.tier > t.tier
                          ? "100%"
                          : data.trader.tier === t.tier
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {nextTier && (
          <div className="mt-4 rounded-xl bg-cream-dark/80 p-3">
            <p className="text-sm font-medium text-ink">
              {formatZAR(amountToNext)} more to unlock Tier {nextTier.tier}
            </p>
            <ul className="mt-2 space-y-1">
              {nextTier.perks.slice(0, 3).map((p) => (
                <li key={p} className="text-xs text-muted">
                  • {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Financial identity score */}
      <Card>
        <p className="text-sm font-semibold text-ink">Financial identity score</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-border"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                className="text-green transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-xl font-bold text-ink">
                {score.overall}
              </span>
              <span className="text-[10px] text-muted">/100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Consistency</span>
              <span className="font-medium">{score.consistency}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Active days</span>
              <span className="font-medium">{score.activeDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Avg sale</span>
              <span className="font-medium">{formatZAR(score.avgRevenue)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-bold text-ink">Recent</h2>
          <Link
            href="/transactions"
            className="flex items-center gap-0.5 text-sm font-medium text-gold-dark"
          >
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {data.transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-white px-4 py-3"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  tx.status === "COMPLETED"
                    ? "bg-green"
                    : tx.status === "PENDING"
                      ? "bg-amber-400"
                      : "bg-danger"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{formatZAR(tx.amount)}</p>
                <p className="truncate text-xs text-muted">
                  {tx.customerName ||
                    (tx.customerPhone
                      ? formatPhoneDisplay(tx.customerPhone)
                      : tx.method === "PAYSHAP_QR"
                        ? "QR scan"
                        : "Customer")}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted">
                {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
          {data.transactions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No transactions yet — accept your first payment!
            </p>
          )}
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/pay"
        className="fixed bottom-24 right-4 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink shadow-xl shadow-gold/40 transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Accept payment"
      >
        <Plus className="h-8 w-8" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

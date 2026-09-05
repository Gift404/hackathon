"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { formatZAR, formatPhoneDisplay } from "@/lib/utils";
import { format, isToday, isYesterday, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

type Period = "today" | "week" | "month" | "all";

const tabs: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
];

export default function TransactionsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/transactions?period=${period}`)
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const d = new Date(tx.createdAt);
      if (period === "today") return isToday(d);
      if (period === "week") return isAfter(d, startOfWeek(now, { weekStartsOn: 1 }));
      if (period === "month") return isAfter(d, startOfMonth(now));
      return true;
    });
  }, [transactions, period]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const d = new Date(tx.createdAt);
      let key: string;
      if (isToday(d)) key = "Today";
      else if (isYesterday(d)) key = "Yesterday";
      else key = format(d, "EEEE, d MMM");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const total = filtered
    .filter((t) => t.status === "COMPLETED")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="py-2 pb-8">
      <PageHeader title="Transactions" />

      <div className="flex gap-1 overflow-x-auto pb-4 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            className={cn(
              "shrink-0 rounded-xl px-4 min-h-[40px] text-sm font-semibold transition-colors",
              period === tab.id
                ? "bg-gold text-ink"
                : "bg-white border border-border text-muted hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-[14px] bg-border" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="mb-2 flex items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  {label}
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-white px-4 py-3"
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        tx.status === "COMPLETED"
                          ? "bg-green"
                          : tx.status === "PENDING"
                            ? "bg-amber-400"
                            : "bg-danger"
                      )}
                      title={tx.status}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{formatZAR(tx.amount)}</p>
                      <p className="truncate text-xs text-muted">
                        {tx.customerPhone
                          ? formatPhoneDisplay(tx.customerPhone)
                          : tx.method === "PAYSHAP_QR"
                            ? "QR scan"
                            : "—"}{" "}
                        ·{" "}
                        {tx.method === "PAYSHAP_QR"
                          ? "PayShap QR"
                          : tx.method === "PAYSHAP_PHONE"
                            ? "Phone"
                            : "EFT"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {format(new Date(tx.createdAt), "HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-16 text-center text-muted">No transactions in this period</p>
          )}
        </div>
      )}

      <div className="sticky bottom-20 mt-8 rounded-[14px] border border-border bg-white p-4 shadow-lg md:bottom-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Total this period</span>
          <span className="font-bold text-ink">{formatZAR(total)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted">Transactions</span>
          <span className="font-semibold">{filtered.length}</span>
        </div>
      </div>
    </div>
  );
}

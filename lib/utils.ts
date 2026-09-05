import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TIER_CONFIG, type FinancialScore } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatZAR(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)} XXX ${digits.slice(6)}`;
  }
  return phone;
}

/** South African ID validation (13 digits + Luhn check) */
export function validateSAID(idNumber: string): boolean {
  if (!/^\d{13}$/.test(idNumber)) return false;

  const year = parseInt(idNumber.slice(0, 2), 10);
  void year;
  const month = parseInt(idNumber.slice(2, 4), 10);
  const day = parseInt(idNumber.slice(4, 6), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Citizenship digit (position 11): 0 = SA citizen, 1 = permanent resident
  const citizenship = parseInt(idNumber[10], 10);
  if (citizenship !== 0 && citizenship !== 1) return false;

  // Luhn checksum
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(idNumber[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** SA mobile: 06x, 07x, 08x — 10 digits */
export function validateSAPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^0[6-8]\d{8}$/.test(digits);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IMP-${ts}-${rand}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getTierFromTurnover(totalVerified: number) {
  let current = TIER_CONFIG[0];
  for (const tier of TIER_CONFIG) {
    if (totalVerified >= tier.requiredTurnover) {
      current = tier;
    }
  }
  return current;
}

export function getNextTier(currentTier: number) {
  return TIER_CONFIG.find((t) => t.tier === currentTier + 1) ?? null;
}

export function getAmountToNextTier(totalVerified: number, currentTier: number): number {
  const next = getNextTier(currentTier);
  if (!next) return 0;
  return Math.max(0, next.requiredTurnover - totalVerified);
}

export function getTierProgress(totalVerified: number, currentTier: number): number {
  const current = TIER_CONFIG.find((t) => t.tier === currentTier) ?? TIER_CONFIG[0];
  const next = getNextTier(currentTier);
  if (!next) return 100;
  const range = next.requiredTurnover - current.requiredTurnover;
  const progress = totalVerified - current.requiredTurnover;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

export function calculateFinancialScore(params: {
  totalVerified: number;
  transactions: { amount: number; createdAt: Date; status: string }[];
  memberSince: Date;
}): FinancialScore {
  const completed = params.transactions.filter((t) => t.status === "COMPLETED");
  const activeDays = new Set(
    completed.map((t) => t.createdAt.toISOString().slice(0, 10))
  ).size;

  const daysSinceJoin = Math.max(
    1,
    Math.ceil((Date.now() - params.memberSince.getTime()) / (1000 * 60 * 60 * 24))
  );

  const consistency = Math.min(100, Math.round((activeDays / Math.min(daysSinceJoin, 30)) * 100));
  const avgRevenue =
    completed.length > 0
      ? completed.reduce((s, t) => s + t.amount, 0) / completed.length
      : 0;

  const turnoverScore = Math.min(40, Math.round((params.totalVerified / 100000) * 40));
  const consistencyScore = Math.round(consistency * 0.35);
  const activityScore = Math.min(25, Math.round((activeDays / 30) * 25));

  const overall = Math.min(100, turnoverScore + consistencyScore + activityScore);

  return {
    overall,
    consistency,
    activeDays,
    avgRevenue: Math.round(avgRevenue * 100) / 100,
  };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

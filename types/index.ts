export type PaymentMethod = "PAYSHAP_QR" | "PAYSHAP_PHONE" | "EFT";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Trader {
  id: string;
  phone: string;
  idNumber: string;
  fullName: string;
  businessName: string | null;
  tier: number;
  dailyLimit: number;
  totalVerified: number;
  livenessVerified: boolean;
  idVerified: boolean;
  active: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  traderId: string;
  amount: number;
  currency: string;
  customerPhone: string | null;
  customerName: string | null;
  method: PaymentMethod;
  status: TransactionStatus;
  reference: string;
  stitchRef: string | null;
  createdAt: string;
  settledAt: string | null;
}

export interface PaymentLink {
  id: string;
  traderId: string;
  amount: number | null;
  qrData: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface DashboardData {
  trader: Trader;
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  lastMonthTotal: number;
  transactions: Transaction[];
  tier: number;
  tierProgress: number;
  amountToNextTier: number;
  score: FinancialScore;
}

export interface FinancialScore {
  overall: number;
  consistency: number;
  activeDays: number;
  avgRevenue: number;
}

export interface TierInfo {
  tier: number;
  dailyLimit: number;
  requiredTurnover: number;
  label: string;
  perks: string[];
}

export const TIER_CONFIG: TierInfo[] = [
  {
    tier: 1,
    dailyLimit: 5000,
    requiredTurnover: 0,
    label: "Starter",
    perks: [
      "Daily limit R5,000",
      "PayShap QR payments",
      "Phone payment requests",
    ],
  },
  {
    tier: 2,
    dailyLimit: 15000,
    requiredTurnover: 40000,
    label: "Growth",
    perks: [
      "Daily limit R15,000",
      "Faster settlement",
      "Business name on receipts",
      "Monthly statements",
    ],
  },
  {
    tier: 3,
    dailyLimit: 50000,
    requiredTurnover: 150000,
    label: "Pro",
    perks: [
      "Daily limit R50,000",
      "Priority support",
      "Bulk payment links",
      "Credit score export",
    ],
  },
];

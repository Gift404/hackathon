import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMER_NAMES = [
  "Sipho M.",
  "Thabo K.",
  "Lerato N.",
  "Fatima A.",
  "Johan P.",
  "Nomvula S.",
  "Kagiso D.",
  "Aisha B.",
  "Pieter V.",
  "Zanele H.",
];

const PHONES = [
  "0821112233",
  "0832223344",
  "0843334455",
  "0714445566",
  "0725556677",
  "0736667788",
  "0747778899",
  "0768889900",
];

function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(n: number, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Imali Pay demo data...");

  await prisma.transaction.deleteMany();
  await prisma.paymentLink.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.trader.deleteMany();

  // Valid Luhn SA ID (brief listed 9001015009087; checksum digit is 6)
  const trader = await prisma.trader.create({
    data: {
      phone: "0821234567",
      idNumber: "9001015009086",
      fullName: "Nomsa Dlamini",
      businessName: "Nomsa's Spaza Shop",
      tier: 1,
      dailyLimit: 5000,
      totalVerified: 0,
      livenessVerified: true,
      idVerified: true,
      createdAt: daysAgo(45),
    },
  });

  const transactions: {
    traderId: string;
    amount: number;
    currency: string;
    customerPhone: string | null;
    customerName: string | null;
    method: string;
    status: string;
    reference: string;
    stitchRef: string;
    createdAt: Date;
    settledAt: Date;
  }[] = [];

  // Spread ~R28,450 across last 30 days + a strong "today"
  let running = 0;
  const target = 28450;

  // Today: ~R2,340 across 14 transactions
  const todayAmounts = [
    150, 85, 200, 45, 120, 300, 75, 180, 95, 220, 160, 110, 250, 350,
  ];
  // adjust last to hit ~2340
  const todaySum = todayAmounts.reduce((a, b) => a + b, 0);
  todayAmounts[todayAmounts.length - 1] += 2340 - todaySum;

  todayAmounts.forEach((amount, i) => {
    const hour = 8 + Math.floor(i * 0.7);
    const minute = (i * 7) % 60;
    const createdAt = daysAgo(0, hour, minute);
    const method = i % 3 === 0 ? "PAYSHAP_PHONE" : "PAYSHAP_QR";
    const ref = `SEED-TODAY-${i + 1}`;
    transactions.push({
      traderId: trader.id,
      amount,
      currency: "ZAR",
      customerPhone: method === "PAYSHAP_PHONE" ? PHONES[i % PHONES.length] : null,
      customerName: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
      method,
      status: "COMPLETED",
      reference: ref,
      stitchRef: `STITCH-${ref}`,
      createdAt,
      settledAt: createdAt,
    });
    running += amount;
  });

  // Remaining days: fill to ~28,450
  let day = 1;
  let idx = 0;
  while (running < target - 50 && day <= 29) {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count && running < target; i++) {
      const remaining = target - running;
      const amount = Math.min(
        remaining,
        Math.round(randomBetween(20, 500) * 100) / 100
      );
      if (amount < 20) break;
      const hour = 7 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const createdAt = daysAgo(day, hour, minute);
      const method = idx % 2 === 0 ? "PAYSHAP_QR" : "PAYSHAP_PHONE";
      const ref = `SEED-D${day}-${i}-${idx}`;
      transactions.push({
        traderId: trader.id,
        amount,
        currency: "ZAR",
        customerPhone:
          method === "PAYSHAP_PHONE" ? PHONES[idx % PHONES.length] : null,
        customerName: CUSTOMER_NAMES[idx % CUSTOMER_NAMES.length],
        method,
        status: "COMPLETED",
        reference: ref,
        stitchRef: `STITCH-${ref}`,
        createdAt,
        settledAt: createdAt,
      });
      running += amount;
      idx++;
    }
    day++;
  }

  // Batch insert
  const batchSize = 50;
  for (let i = 0; i < transactions.length; i += batchSize) {
    await prisma.transaction.createMany({
      data: transactions.slice(i, i + batchSize),
    });
  }

  await prisma.trader.update({
    where: { id: trader.id },
    data: { totalVerified: Math.round(running * 100) / 100 },
  });

  console.log(`Created trader: ${trader.fullName} (${trader.phone})`);
  console.log(`Created ${transactions.length} transactions`);
  console.log(`Total verified: R${running.toFixed(2)}`);
  console.log("Demo login: 0821234567 (OTP shown in demo mode)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

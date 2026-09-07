import { prisma } from "./prisma";
import { getTierFromTurnover } from "./utils";
import { centsToRands, randsToCents } from "./money";

/**
 * Atomically complete a PENDING payment once.
 * Uses updateMany status guard + increment to avoid double-counting under races.
 */
export async function completePaymentOnce(params: {
  transactionId: string;
  traderId: string;
  amountCents: number;
  reference: string;
  method: string;
  customerName?: string | null;
}): Promise<{ completed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.updateMany({
      where: { id: params.transactionId, status: "PENDING" },
      data: {
        status: "COMPLETED",
        settledAt: new Date(),
        ...(params.customerName != null ? { customerName: params.customerName } : {}),
      },
    });

    if (updated.count === 0) {
      return { completed: false };
    }

    const trader = await tx.trader.update({
      where: { id: params.traderId },
      data: { totalVerifiedCents: { increment: params.amountCents } },
    });

    const tierInfo = getTierFromTurnover(centsToRands(trader.totalVerifiedCents));
    await tx.trader.update({
      where: { id: params.traderId },
      data: {
        tier: tierInfo.tier,
        dailyLimitCents: randsToCents(tierInfo.dailyLimit),
      },
    });

    if (params.method === "PAYSHAP_QR") {
      await tx.paymentLink.updateMany({
        where: {
          traderId: params.traderId,
          used: false,
          reference: params.reference,
        },
        data: { used: true },
      });
    }

    return { completed: true };
  });
}

import { redirect } from "next/navigation";
import { getCurrentTrader } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trader = await getCurrentTrader();
  if (!trader || !trader.phone.endsWith("628138307")) {
    redirect("/api/auth/demo-skip");
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="mx-auto max-w-lg px-4 sm:px-6 md:max-w-xl">{children}</div>
      <BottomNav />
    </div>
  );
}

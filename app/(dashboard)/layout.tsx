import { redirect } from "next/navigation";
import { getCurrentTrader } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trader = await getCurrentTrader();
  if (!trader) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <div className="mx-auto max-w-lg px-4 sm:px-6">{children}</div>
      <BottomNav />
    </div>
  );
}

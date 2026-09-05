"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Banknote, List, User } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/pay", label: "Pay", icon: Banknote },
  { href: "/transactions", label: "History", icon: List },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur-md pb-safe md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-colors",
                active ? "text-gold-dark" : "text-muted hover:text-ink"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "stroke-[2.5]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

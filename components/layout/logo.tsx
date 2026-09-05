import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { icon: "h-7 w-7 text-sm", text: "text-lg" },
    md: { icon: "h-9 w-9 text-base", text: "text-xl" },
    lg: { icon: "h-11 w-11 text-lg", text: "text-2xl" },
  };
  const s = sizes[size];

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 group", className)}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-gold font-heading font-bold text-ink shadow-sm shadow-gold/40 transition-transform group-hover:scale-105",
          s.icon
        )}
      >
        i
      </span>
      <span className={cn("font-heading font-bold text-ink tracking-tight", s.text)}>
        Imali <span className="text-gold-dark">Pay</span>
      </span>
    </Link>
  );
}

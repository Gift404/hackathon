import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

export function Card({
  className,
  padding = "md",
  children,
  ...props
}: CardProps) {
  const pads = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };
  return (
    <div
      className={cn(
        "rounded-[14px] bg-white border border-border/80 shadow-sm shadow-ink/5",
        pads[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

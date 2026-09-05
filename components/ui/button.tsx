import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "green";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-ink hover:bg-gold-dark shadow-sm shadow-gold/30 active:scale-[0.98]",
  secondary:
    "bg-ink text-white hover:bg-ink/90 active:scale-[0.98]",
  outline:
    "border-2 border-ink/15 bg-transparent text-ink hover:border-gold hover:bg-gold/5 active:scale-[0.98]",
  ghost: "bg-transparent text-ink hover:bg-ink/5 active:scale-[0.98]",
  danger: "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
  green:
    "bg-green text-white hover:bg-green-dark shadow-sm shadow-green/30 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-xl",
  md: "h-12 px-6 text-base rounded-[14px] min-h-[48px]",
  lg: "h-14 px-8 text-lg rounded-2xl min-h-[56px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-heading font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

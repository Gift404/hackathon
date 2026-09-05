import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink/80"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-[48px] rounded-[14px] border-2 bg-white px-4 py-3 text-base text-ink placeholder:text-muted/60 transition-colors outline-none",
            "focus:border-gold focus:ring-2 focus:ring-gold/20",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

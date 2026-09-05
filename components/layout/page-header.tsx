import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  backHref,
  right,
  className,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center gap-3 py-4",
        className
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-ink/5 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : (
        <div className="w-2" />
      )}
      <h1 className="flex-1 font-heading text-xl font-bold text-ink">{title}</h1>
      {right}
    </header>
  );
}

import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-linear-to-b from-[color-mix(in_oklch,var(--primary),white_14%)] to-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_2px_6px_-1px_oklch(0.45_0.12_48/0.45)]",
        className
      )}
      aria-hidden
    >
      <span className="font-mono text-[12px] font-semibold tracking-tight">{BRAND.initials}</span>
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-medium text-primary", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("reveal-on-scroll max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// "+12564800492" → "+1 (256) 480-0492"; other countries are shown as given.
export function formatDemoNumber(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

export const DEMO_NUMBER = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "";

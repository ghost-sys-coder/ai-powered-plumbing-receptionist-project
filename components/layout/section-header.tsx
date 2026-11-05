import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

// Header for a Card: icon tile, title, optional subtitle and action. Use it as
// the first child of <Card> in place of CardHeader so every panel in the app
// opens the same way.
export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: Icon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon strokeWidth={1.75} className="size-4.5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

// Label/value list with hairline dividers, for record details.
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-border/60 text-sm", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  children,
  stacked = false,
  mono = false,
}: {
  label: ReactNode;
  children: ReactNode;
  // Stacked rows put the value under the label (long text, IDs).
  stacked?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "py-2.5 first:pt-0 last:pb-0",
        stacked ? "space-y-1" : "flex items-baseline justify-between gap-4"
      )}
    >
      <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 font-medium",
          !stacked && "text-right",
          mono && "font-mono text-xs font-normal break-all"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

// Quiet empty state for inside a card.
export function EmptyNote({ icon: Icon, children }: { icon?: Icon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-inset ring-foreground/[0.04]">
      {Icon && <Icon strokeWidth={1.75} className="size-5 text-muted-foreground/70" />}
      {children}
    </div>
  );
}

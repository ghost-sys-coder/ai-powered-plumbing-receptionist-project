import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  // Small label above the title, e.g. the section or record type.
  eyebrow?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-xs font-medium tracking-wide text-primary">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

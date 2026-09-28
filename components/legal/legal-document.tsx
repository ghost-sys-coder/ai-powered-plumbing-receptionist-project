import * as React from "react";
import { legal } from "@/lib/legal";

type LegalDocumentProps = {
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
};

export function LegalDocument({ title, intro, children }: LegalDocumentProps) {
  return (
    <article className="animate-fade-up">
      <header className="border-b border-border pb-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Last updated {legal.lastUpdated}
        </p>
        <h1 className="mt-3 font-heading text-[34px] leading-tight font-semibold tracking-[-0.02em] sm:text-[40px]">
          {title}
        </h1>
        <div className="mt-4 text-[16px] leading-[1.7] text-muted-foreground">{intro}</div>
      </header>
      <div className="divide-y divide-border/60">{children}</div>
    </article>
  );
}

type LegalSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-8">
      <h2 className="font-heading text-[19px] font-semibold tracking-[-0.01em] text-foreground">
        <a href={`#${id}`} className="hover:underline underline-offset-4">
          {title}
        </a>
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.75] text-foreground/85 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h3]:pt-2 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function SupportEmailLink() {
  return <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>;
}

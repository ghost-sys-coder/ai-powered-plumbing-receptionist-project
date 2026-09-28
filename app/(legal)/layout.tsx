import Link from "next/link";
import { legal } from "@/lib/legal";

const links = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/data-deletion", label: "Data deletion" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            {legal.serviceName}
          </Link>
          <nav className="flex items-center gap-5 text-[13px] text-muted-foreground">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-8 text-[12.5px] text-muted-foreground">
          © {new Date().getFullYear()} {legal.companyName}. Questions?{" "}
          <a
            href={`mailto:${legal.supportEmail}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {legal.supportEmail}
          </a>
        </div>
      </footer>
    </div>
  );
}

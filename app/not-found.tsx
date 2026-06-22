import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <div className="text-center space-y-3">
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-sm">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button variant="default">Go to dashboard</Button>
        </Link>
        <Link href="/admin">
          <Button variant="outline">Admin</Button>
        </Link>
      </div>
    </div>
  );
}

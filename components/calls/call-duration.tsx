export function CallDuration({ seconds }: { seconds: number | null | undefined }) {
  if (!seconds) return <span className="text-muted-foreground">—</span>;
  if (seconds < 60) return <span>{seconds}s</span>;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return <span>{m}m {s}s</span>;
}

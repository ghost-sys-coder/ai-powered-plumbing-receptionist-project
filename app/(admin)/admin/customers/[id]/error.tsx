"use client";

export default function CustomerDetailError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Could not load this customer.</p>
      <button
        onClick={reset}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}

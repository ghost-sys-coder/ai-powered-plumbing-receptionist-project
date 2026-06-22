"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Could not load customers.</p>
      <button
        onClick={reset}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        Try again
      </button>
    </div>
  );
}

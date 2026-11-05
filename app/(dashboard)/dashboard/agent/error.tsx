"use client";

export default function AgentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Could not load agent settings.</p>
      <button onClick={reset} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Try again
      </button>
    </div>
  );
}

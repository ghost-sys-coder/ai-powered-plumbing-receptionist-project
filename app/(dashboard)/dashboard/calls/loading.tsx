import { Skeleton } from "@/components/ui/skeleton";

export default function CallsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32 animate-shimmer" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40 animate-shimmer" />
        <Skeleton className="h-10 w-36 animate-shimmer" />
        <Skeleton className="h-10 w-40 animate-shimmer" />
      </div>
      <div className="space-y-px rounded-md border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full animate-shimmer rounded-none" />
        ))}
      </div>
    </div>
  );
}

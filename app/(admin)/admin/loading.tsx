import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40 animate-shimmer" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 animate-shimmer rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 animate-shimmer rounded-lg" />
    </div>
  );
}

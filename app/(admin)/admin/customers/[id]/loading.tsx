import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28 animate-shimmer" />
      <Skeleton className="h-8 w-64 animate-shimmer" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 animate-shimmer rounded-lg" />
        <Skeleton className="h-64 animate-shimmer rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 animate-shimmer rounded-lg" />
        <Skeleton className="h-48 animate-shimmer rounded-lg" />
      </div>
    </div>
  );
}

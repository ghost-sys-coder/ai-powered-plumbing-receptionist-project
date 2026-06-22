import { Skeleton } from "@/components/ui/skeleton";

export default function CallDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-20 animate-shimmer" />
      <Skeleton className="h-8 w-64 animate-shimmer" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Skeleton className="h-96 animate-shimmer rounded-lg" />
          <Skeleton className="h-24 animate-shimmer rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 animate-shimmer rounded-lg" />
          <Skeleton className="h-36 animate-shimmer rounded-lg" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function AgentLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 animate-shimmer" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 animate-shimmer rounded-lg" />
        <Skeleton className="h-40 animate-shimmer rounded-lg" />
      </div>
      <Skeleton className="h-64 animate-shimmer rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 animate-shimmer rounded-lg" />
        <Skeleton className="h-48 animate-shimmer rounded-lg" />
      </div>
    </div>
  );
}

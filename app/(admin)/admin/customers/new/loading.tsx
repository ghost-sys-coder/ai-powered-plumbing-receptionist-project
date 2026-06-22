import { Skeleton } from "@/components/ui/skeleton";

export default function NewCustomerLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24 animate-shimmer" />
      <Skeleton className="h-8 w-48 animate-shimmer" />
      <Skeleton className="h-96 animate-shimmer rounded-lg" />
      <Skeleton className="h-64 animate-shimmer rounded-lg" />
    </div>
  );
}

"use client";

import { unstable_catchError as catchError, type ErrorInfo } from "next/error";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Contains a failure to one section of a page: the rest of the page still
// renders, and "Try again" re-fetches only this section's data.
function SectionErrorFallback({ message }: { message: string }, { unstable_retry }: ErrorInfo) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-6">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export const SectionErrorBoundary = catchError(SectionErrorFallback);

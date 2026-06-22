import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PricingTable = {
  serviceCallFee?: string;
  hourlyRate?: string;
  afterHoursSurcharge?: string;
  freeEstimates?: boolean;
};

export function PricingCard({ pricing }: { pricing: unknown }) {
  const p = pricing as PricingTable | null;

  if (!p) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not configured.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          {p.serviceCallFee && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service call fee</dt>
              <dd className="font-medium">{p.serviceCallFee}</dd>
            </div>
          )}
          {p.hourlyRate && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Hourly rate</dt>
              <dd className="font-medium">{p.hourlyRate}</dd>
            </div>
          )}
          {p.afterHoursSurcharge && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">After-hours surcharge</dt>
              <dd className="font-medium">{p.afterHoursSurcharge}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Free estimates</dt>
            <dd className="font-medium">{p.freeEstimates ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

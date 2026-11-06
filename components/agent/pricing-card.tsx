import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailList, DetailRow, EmptyNote, SectionHeader } from "@/components/layout/section-header";

type PricingTable = {
  serviceCallFee?: string;
  hourlyRate?: string;
  afterHoursSurcharge?: string;
  freeEstimates?: boolean;
};

export function PricingCard({ pricing }: { pricing: unknown }) {
  const p = pricing as PricingTable | null;

  return (
    <Card>
      <SectionHeader icon={Receipt} title="Pricing" description="Prices the receptionist can quote" />
      <div className="px-5">
        {!p ? (
          <EmptyNote>No prices set, so the receptionist won&apos;t quote any.</EmptyNote>
        ) : (
          <DetailList>
            {p.serviceCallFee && <DetailRow label="Call-out fee">{p.serviceCallFee}</DetailRow>}
            {p.hourlyRate && <DetailRow label="Hourly rate">{p.hourlyRate}</DetailRow>}
            {p.afterHoursSurcharge && <DetailRow label="After-hours surcharge">{p.afterHoursSurcharge}</DetailRow>}
            <DetailRow label="Free estimates">{p.freeEstimates ? "Yes" : "No"}</DetailRow>
          </DetailList>
        )}
      </div>
    </Card>
  );
}

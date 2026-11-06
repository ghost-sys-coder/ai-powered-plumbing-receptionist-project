import { Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyNote, SectionHeader } from "@/components/layout/section-header";

type Service = { name: string; price?: string };

export function ServicesCard({ services }: { services: unknown }) {
  const list = (services as Service[] | null)?.filter((s) => s?.name) ?? [];

  return (
    <Card>
      <SectionHeader icon={Wrench} title="Services" description="What the receptionist tells callers you offer" />
      <div className="px-5">
        {list.length === 0 ? (
          <EmptyNote>No services listed yet.</EmptyNote>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {list.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span>{s.name}</span>
                {s.price && <span className="tabular shrink-0 font-medium">{s.price}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

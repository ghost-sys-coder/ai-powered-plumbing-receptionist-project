import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Service = { name: string; price?: string };

export function ServicesCard({ services }: { services: unknown }) {
  const list = services as Service[] | null;

  if (!list?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services offered</CardTitle>
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
        <CardTitle className="text-base">Services offered</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {list.map((s, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{s.name}</span>
              {s.price && (
                <span className="text-muted-foreground">{s.price}</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

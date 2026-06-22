"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export type ServiceEntry = { name: string; price: string };

interface Props {
  value: ServiceEntry[];
  onChange: (value: ServiceEntry[]) => void;
}

export function ServicesInput({ value, onChange }: Props) {
  function add() {
    onChange([...value, { name: "", price: "" }]);
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: "name" | "price", val: string) {
    onChange(value.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));
  }

  return (
    <div className="space-y-2">
      {value.map((service, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Service name"
            value={service.name}
            onChange={(e) => update(i, "name", e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Price (optional)"
            value={service.price}
            onChange={(e) => update(i, "price", e.target.value)}
            className="w-36"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add service
      </Button>
    </div>
  );
}

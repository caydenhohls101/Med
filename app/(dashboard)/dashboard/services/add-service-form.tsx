"use client";

import { useState, useTransition } from "react";
import { addService } from "@/app/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export function AddServiceForm({ practiceId }: { practiceId: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const priceRand = parseFloat((form.elements.namedItem("price") as HTMLInputElement).value) || 0;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      durationMinutes: Number((form.elements.namedItem("durationMinutes") as HTMLInputElement).value) || 15,
      priceCents: Math.round(priceRand * 100),
      description: (form.elements.namedItem("description") as HTMLInputElement).value,
    };

    startTransition(async () => {
      const result = await addService(practiceId, data);
      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Service Name</Label>
        <Input id="name" name="name" required placeholder="General Consultation" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" placeholder="Brief description for patients" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={15} min={5} max={240} step={5} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (R)</Label>
          <Input id="price" name="price" type="number" defaultValue={0} min={0} step={0.01} placeholder="0.00" />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Adding…" : "Add Service"}
      </Button>
    </form>
  );
}

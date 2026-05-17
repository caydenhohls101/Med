"use client";

import { useState, useTransition } from "react";
import { addDoctor } from "@/app/actions/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const TITLES = ["Dr", "Prof", "Mr", "Mrs", "Ms", "Sister", "Adv"];

export function AddDoctorForm({ practiceId }: { practiceId: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = {
      fullName: (form.elements.namedItem("fullName") as HTMLInputElement).value,
      title: (form.elements.namedItem("title") as HTMLSelectElement).value,
      specialty: (form.elements.namedItem("specialty") as HTMLInputElement).value,
      hpcsaNumber: (form.elements.namedItem("hpcsaNumber") as HTMLInputElement).value,
      durationMinutes: Number((form.elements.namedItem("durationMinutes") as HTMLInputElement).value) || 15,
    };

    startTransition(async () => {
      const result = await addDoctor(practiceId, data);
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
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <select
            id="title"
            name="title"
            defaultValue="Dr"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" name="fullName" required placeholder="Jane Smith" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="specialty">Specialty</Label>
        <Input id="specialty" name="specialty" placeholder="General Practitioner" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hpcsaNumber">HPCSA Number</Label>
        <Input id="hpcsaNumber" name="hpcsaNumber" placeholder="MP0123456" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="durationMinutes">Default Slot Duration (minutes)</Label>
        <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={15} min={5} max={120} step={5} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Adding…" : "Add Doctor"}
      </Button>
    </form>
  );
}

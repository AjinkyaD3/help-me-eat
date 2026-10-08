"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { LocationPicker, type Picked } from "@/components/LocationPicker";
import { Button, Card, Field, PageHeader, SectionLabel, Skeleton } from "@/components/ui";

export default function NewPlaceView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { home, addPlace } = useStore();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [manualKm, setManualKm] = useState("");

  const onPicked = (p: Picked) => {
    setPicked(p);
    if (p.name) setName(p.name);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = addPlace({
      name: name.trim(),
      location: picked?.location,
      address: picked?.address,
      googlePlaceId: picked?.googlePlaceId,
      rating: picked?.rating ?? 0,
      manualKm: !picked && manualKm ? Number(manualKm) : undefined,
    });
    router.replace(`/places/${id}`);
  };

  if (!hydrated) return <Skeleton />;

  return (
    <form onSubmit={save}>
      <PageHeader title="Add a place" subtitle="Search or tap the map to pin it, then add its menu." />
      <LocationPicker home={home} onChange={onPicked} />

      <SectionLabel>Details</SectionLabel>
      <Card className="space-y-3">
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vaishali" />
        {picked?.address && <p className="text-sm text-muted">{picked.address}</p>}
        {!picked && (
          <Field label="Distance from home (km)" hint="Only needed if you don't pin it on the map." inputMode="decimal" value={manualKm} onChange={(e) => setManualKm(e.target.value)} />
        )}
      </Card>
      <Button type="submit" disabled={!name.trim()} className="mt-5 w-full">Save and add menu</Button>
    </form>
  );
}

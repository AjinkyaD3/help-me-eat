"use client";
import { useState } from "react";
import { APPETITE, CATEGORIES, type Appetite, type Dish } from "@/lib/types";
import { Button, Chip, Field, Segmented } from "./ui";

export type DishInput = Omit<Dish, "id" | "fav"> & { id?: string };

export function DishForm({ initial, onSave, onCancel }: { initial?: Dish; onSave: (d: DishInput) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [appetite, setAppetite] = useState<Appetite>(initial?.appetite ?? "med");
  const [category, setCategory] = useState(initial?.category ?? "Meal");
  const [veg, setVeg] = useState(initial?.veg ?? true);
  const priceNum = Number(price);
  const valid = name.trim().length > 0 && Number.isFinite(priceNum) && priceNum > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: initial?.id, name: name.trim(), price: Math.round(priceNum), appetite, category, veg });
    if (!initial) { setName(""); setPrice(""); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label="Dish" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer Thali" />
        <Field label="Price (₹)" required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="150" />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Appetite</p>
        <Segmented<Appetite> label="Appetite" value={appetite} onChange={setAppetite} options={(["low", "med", "high"] as Appetite[]).map((k) => ({ value: k, label: APPETITE[k].label }))} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Category</p>
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c} on={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}</div>
      </div>
      <div className="flex gap-2">
        <Chip on={veg} onClick={() => setVeg(true)}>Veg</Chip>
        <Chip on={!veg} onClick={() => setVeg(false)}>Non-veg</Chip>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid} className="flex-1">{initial ? "Save dish" : "Add dish"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

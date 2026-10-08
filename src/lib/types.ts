export type Appetite = "low" | "med" | "high";

export type Dish = {
  id: string;
  name: string;
  price: number;
  appetite: Appetite;
  category: string;
  veg: boolean;
  fav: boolean;
};

export type LatLng = { lat: number; lng: number };

export type Place = {
  id: string;
  name: string;
  address?: string;
  location?: LatLng;
  googlePlaceId?: string;
  manualKm?: number; // fallback when the place has no map location
  rating: number;
  swiggyUrl?: string;
  zomatoUrl?: string;
  dishes: Dish[];
  createdAt: number;
};

export type Pick = { id: string; dishId: string; dish: string; placeId: string; place: string; price: number; at: number };

export type Filters = {
  appetite: Appetite | "any";
  category: string;
  budget: number; // 0 = any
  maxKm: number; // 0 = any
  vegOnly: boolean;
  skipRecent: boolean;
};

export const CATEGORIES = ["Breakfast", "Street food", "Meal", "South Indian", "North Indian", "Chinese", "Snack", "Dessert", "Drinks"];

export const APPETITE: Record<Appetite, { label: string; hint: string }> = {
  low: { label: "Low", hint: "Just a bite" },
  med: { label: "Medium", hint: "Proper hungry" },
  high: { label: "High", hint: "Starving" },
};

import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ supabase: null, cloudEnabled: false }));
const { rotationFor } = await import("../candidates");
const { allowedDishes } = await import("../group");

describe("wheel landing", () => {
  it("lands the chosen slice's centre under the pointer, from any start angle", () => {
    for (const n of [1, 2, 3, 7, 8, 10]) {
      for (let idx = 0; idx < n; idx++) {
        for (const from of [0, 123.4, 2460.45, -90]) {
          const to = rotationFor(idx, n, from);
          const centre = idx * (360 / n) + 180 / n;
          const atPointer = (((centre + to) % 360) + 360) % 360;
          expect(Math.min(atPointer, 360 - atPointer)).toBeLessThan(1e-6);
          expect(to - from).toBeGreaterThanOrEqual(360 * 6); // always spins several turns
        }
      }
    }
  });
});

describe("group vetoes", () => {
  const dish = (id: string) => ({ id, name: id, place: "p", placeId: "p", price: 1, veg: true });
  const room = { code: "ABC123", host_id: "h", status: "voting" as const, result: null, created_at: "", dishes: ["a", "b", "c"].map(dish) };
  const member = (vetoes: string[]) => ({ room_code: "ABC123", user_id: Math.random().toString(), name: "x", vetoes, joined_at: "" });

  it("removes anything anyone vetoed", () => {
    expect(allowedDishes(room, [member(["a"]), member(["b"])]).map((d) => d.id)).toEqual(["c"]);
  });

  it("gives the full list back if everything was vetoed", () => {
    expect(allowedDishes(room, [member(["a", "b"]), member(["c"])]).map((d) => d.id)).toEqual(["a", "b", "c"]);
  });
});

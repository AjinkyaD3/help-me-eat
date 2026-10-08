"use client";
import { ensureSession } from "./auth";
import { shuffled } from "./candidates";
import { supabase } from "./supabase";

export type RoomDish = { id: string; name: string; place: string; placeId: string; price: number; veg: boolean; lat?: number; lng?: number };
export type RoomResult = { dishId: string; wheel: string[]; spunAt: number };
export type Room = { code: string; host_id: string; dishes: RoomDish[]; status: "voting" | "done"; result: RoomResult | null; created_at: string };
export type Member = { room_code: string; user_id: string; name: string; vetoes: string[]; joined_at: string };

export const MAX_VETOES = 2;
export const MAX_ROOM_DISHES = 10;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I/L

const db = () => {
  if (!supabase) throw new Error("Group spins aren't set up on this deployment.");
  return supabase;
};

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const normaliseCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export async function createRoom(dishes: RoomDish[], name: string): Promise<string> {
  await ensureSession();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newCode();
    const { error } = await db().from("rooms").insert({ code, dishes });
    if (!error) {
      await joinRoom(code, name);
      return code;
    }
    if (error.code !== "23505") throw new Error(error.message); // 23505 = code already taken, try another
  }
  throw new Error("Couldn't create a room. Try again.");
}

export async function loadRoom(code: string): Promise<{ room: Room | null; members: Member[] }> {
  const [r, m] = await Promise.all([
    db().from("rooms").select("*").eq("code", code).maybeSingle(),
    db().from("room_members").select("*").eq("room_code", code).order("joined_at"),
  ]);
  if (r.error) throw new Error(r.error.message);
  if (m.error) throw new Error(m.error.message);
  return { room: r.data as Room | null, members: (m.data ?? []) as Member[] };
}

export async function joinRoom(code: string, name: string) {
  const { error } = await db().from("room_members").upsert({ room_code: code, name: name.trim().slice(0, 30) }, { onConflict: "room_code,user_id" });
  if (error) throw new Error(error.message);
}

export async function setVetoes(code: string, userId: string, vetoes: string[]) {
  const { error } = await db().from("room_members").update({ vetoes: vetoes.slice(0, MAX_VETOES) }).eq("room_code", code).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Dishes nobody vetoed. If everything got vetoed, the group gets the full list back. */
export function allowedDishes(room: Room, members: Member[]) {
  const vetoed = new Set(members.flatMap((m) => m.vetoes));
  const ok = room.dishes.filter((d) => !vetoed.has(d.id));
  return ok.length ? ok : room.dishes;
}

export async function spinRoom(room: Room, members: Member[]) {
  const wheel = shuffled(allowedDishes(room, members)).map((d) => d.id);
  const dishId = wheel[Math.floor(Math.random() * wheel.length)];
  const result: RoomResult = { dishId, wheel, spunAt: Date.now() };
  const { error } = await db().from("rooms").update({ status: "done", result }).eq("code", room.code);
  if (error) throw new Error(error.message);
}

export async function reopenRoom(code: string) {
  const { error } = await db().from("rooms").update({ status: "voting", result: null }).eq("code", code);
  if (error) throw new Error(error.message);
}

export function subscribeRoom(code: string, onChange: () => void) {
  const channel = db()
    .channel(`room:${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_code=eq.${code}` }, onChange)
    .subscribe();
  return () => { void db().removeChannel(channel); };
}

export const mapsSearchUrl = (d: RoomDish) =>
  d.lat != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.place)}`;

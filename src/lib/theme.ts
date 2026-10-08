"use client";
import { useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";
import { THEME_KEY as KEY } from "./theme-script";
const EVENT = "foodspin-theme-change";


function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setTheme(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const color = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "#0f1112" : "#1F7A4D";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
  window.dispatchEvent(new Event(EVENT));
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); },
    read,
    () => "system",
  );
}

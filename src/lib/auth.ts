"use client";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "./supabase";

/** undefined = still loading, null = signed out. */
export const useAuth = create<{ session: Session | null | undefined }>(() => ({ session: supabase ? undefined : null }));

if (supabase) {
  supabase.auth.getSession().then(({ data }) => useAuth.setState({ session: data.session }));
  supabase.auth.onAuthStateChange((_event, session) => useAuth.setState({ session }));
}

export const useSession = () => useAuth((s) => s.session);

/** A real account (not a guest session created for joining a group spin). */
export const isMember = (s: Session | null | undefined): s is Session => !!s && !s.user.is_anonymous;

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error("Accounts aren't set up on this deployment.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/account` },
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Accounts aren't set up on this deployment.");
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/account` } });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/** Guests in a group spin get an anonymous session so database rules can tell people apart. */
export async function ensureSession(): Promise<Session> {
  if (!supabase) throw new Error("Group spins aren't set up on this deployment.");
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const res = await supabase.auth.signInAnonymously();
  if (res.error || !res.data.session) throw new Error("Couldn't join. Anonymous sign-ins may be turned off in Supabase.");
  return res.data.session;
}

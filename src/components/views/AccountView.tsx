"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Cloud, CloudOff, Mail, RefreshCw } from "lucide-react";
import { isMember, sendMagicLink, signInWithGoogle, signOut, useSession } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { syncNow, useSync } from "@/lib/sync";
import { Button, Card, Field, PageHeader, Skeleton } from "@/components/ui";

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 10 ? "just now" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

export default function AccountView() {
  const session = useSession();
  const { status, error, lastSyncedAt } = useSync();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const back = <Link href="/settings" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Settings</Link>;

  if (!cloudEnabled) {
    return (
      <>
        {back}
        <PageHeader title="Account" />
        <Card className="flex gap-3">
          <CloudOff className="mt-0.5 shrink-0 text-muted" size={20} />
          <p className="text-sm text-muted">Accounts aren&apos;t set up on this deployment yet, so your data stays on this device. The README explains how to connect Supabase.</p>
        </Card>
      </>
    );
  }
  if (session === undefined) return <Skeleton />;

  if (!isMember(session)) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true); setErr("");
      try { await sendMagicLink(email.trim()); setSent(true); }
      catch (e) { setErr((e as Error).message); }
      setBusy(false);
    };
    return (
      <>
        {back}
        <PageHeader title="Sign in" subtitle="Sync your places and history across your phone and laptop." />
        {sent ? (
          <Card className="text-center">
            <Mail className="mx-auto text-leaf" size={28} />
            <p className="mt-2 font-semibold">Check your email</p>
            <p className="mt-1 text-sm text-muted">We sent a sign-in link to {email}. Open it on this device.</p>
            <Button variant="ghost" className="mt-3" onClick={() => setSent(false)}>Use a different email</Button>
          </Card>
        ) : (
          <Card>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Email me a sign-in link"}</Button>
            </form>
            <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <Button variant="outline" className="w-full" onClick={() => signInWithGoogle().catch((e) => setErr(e.message))}>Continue with Google</Button>
            {err && <p role="alert" className="mt-3 text-sm text-chilli">{err}</p>}
          </Card>
        )}
        <p className="mt-4 text-xs text-muted">Places you&apos;ve already added on this device stay. When you sign in, they&apos;re uploaded to your account (or you&apos;ll be asked which copy to keep if your account already has data).</p>
      </>
    );
  }

  const label = { off: "Sync off", idle: lastSyncedAt ? `Synced ${ago(lastSyncedAt)}` : "Up to date", syncing: "Syncing…", error: "Sync problem", conflict: "Waiting for your choice" }[status];

  return (
    <>
      {back}
      <PageHeader title="Account" />
      <Card>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-semibold">{session.user.email}</p>
      </Card>
      <Card className="mt-3">
        <div className="flex items-center gap-3">
          <Cloud size={20} className={status === "error" ? "text-chilli" : "text-leaf"} />
          <div className="flex-1">
            <p className="font-semibold" aria-live="polite">{label}</p>
            {status === "error" && error && <p className="text-sm text-muted">{error}</p>}
          </div>
          <Button variant="outline" aria-label="Sync now" disabled={status === "syncing"} onClick={() => syncNow(session.user.id)}>
            <RefreshCw size={16} className={status === "syncing" ? "animate-spin" : ""} />
          </Button>
        </div>
      </Card>
      <Button variant="danger" className="mx-auto mt-6 flex" onClick={() => signOut()}>Sign out</Button>
      <p className="mt-2 text-center text-xs text-muted">Your data stays on this device after signing out.</p>
    </>
  );
}

"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Home, Upload, UserRound } from "lucide-react";
import { isMember, useSession } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { isBackup, useHydrated, useStore, type Backup } from "@/lib/store";
import { LocationPicker } from "@/components/LocationPicker";
import { Button, Card, PageHeader, SectionLabel, Segmented, Skeleton } from "@/components/ui";

export default function SettingsView() {
  const hydrated = useHydrated();
  const { home, setHome, places, history, importBackup, resetAll } = useStore();
  const [editingHome, setEditingHome] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const session = useSession();

  const exportData = () => {
    const backup: Backup = { version: 1, places, history, home };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `foodspin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error();
      if (!confirm(`Replace your current data with ${data.places.length} places from this backup?`)) return;
      importBackup(data);
      setMsg("Backup restored.");
    } catch {
      setMsg("That file isn't a FoodSpin backup.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!hydrated) return <Skeleton />;

  return (
    <>
      <PageHeader title="Settings" />

      <Link href="/account" className="flex items-center gap-3 rounded-2xl bg-card p-4 hover:bg-card/80">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-soft text-leaf"><UserRound size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{isMember(session) ? "Account" : "Sign in to sync"}</p>
          <p className="truncate text-sm text-muted">
            {!cloudEnabled ? "Not set up on this deployment" : isMember(session) ? session.user.email : "Use FoodSpin on your phone and laptop"}
          </p>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <SectionLabel>Appearance</SectionLabel>
      <Segmented<Theme> label="Theme" value={theme} onChange={setTheme} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />

      <SectionLabel>Home</SectionLabel>
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-soft text-leaf"><Home size={18} /></span>
          <div className="flex-1">
            <p className="font-semibold">{home ? "Home is set" : "No home set"}</p>
            <p className="text-sm text-muted">Used to measure distance to every pinned place.</p>
          </div>
          {!editingHome && <Button variant="outline" onClick={() => setEditingHome(true)}>{home ? "Change" : "Set"}</Button>}
        </div>
        {editingHome && (
          <div className="mt-4">
            <LocationPicker home={home} initial={home} searchable={false} onChange={(p) => setHome(p.location)} />
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => setEditingHome(false)}>Done</Button>
              {home && <Button variant="danger" onClick={() => { setHome(null); setEditingHome(false); }}>Remove</Button>}
            </div>
          </div>
        )}
      </Card>

      <SectionLabel>Your data</SectionLabel>
      <Card className="space-y-3">
        <p className="text-sm text-muted">{isMember(session) ? "Saved on this device and synced to your account. You can also keep a file backup." : "Everything is stored on this device. Sign in to sync, or export a backup file."}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={exportData}><Download size={16} /> Export</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => importData(e.target.files?.[0])} />
        {msg && <p role="status" className="text-sm font-medium">{msg}</p>}
      </Card>

      <SectionLabel>Install</SectionLabel>
      <Card>
        <p className="text-sm text-muted">On Android, open this site in Chrome, tap the ⋮ menu, then &ldquo;Add to Home screen&rdquo;. It opens full screen like a normal app.</p>
      </Card>

      <Button
        variant="danger"
        className="mx-auto mt-8 flex"
        onClick={() => confirm("Delete all places and history, and start over with sample data?") && resetAll()}
      >
        Reset everything
      </Button>
    </>
  );
}

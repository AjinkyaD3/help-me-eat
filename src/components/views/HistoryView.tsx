"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";

const dayLabel = (t: number) => {
  const d = new Date(t), today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

export default function HistoryView() {
  const hydrated = useHydrated();
  const { history, clearHistory } = useStore();

  const stats = useMemo(() => {
    if (!hydrated) return { monthSpend: 0, monthCount: 0, top: undefined };
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const thisMonth = history.filter((h) => h.at >= monthStart);
    const counts = new Map<string, number>();
    history.forEach((h) => counts.set(h.place, (counts.get(h.place) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { monthSpend: thisMonth.reduce((s, h) => s + h.price, 0), monthCount: thisMonth.length, top };
  }, [history, hydrated]);

  const groups = useMemo(() => {
    if (!hydrated) return [];
    const g = new Map<string, typeof history>();
    history.forEach((h) => { const k = dayLabel(h.at); g.set(k, [...(g.get(k) ?? []), h]); });
    return [...g.entries()];
  }, [history, hydrated]);

  if (!hydrated) return <Skeleton />;

  return (
    <>
      <PageHeader title="History" />
      {history.length === 0 ? (
        <Card className="py-10 text-center text-muted">
          Nothing yet. <Link href="/" className="font-semibold text-leaf">Spin</Link> and tap &ldquo;Lock it in&rdquo; to start your log.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card><p className="text-xs text-muted">This month</p><p className="text-2xl font-bold tabular-nums">₹{stats.monthSpend}</p><p className="text-xs text-muted">{stats.monthCount} meals</p></Card>
            <Card><p className="text-xs text-muted">Most visited</p><p className="truncate text-lg font-bold">{stats.top?.[0]}</p><p className="text-xs text-muted">{stats.top?.[1]} {stats.top?.[1] === 1 ? "time" : "times"}</p></Card>
          </div>
          {groups.map(([day, picks]) => (
            <section key={day}>
              <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{day}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
                {picks.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <div><p className="font-medium">{h.dish}</p><p className="text-sm text-muted">{h.place}</p></div>
                    <span className="font-semibold tabular-nums">₹{h.price}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Button variant="danger" className="mx-auto mt-6 flex" onClick={() => confirm("Clear all history?") && clearHistory()}>Clear history</Button>
        </>
      )}
    </>
  );
}

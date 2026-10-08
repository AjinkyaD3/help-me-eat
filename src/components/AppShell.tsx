"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Dices, Map as MapIcon, Settings, Store } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { cx } from "./ui";
import { SyncManager } from "./SyncManager";

const NAV = [
  { href: "/", label: "Spin", icon: Dices },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/places", label: "Places", icon: Store },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ variant, path }: { variant: "side" | "bottom"; path: string | null }) {
  const active = (href: string) => path != null && (href === "/" ? path === "/" : path.startsWith(href));
  return NAV.map(({ href, label, icon: Icon }) =>
    variant === "side" ? (
      <Link
        key={href}
        href={href}
        aria-current={active(href) ? "page" : undefined}
        className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
          active(href) ? "bg-leaf-soft text-leaf-dark" : "text-muted hover:bg-bg hover:text-ink")}
      >
        <Icon size={18} strokeWidth={2.2} /> {label}
      </Link>
    ) : (
      <Link
        key={href}
        href={href}
        aria-current={active(href) ? "page" : undefined}
        className={cx("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", active(href) ? "text-leaf" : "text-muted")}
      >
        <span className={cx("rounded-full px-4 py-1 transition", active(href) && "bg-leaf-soft")}><Icon size={20} strokeWidth={2.2} /></span>
        {label}
      </Link>
    ),
  );
}

function ActiveNav({ variant }: { variant: "side" | "bottom" }) {
  return <NavLinks variant={variant} path={usePathname()} />;
}

// The pathname isn't known while prerendering dynamic routes, so the nav renders
// without a highlighted tab first and fills in once the route resolves.
const Nav = ({ variant }: { variant: "side" | "bottom" }) => (
  <Suspense fallback={<NavLinks variant={variant} path={null} />}><ActiveNav variant={variant} /></Suspense>
);

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SyncManager />
      <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-line bg-card p-4 md:flex">
        <Link href="/" className="mb-6 px-3 text-xl font-bold tracking-tight text-ink">FoodSpin</Link>
        <Nav variant="side" />
      </nav>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:pb-12">{children}</main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5"><Nav variant="bottom" /></div>
      </nav>
    </div>
  );
}

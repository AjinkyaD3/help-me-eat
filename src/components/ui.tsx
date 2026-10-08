"use client";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger" };
export function Button({ variant = "primary", className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-leaf text-on-leaf hover:bg-leaf-dark",
        variant === "outline" && "border border-line bg-card text-ink hover:bg-bg",
        variant === "ghost" && "text-leaf hover:bg-leaf-soft",
        variant === "danger" && "text-chilli hover:bg-chilli/10",
        className,
      )}
    />
  );
}

export function LinkButton({ href, children, className, color }: { href: string; children: ReactNode; className?: string; color?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={color ? { backgroundColor: color, color: "#fff", borderColor: color } : undefined}
      className={cx("inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 active:scale-[0.98]", className)}
    >
      {children}
    </a>
  );
}

export function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={!!on}
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        on ? "border-ink bg-ink text-bg" : "border-line bg-card text-ink hover:border-muted",
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-track p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-lg py-2 text-sm font-semibold transition",
            value === o.value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      <input
        {...props}
        className={cx(
          "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20",
          className,
        )}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}>{children}</div>
);

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>
);

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export const Skeleton = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    <div className="h-8 w-2/3 animate-pulse rounded-lg bg-line" />
    <div className="h-24 animate-pulse rounded-2xl bg-line/70" />
    <div className="h-24 animate-pulse rounded-2xl bg-line/70" />
  </div>
);

export { cx };

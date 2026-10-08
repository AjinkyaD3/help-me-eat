"use client";

const SIZE = 300, C = SIZE / 2, R = C - 6;
const COLORS = ["#1F7A4D", "#F2A33A", "#D2453A", "#2F3A45"];

function slicePath(i: number, n: number) {
  if (n === 1) return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`;
  const a = (2 * Math.PI) / n;
  const pt = (t: number) => `${C + R * Math.sin(t)} ${C - R * Math.cos(t)}`;
  return `M ${C} ${C} L ${pt(i * a)} A ${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${pt((i + 1) * a)} Z`;
}

export function Wheel({ labels, rotation, onSpinEnd, instant = false }: { labels: string[]; rotation: number; onSpinEnd: () => void; instant?: boolean }) {
  const n = labels.length;
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div aria-hidden className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-ink" />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`mt-2.5 block w-full drop-shadow-sm ${instant ? "" : "transition-transform duration-[3600ms] ease-[cubic-bezier(.17,.9,.25,1)] motion-reduce:duration-200"}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={(e) => e.propertyName === "transform" && onSpinEnd()}
        role="img"
        aria-label={`Wheel with ${n} dishes: ${labels.join(", ")}`}
      >
        {labels.map((label, i) => {
          const mid = (360 / n) * (i + 0.5);
          const text = label.length > 15 ? label.slice(0, 14) + "…" : label;
          // Labels run along the radius; on the left half they're flipped so nothing reads upside down.
          const rad = (mid * Math.PI) / 180, r0 = R - 16;
          const x = C + r0 * Math.sin(rad), y = C - r0 * Math.cos(rad);
          const flip = mid > 180;
          return (
            <g key={i}>
              <path d={slicePath(i, n)} fill={COLORS[i % COLORS.length]} style={{ stroke: "var(--card)" }} strokeWidth={2} />
              <text
                x={x} y={y}
                fill="#fff" fontSize={12.5} fontWeight={600} dominantBaseline="middle"
                textAnchor={flip ? "start" : "end"}
                transform={`rotate(${mid - 90 + (flip ? 180 : 0)} ${x} ${y})`}
              >
                {text}
              </text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={22} style={{ fill: "var(--card)" }} />
      </svg>
    </div>
  );
}

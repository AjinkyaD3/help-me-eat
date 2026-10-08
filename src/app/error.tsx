"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold">Something went wrong.</p>
      <button onClick={reset} className="mt-3 font-semibold text-leaf">Try again</button>
    </div>
  );
}

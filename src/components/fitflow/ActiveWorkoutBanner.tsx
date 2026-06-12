import { Link, useRouterState } from "@tanstack/react-router";
import { Timer, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveWorkout } from "@/lib/active-workout";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function ActiveWorkoutBanner() {
  const active = useActiveWorkout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Hide when already on the pass page
  if (!active) return null;
  if (pathname.startsWith(`/pass/${active.schemaId}`)) return null;

  const elapsed = Math.max(0, Math.floor((now - active.startedAt) / 1000));

  return (
    <Link
      to="/pass/$schemaId"
      params={{ schemaId: active.schemaId }}
      search={{ day: active.day }}
      className="fixed bottom-20 inset-x-0 z-40 px-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="max-w-md mx-auto bg-primary text-primary-foreground rounded-2xl shadow-[0_20px_60px_-15px_oklch(0.78_0.22_150/0.6)] ring-1 ring-primary/40 px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider opacity-80 leading-none mb-1">
            Pågående pass
          </p>
          <p className="text-sm font-bold truncate flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            <span className="tabular-nums">{fmt(elapsed)}</span>
            <span className="opacity-80 font-medium">· Återgå till träning</span>
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0" />
      </div>
    </Link>
  );
}
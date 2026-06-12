import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Trophy, Flame, Lock, Sparkles, Check, Star, Gem, Medal,
  Crown, Rocket, Zap, Award, Dumbbell, Target, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({ component: AchievementsPage });

type Session = { completed_at: string; calories: number | null; volume_kg: number | null };

/* ───────────────────────── Stats ───────────────────────── */
function computeStats(sessions: Session[]) {
  const total = sessions.length;
  const points = sessions.reduce((sum, s) => sum + 50 + Math.round((s.calories || 0) / 5) + Math.round((Number(s.volume_kg) || 0) / 100), 0);
  const dayKeys = new Set(sessions.map((s) => new Date(s.completed_at).toISOString().slice(0, 10)));
  const sorted = Array.from(dayKeys).sort();
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(k);
    if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) run++; else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (dayKeys.has(k)) current++;
    else if (i === 0) continue;
    else break;
  }
  return { total, points, currentStreak: current, longestStreak: longest };
}

/* ───────────────────────── Data ───────────────────────── */
type Level = {
  id: string; name: string; tagline: string;
  passNeeded: number; icon: React.ReactNode; tone: string;
};

const LEVELS: Level[] = [
  { id: "rookie",    name: "Rookie",    tagline: "Välkommen till FitFlow",          passNeeded: 0,   icon: <Sparkles className="h-5 w-5" />, tone: "oklch(0.75 0.16 145)" },
  { id: "beginner",  name: "Beginner",  tagline: "Du har hittat rytmen",            passNeeded: 3,   icon: <Rocket   className="h-5 w-5" />, tone: "oklch(0.75 0.18 70)"  },
  { id: "aktiv",     name: "Aktiv",     tagline: "Träning är en del av livet",      passNeeded: 10,  icon: <Flame    className="h-5 w-5" />, tone: "oklch(0.72 0.20 30)"  },
  { id: "dedikerad", name: "Dedikerad", tagline: "Disciplin på elit-nivå",          passNeeded: 25,  icon: <Zap      className="h-5 w-5" />, tone: "oklch(0.78 0.18 200)" },
  { id: "elit",      name: "Elit",      tagline: "Få når hit – du är en av dem",    passNeeded: 50,  icon: <Trophy   className="h-5 w-5" />, tone: "oklch(0.72 0.20 320)" },
  { id: "legend",    name: "Legend",    tagline: "Inspirerar andra varje dag",      passNeeded: 100, icon: <Crown    className="h-5 w-5" />, tone: "oklch(0.78 0.17 90)"  },
];

type Ach = {
  id: string; group: "Pass" | "Streak" | "Poäng";
  name: string; desc: string;
  icon: React.ReactNode; tone: string;
  unlocked: (s: ReturnType<typeof computeStats>) => boolean;
  progress: (s: ReturnType<typeof computeStats>) => { now: number; goal: number };
};

const ACHS: Ach[] = [
  // PASS
  { id: "first_step", group: "Pass", name: "Första steget!", desc: "Genomför ditt första pass", icon: <Dumbbell className="h-5 w-5" />, tone: "oklch(0.75 0.18 145)", unlocked: (s) => s.total >= 1,  progress: (s) => ({ now: Math.min(s.total, 1),  goal: 1 }) },
  { id: "great_start",group: "Pass", name: "Bra start!",     desc: "5 genomförda pass",         icon: <TrendingUp className="h-5 w-5" />, tone: "oklch(0.76 0.18 175)", unlocked: (s) => s.total >= 5,  progress: (s) => ({ now: Math.min(s.total, 5),  goal: 5 }) },
  { id: "routine",    group: "Pass", name: "Rutin byggd!",   desc: "10 genomförda pass",        icon: <Flame    className="h-5 w-5" />, tone: "oklch(0.72 0.20 35)",  unlocked: (s) => s.total >= 10, progress: (s) => ({ now: Math.min(s.total, 10), goal: 10 }) },
  { id: "veteran",    group: "Pass", name: "Veteran",        desc: "50 genomförda pass",        icon: <Award    className="h-5 w-5" />, tone: "oklch(0.72 0.20 320)", unlocked: (s) => s.total >= 50, progress: (s) => ({ now: Math.min(s.total, 50), goal: 50 }) },
  { id: "legendary",  group: "Pass", name: "Legendarisk",    desc: "100 genomförda pass",       icon: <Crown    className="h-5 w-5" />, tone: "oklch(0.78 0.17 90)",  unlocked: (s) => s.total >= 100,progress: (s) => ({ now: Math.min(s.total, 100),goal: 100 }) },

  // STREAK
  { id: "streak3",    group: "Streak", name: "3 i rad!",       desc: "3 dagars streak",  icon: <Flame className="h-5 w-5" />, tone: "oklch(0.72 0.20 30)",  unlocked: (s) => s.longestStreak >= 3,  progress: (s) => ({ now: Math.min(s.longestStreak, 3),  goal: 3 }) },
  { id: "streak7",    group: "Streak", name: "En hel vecka!",  desc: "7 dagars streak",  icon: <Flame className="h-5 w-5" />, tone: "oklch(0.72 0.20 30)",  unlocked: (s) => s.longestStreak >= 7,  progress: (s) => ({ now: Math.min(s.longestStreak, 7),  goal: 7 }) },
  { id: "streak14",   group: "Streak", name: "Två veckor!",    desc: "14 dagars streak", icon: <Flame className="h-5 w-5" />, tone: "oklch(0.72 0.20 30)",  unlocked: (s) => s.longestStreak >= 14, progress: (s) => ({ now: Math.min(s.longestStreak, 14), goal: 14 }) },
  { id: "streak30",   group: "Streak", name: "En hel månad!",  desc: "30 dagars streak", icon: <Flame className="h-5 w-5" />, tone: "oklch(0.72 0.20 30)",  unlocked: (s) => s.longestStreak >= 30, progress: (s) => ({ now: Math.min(s.longestStreak, 30), goal: 30 }) },

  // POÄNG
  { id: "p100",  group: "Poäng", name: "Samlare!",       desc: "100 poäng totalt",  icon: <Star  className="h-5 w-5" />, tone: "oklch(0.82 0.18 90)",  unlocked: (s) => s.points >= 100,  progress: (s) => ({ now: Math.min(s.points, 100),  goal: 100 }) },
  { id: "p500",  group: "Poäng", name: "Poängkrossare!", desc: "500 poäng totalt",  icon: <Gem   className="h-5 w-5" />, tone: "oklch(0.78 0.18 220)", unlocked: (s) => s.points >= 500,  progress: (s) => ({ now: Math.min(s.points, 500),  goal: 500 }) },
  { id: "p1000", group: "Poäng", name: "Elitträning!",   desc: "1 000 poäng totalt",icon: <Zap   className="h-5 w-5" />, tone: "oklch(0.78 0.18 260)", unlocked: (s) => s.points >= 1000, progress: (s) => ({ now: Math.min(s.points, 1000), goal: 1000 }) },
  { id: "p2500", group: "Poäng", name: "Mästare!",       desc: "2 500 poäng totalt",icon: <Medal className="h-5 w-5" />, tone: "oklch(0.78 0.18 30)",  unlocked: (s) => s.points >= 2500, progress: (s) => ({ now: Math.min(s.points, 2500), goal: 2500 }) },
];

/* ───────────────────────── Page ───────────────────────── */
function AchievementsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("workout_sessions")
        .select("completed_at,calories,volume_kg")
        .eq("user_id", u.user.id)
        .limit(500);
      if (data) setSessions(data as Session[]);
      setLoaded(true);
    })();
  }, []);

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  // Current level = highest level with passNeeded <= total
  const currentIdx = useMemo(() => {
    let i = 0;
    for (let k = 0; k < LEVELS.length; k++) if (stats.total >= LEVELS[k].passNeeded) i = k;
    return i;
  }, [stats.total]);
  const current = LEVELS[currentIdx];
  const next = LEVELS[currentIdx + 1] ?? null;
  const toNext = next ? Math.max(0, next.passNeeded - stats.total) : 0;
  const levelProgress = next
    ? Math.min(1, (stats.total - current.passNeeded) / Math.max(1, next.passNeeded - current.passNeeded))
    : 1;

  const unlockedCount = ACHS.filter((a) => a.unlocked(stats)).length;

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      {/* ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full blur-3xl opacity-60"
          style={{ background: `radial-gradient(closest-side, ${current.tone}40, transparent 70%)` }} />
        <div className="absolute top-1/3 -right-24 h-[320px] w-[320px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(closest-side, oklch(0.7 0.2 320 / 0.45), transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-md mx-auto flex items-center gap-2 px-3 py-3">
          <button onClick={() => navigate({ to: "/profil" })} className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold tracking-wide">Achievements</h1>
          <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {unlockedCount}/{ACHS.length}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-6">

        {/* HERO LEVEL CARD */}
        <section
          className="relative overflow-hidden rounded-3xl border p-5"
          style={{
            background: `linear-gradient(135deg, ${current.tone}22 0%, oklch(0.15 0.02 270) 60%)`,
            borderColor: `${current.tone}55`,
            boxShadow: `0 30px 80px -40px ${current.tone}, inset 0 1px 0 ${current.tone}22`,
          }}
        >
          {/* shine */}
          <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-40" style={{ background: current.tone }} />

          <div className="flex items-center gap-4">
            <div
              className="relative h-16 w-16 rounded-2xl grid place-items-center text-zinc-950 font-black"
              style={{ background: `conic-gradient(from 180deg, ${current.tone}, oklch(0.95 0.05 90), ${current.tone})`, boxShadow: `0 0 30px ${current.tone}80` }}
            >
              <div className="absolute inset-[3px] rounded-[14px] bg-zinc-950 grid place-items-center" style={{ color: current.tone }}>
                {current.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Nuvarande nivå · {currentIdx + 1}/{LEVELS.length}</p>
              <p className="text-2xl font-extrabold tracking-tight" style={{ color: current.tone }}>{current.name}</p>
              <p className="text-xs text-foreground/70">{current.tagline}</p>
            </div>
          </div>

          {next ? (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Nästa: <span className="font-semibold text-foreground">{next.name}</span></span>
                <span className="tabular-nums font-semibold" style={{ color: current.tone }}>{toNext} pass kvar</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                  style={{
                    width: `${levelProgress * 100}%`,
                    background: `linear-gradient(90deg, ${current.tone}, oklch(0.85 0.18 90))`,
                    boxShadow: `0 0 14px ${current.tone}`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-5 text-xs text-foreground/80 font-semibold">🏆 Max nivå uppnådd – du är i toppen!</p>
          )}
        </section>

        {/* QUICK STATS */}
        <section className="grid grid-cols-3 gap-2">
          <StatChip icon={<Dumbbell className="h-3.5 w-3.5" />} label="Pass" value={stats.total} tone="oklch(0.75 0.18 145)" />
          <StatChip icon={<Flame    className="h-3.5 w-3.5" />} label="Streak" value={`${stats.currentStreak}d`} tone="oklch(0.72 0.20 30)" />
          <StatChip icon={<Star     className="h-3.5 w-3.5" />} label="Poäng"  value={stats.points} tone="oklch(0.82 0.18 90)" />
        </section>

        {/* JOURNEY / LEVELS */}
        <section>
          <SectionHeader icon={<Target className="h-4 w-4" />} title="Din resa" hint={`${currentIdx + 1}/${LEVELS.length}`} />
          <div className="relative pl-5 mt-3">
            {/* vertical rail */}
            <div aria-hidden className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent" />
            <div className="space-y-3">
              {LEVELS.map((lv, i) => {
                const state: "done" | "current" | "locked" =
                  i < currentIdx ? "done" : i === currentIdx ? "current" : "locked";
                return <LevelRow key={lv.id} level={lv} state={state} totalPass={stats.total} />;
              })}
            </div>
          </div>
        </section>

        {/* ACHIEVEMENTS GROUPS */}
        {(["Pass", "Streak", "Poäng"] as const).map((g) => (
          <section key={g}>
            <SectionHeader
              icon={g === "Pass" ? <Dumbbell className="h-4 w-4" /> : g === "Streak" ? <Flame className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              title={g}
              hint={`${ACHS.filter((a) => a.group === g && a.unlocked(stats)).length}/${ACHS.filter((a) => a.group === g).length}`}
            />
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              {ACHS.filter((a) => a.group === g).map((a) => (
                <AchievementCard key={a.id} ach={a} stats={stats} />
              ))}
            </div>
          </section>
        ))}

        {!loaded && <p className="text-center text-xs text-muted-foreground py-6">Laddar din resa…</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Atoms ───────────────────────── */
function SectionHeader({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/90">{title}</h2>
      {hint && <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{hint}</span>}
    </div>
  );
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur p-3 overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 0% 0%, ${tone}, transparent 60%)` }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span style={{ color: tone }}>{icon}</span>{label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}

function LevelRow({ level, state, totalPass }: { level: Level; state: "done" | "current" | "locked"; totalPass: number }) {
  const done    = state === "done";
  const cur     = state === "current";
  const locked  = state === "locked";

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl border p-3 transition ${
        cur    ? "bg-card border-transparent" :
        done   ? "bg-success/5 border-success/30" :
                 "bg-card/40 border-border/50 opacity-60"
      }`}
      style={cur ? { borderColor: `${level.tone}66`, boxShadow: `0 0 0 1px ${level.tone}33, 0 14px 40px -20px ${level.tone}` } : undefined}
    >
      {/* timeline dot */}
      <span
        className="absolute -left-5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ring-4 ring-background"
        style={{ background: cur ? level.tone : done ? "oklch(0.7 0.17 145)" : "oklch(0.4 0.02 270)" }}
      />
      <div
        className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
        style={
          locked
            ? { background: "oklch(0.2 0.01 270)", color: "oklch(0.5 0.02 270)" }
            : { background: `${level.tone}1f`, color: level.tone, boxShadow: cur ? `0 0 18px ${level.tone}55` : undefined }
        }
      >
        {locked ? <Lock className="h-4 w-4" /> : level.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold" style={{ color: cur ? level.tone : undefined }}>{level.name}</p>
          {cur  && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: `${level.tone}22`, color: level.tone }}>Din nivå</span>}
          {done && <Check className="h-3.5 w-3.5 text-success" />}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {locked ? `Lås upp: ${level.passNeeded} träningspass` : done ? "Avklarad" : level.tagline}
        </p>
      </div>
      {!done && !cur && (
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {totalPass}/{level.passNeeded}
        </span>
      )}
    </div>
  );
}

function AchievementCard({ ach, stats }: { ach: Ach; stats: ReturnType<typeof computeStats> }) {
  const unlocked = ach.unlocked(stats);
  const { now, goal } = ach.progress(stats);
  const pct = Math.min(1, now / goal);

  if (!unlocked) {
    return (
      <div className="relative rounded-2xl border border-border/60 bg-card/40 p-3 overflow-hidden">
        <div className="flex items-start gap-2">
          <div className="h-9 w-9 rounded-lg grid place-items-center bg-secondary/60 text-muted-foreground/70 shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground/70 truncate">{ach.name}</p>
            <p className="text-[10.5px] text-muted-foreground/80 leading-tight">{ach.desc}</p>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-muted-foreground/40 transition-[width]" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/80">{now} / {goal}</p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl border p-3 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${ach.tone}22 0%, oklch(0.16 0.02 270) 70%)`,
        borderColor: `${ach.tone}55`,
        boxShadow: `0 14px 40px -24px ${ach.tone}`,
      }}
    >
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-50" style={{ background: ach.tone }} />
      <div className="relative flex items-start gap-2">
        <div
          className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
          style={{ background: `${ach.tone}28`, color: ach.tone, boxShadow: `0 0 14px ${ach.tone}55` }}
        >
          {ach.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: ach.tone }}>{ach.name}</p>
          <p className="text-[10.5px] text-foreground/75 leading-tight">{ach.desc}</p>
        </div>
        <Check className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: ach.tone }} />
      </div>
    </div>
  );
}
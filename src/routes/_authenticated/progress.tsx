import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dumbbell, Scale, HeartPulse, Flame, Sparkles, Calendar, Timer,
  Share2, Trash2, ChevronDown, TrendingUp, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progress")({ component: ProgressPage });

type Session = {
  id: string;
  name: string;
  duration_min: number | null;
  calories: number | null;
  volume_kg: number | null;
  exercises_count: number | null;
  improved_count: number | null;
  completed_at: string;
};
type Weight = { id: string; weight_kg: number; logged_at: string };

type TabKey = "Övningar" | "Pass" | "Vikt" | "Hälsodata";
type MetricKey = "Tid (min)" | "Kalorier" | "Volym (kg)";

function ProgressPage() {
  const [tab, setTab] = useState<TabKey>("Vikt");
  const [metric, setMetric] = useState<MetricKey>("Tid (min)");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);

  const reload = async () => {
    const [{ data: s }, { data: w }, { data: p }] = await Promise.all([
      supabase.from("workout_sessions")
        .select("id,name,duration_min,calories,volume_kg,exercises_count,improved_count,completed_at")
        .order("completed_at", { ascending: false }).limit(60),
      supabase.from("weight_logs").select("id,weight_kg,logged_at").order("logged_at", { ascending: false }).limit(60),
      supabase.auth.getUser().then(async ({ data }) => data.user
        ? supabase.from("profiles").select("goal_weight_kg").eq("id", data.user.id).maybeSingle()
        : { data: null } as any),
    ]);
    setSessions((s as Session[] | null) ?? []);
    setWeights(((w as any[]) ?? []).map((r) => ({ ...r, weight_kg: Number(r.weight_kg) })));
    setGoalWeight(p?.goal_weight_kg ? Number(p.goal_weight_kg) : null);
  };
  useEffect(() => { reload(); }, []);

  const totals = useMemo(() => ({
    passTotal: sessions.length,
    exercises: sessions.reduce((a, s) => a + (s.exercises_count ?? 0), 0),
    improved: sessions.reduce((a, s) => a + (s.improved_count ?? 0), 0),
  }), [sessions]);

  return (
    <div className="max-w-md mx-auto pb-8">
      <header className="px-4 py-4 text-center">
        <h1 className="text-base font-semibold tracking-wide">Progress</h1>
      </header>

      <div className="px-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <TopStat value={totals.exercises} label="Övningar" tone="white" />
          <TopStat value={totals.improved} label="Förbättrade" tone="lime" />
          <TopStat value={totals.passTotal} label="Pass totalt" tone="white" />
        </div>

        <TabsRow value={tab} onChange={setTab} />

        {tab === "Vikt" && <ViktTab weights={weights} goalWeight={goalWeight} reload={reload} />}
        {tab === "Pass" && <PassTab sessions={sessions} metric={metric} setMetric={setMetric} reload={reload} />}
        {tab === "Hälsodata" && <HalsodataTab sessions={sessions} />}
        {tab === "Övningar" && <OvningarTab sessions={sessions} />}
      </div>
    </div>
  );
}

/* ============================================================
   Reusable bits
============================================================ */

function TopStat({ value, label, tone }: { value: number; label: string; tone: "white" | "lime" }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0e1525] px-3 py-3 text-center">
      <p className={cn("text-2xl font-extrabold tabular-nums", tone === "lime" ? "text-lime-400" : "text-white")}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function TabsRow({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) {
  const items: { key: TabKey; Icon: any }[] = [
    { key: "Övningar", Icon: Dumbbell },
    { key: "Pass", Icon: Flame },
    { key: "Vikt", Icon: Scale },
    { key: "Hälsodata", Icon: HeartPulse },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {items.map(({ key, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
              active
                ? "bg-lime-400 text-black border-lime-400 shadow-[0_0_24px_-6px_rgba(163,230,53,0.7)]"
                : "bg-[#0e1525] text-muted-foreground border-white/5 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {key}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-white/5 bg-[#0e1525] p-4", className)}>{children}</div>;
}

/* ============================================================
   VIKT TAB
============================================================ */

function ViktTab({ weights, goalWeight, reload }: { weights: Weight[]; goalWeight: number | null; reload: () => void }) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sorted = [...weights].sort((a, b) => +new Date(a.logged_at) - +new Date(b.logged_at));
  const current = weights[0]?.weight_kg ?? null;
  const previous = weights[1]?.weight_kg ?? null;
  const sedan = current != null && previous != null ? current - previous : 0;
  const start = sorted[0]?.weight_kg ?? current ?? 0;
  const totalDiff = current != null ? current - start : 0;
  const remaining = current != null && goalWeight != null ? current - goalWeight : 0;
  const progressPct = current != null && goalWeight != null && start !== goalWeight
    ? Math.max(0, Math.min(100, ((start - current) / (start - goalWeight)) * 100))
    : 0;

  const chartData = sorted.slice(-12).map((w) => ({
    date: new Date(w.logged_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
    weight: Number(w.weight_kg),
  }));

  async function save() {
    const v = parseFloat(input.replace(",", "."));
    if (!v || v < 20 || v > 400) { toast.error("Ange en giltig vikt"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("weight_logs").insert({ user_id: u.user.id, weight_kg: v });
    await supabase.from("profiles").update({ current_weight_kg: v }).eq("id", u.user.id);
    setSaving(false);
    if (error) { toast.error("Kunde inte spara"); return; }
    setInput("");
    toast.success("Vikt sparad");
    reload();
  }

  async function deleteEntry(id: string) {
    await supabase.from("weight_logs").delete().eq("id", id);
    reload();
  }

  const monthsToGoal = remaining > 0 && Math.abs(sedan) > 0.05
    ? Math.round((remaining / Math.abs(sedan)) * 10) / 10
    : null;

  return (
    <div className="space-y-3">
      {/* Logga vikt */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Logga din vikt</p>
            <p className="text-[11px] text-muted-foreground">
              {current != null ? `Senast: ${current.toFixed(1)} kg` : "Inga loggningar ännu"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.1" inputMode="decimal"
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="t.ex. 82.5"
            className="flex-1 h-11 rounded-xl bg-[#0b1120] border border-white/5 px-4 text-sm text-center placeholder:text-muted-foreground/60 focus:outline-none focus:border-lime-400/50"
          />
          <span className="text-xs text-muted-foreground">kg</span>
          <button
            onClick={save} disabled={saving || !input}
            className={cn(
              "h-11 px-5 rounded-xl text-sm font-semibold transition-all",
              input ? "bg-lime-400 text-black shadow-[0_0_24px_-8px_rgba(163,230,53,0.8)]" : "bg-white/5 text-muted-foreground",
            )}
          >
            Spara
          </button>
        </div>
      </SectionCard>

      {/* Summary 3-cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard value={current != null ? `${current.toFixed(1)} kg` : "—"} label="Nuvarande" />
        <SummaryCard value={`${sedan >= 0 ? "+" : ""}${sedan.toFixed(1)} kg`} label="Sedan sist" tone={sedan < 0 ? "lime" : sedan > 0 ? "red" : "muted"} />
        <SummaryCard
          value={goalWeight != null && current != null ? `${Math.abs(remaining).toFixed(1)} kg` : `${totalDiff >= 0 ? "+" : ""}${totalDiff.toFixed(1)} kg`}
          label={goalWeight != null ? "Kvar att gå" : "Totalt"}
          tone="lime"
        />
      </div>

      {/* Goal */}
      {goalWeight != null && current != null && (
        <SectionCard>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center">🎯</div>
              <p className="font-semibold text-sm">Väg mot målet</p>
            </div>
            {monthsToGoal != null && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> ~{monthsToGoal} mån
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Start: {start.toFixed(0)} kg</span>
            <span className="font-semibold text-lime-400">{progressPct.toFixed(0)}% klart</span>
            <span>Mål: {goalWeight.toFixed(0)} kg</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-3 rounded-xl bg-lime-500/10 border border-lime-500/30 p-3 text-[11px] text-lime-200 flex gap-2">
            <span>💪</span>
            <span>Om du följer ditt kostschema beräknas du nå din målvikt om ungefär <b>{monthsToGoal ?? "?"} månader</b>. Håll i dig — varje dag räknas!</span>
          </div>
        </SectionCard>
      )}

      {/* Chart */}
      <SectionCard>
        <p className="text-[10px] tracking-widest font-semibold text-muted-foreground mb-2">VIKTKURVA</p>
        <div className="h-52">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Logga din första vikt för att se grafen</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                <Tooltip
                  cursor={{ stroke: "#a3e635", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { date: string; weight: number };
                    return (
                      <div className="rounded-lg bg-[#0b1120] border border-white/10 px-2.5 py-1.5 text-[11px] shadow-xl">
                        <p className="text-muted-foreground">{p.date}</p>
                        <p className="font-semibold text-lime-400">Vikt: {p.weight.toFixed(1)} kg</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone" dataKey="weight"
                  stroke="#a3e635" strokeWidth={2.5}
                  dot={{ fill: "#a3e635", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#a3e635", stroke: "#0b1120", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* Coaching button */}
      <Link
        to="/coach"
        className="block rounded-2xl py-3.5 text-center text-sm font-semibold border border-purple-500/40 bg-gradient-to-r from-purple-600/30 via-fuchsia-600/30 to-purple-600/30 text-white shadow-[0_0_30px_-12px_rgba(168,85,247,0.7)]"
      >
        <Sparkles className="inline h-4 w-4 mr-1.5 -mt-0.5" />
        Få personlig coachning från FitFlow
      </Link>

      {/* History accordion */}
      <SectionCard className="p-0 overflow-hidden">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold"
        >
          <span>Historik ({weights.length} mätningar)</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen && "rotate-180")} />
        </button>
        {historyOpen && (
          <ul className="border-t border-white/5 divide-y divide-white/5">
            {weights.length === 0 && <li className="px-4 py-3 text-xs text-muted-foreground">Inga mätningar ännu</li>}
            {weights.map((w) => (
              <li key={w.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">
                  {new Date(w.logged_at).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{Number(w.weight_kg).toFixed(1)} kg</span>
                  <button onClick={() => deleteEntry(w.id)} className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function SummaryCard({ value, label, tone = "white" }: { value: string; label: string; tone?: "white" | "lime" | "red" | "muted" }) {
  const c = tone === "lime" ? "text-lime-400" : tone === "red" ? "text-red-400" : tone === "muted" ? "text-muted-foreground" : "text-white";
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0e1525] px-3 py-3 text-center">
      <p className={cn("text-base font-extrabold tabular-nums", c)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/* ============================================================
   PASS TAB
============================================================ */

function PassTab({ sessions, metric, setMetric, reload }: { sessions: Session[]; metric: MetricKey; setMetric: (m: MetricKey) => void; reload: () => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logsBySession, setLogsBySession] = useState<Record<string, SetLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!logsBySession[id]) {
      setLoadingLogs(id);
      const { data } = await supabase
        .from("workout_set_logs")
        .select("id,exercise_name,set_number,reps,weight_kg,completed")
        .eq("session_id", id)
        .order("created_at", { ascending: true });
      setLogsBySession((prev) => ({ ...prev, [id]: ((data as SetLog[] | null) ?? []) }));
      setLoadingLogs(null);
    }
  }

  async function deleteSession(id: string) {
    setDeleting(true);
    // Delete child set logs first in case the FK isn't cascade.
    await supabase.from("workout_set_logs").delete().eq("session_id", id);
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    setDeleting(false);
    setConfirmId(null);
    if (error) { toast.error("Kunde inte ta bort passet"); return; }
    toast.success("Pass borttaget");
    reload();
  }

  const sorted = [...sessions].sort((a, b) => +new Date(a.completed_at) - +new Date(b.completed_at));
  const val = (s: Session) =>
    metric === "Tid (min)" ? (s.duration_min ?? 0)
    : metric === "Kalorier" ? (s.calories ?? 0)
    : Math.round(Number(s.volume_kg ?? 0));
  const values = sessions.map(val);
  const senaste = values[0] ?? 0;
  const snitt = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const basta = values.length ? Math.round(Math.max(...values)) : 0;
  const unit = metric === "Tid (min)" ? "min" : metric === "Kalorier" ? "kcal" : "kg";

  const chartData = sorted.slice(-14).map((s) => ({
    date: new Date(s.completed_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
    value: val(s),
  }));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["Tid (min)", "Kalorier", "Volym (kg)"] as MetricKey[]).map((m) => {
          const active = metric === m;
          const Icon = m === "Tid (min)" ? Timer : m === "Kalorier" ? Flame : Layers;
          return (
            <button
              key={m} onClick={() => setMetric(m)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border",
                active
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  : "bg-[#0e1525] text-muted-foreground border-white/5",
              )}
            >
              <Icon className="h-3 w-3" />{m}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard value={String(senaste)} label={`Senaste · ${unit}`} tone="lime" />
        <SummaryCard value={String(snitt)} label={`Snitt · ${unit}`} tone="lime" />
        <SummaryCard value={String(basta)} label={`Bästa · ${unit}`} tone="lime" />
      </div>

      <SectionCard>
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">{metric} per pass</p>
        <div className="h-48">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Inga pass ännu</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "#60a5fa", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { date: string; value: number };
                    return (
                      <div className="rounded-lg bg-[#0b1120] border border-white/10 px-2.5 py-1.5 text-[11px] shadow-xl">
                        <p className="text-muted-foreground">{p.date}</p>
                        <p className="font-semibold text-blue-400">{p.value} {unit}</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2.5}
                  dot={{ fill: "#60a5fa", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <p className="text-[10px] tracking-widest font-semibold text-muted-foreground px-1">PASSHISTORIK</p>
      <ul className="space-y-2">
        {sessions.length === 0 && (
          <li className="rounded-2xl border border-white/5 bg-[#0e1525] p-4 text-xs text-muted-foreground text-center">Inga pass loggade ännu</li>
        )}
        {sessions.slice(0, 12).map((s) => (
          <li key={s.id} className="rounded-2xl border border-white/5 bg-[#0e1525] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleExpand(s.id)}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedId === s.id && "rotate-180")} />
                <div>
                  <p className="text-sm font-semibold">{new Date(s.completed_at).toLocaleDateString("sv-SE", { weekday: "long" })}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(s.completed_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px]" onClick={(e) => e.stopPropagation()}>
              {s.duration_min != null && (
                <span className="flex items-center gap-1 text-blue-300"><Timer className="h-3 w-3" />{s.duration_min}m</span>
              )}
              {s.calories != null && (
                <span className="flex items-center gap-1 text-orange-400"><Flame className="h-3 w-3" />{s.calories}</span>
              )}
              {s.volume_kg != null && (
                <span className="flex items-center gap-1 text-purple-300"><Layers className="h-3 w-3" />{Math.round(Number(s.volume_kg))}kg</span>
              )}
              {confirmId === s.id ? (
                <span className="flex items-center gap-1.5 pl-1">
                  <button
                    onClick={() => deleteSession(s.id)}
                    disabled={deleting}
                    className="px-2 h-7 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-semibold text-[11px] disabled:opacity-60"
                  >
                    {deleting ? "Tar bort…" : "Ta bort"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={deleting}
                    className="px-2 h-7 rounded-full bg-white/5 text-muted-foreground border border-white/10 font-semibold text-[11px]"
                  >
                    Avbryt
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmId(s.id)}
                  aria-label="Ta bort pass"
                  className="ml-1 h-7 w-7 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              </div>
            </button>
            {expandedId === s.id && (
              <div className="border-t border-white/5 px-4 py-3 bg-[#0b1120]">
                {loadingLogs === s.id && !logsBySession[s.id] ? (
                  <p className="text-[11px] text-muted-foreground">Laddar övningar…</p>
                ) : (
                  <SessionExerciseList logs={logsBySession[s.id] ?? []} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type SetLog = { id: string; exercise_name: string | null; set_number: number; reps: number | null; weight_kg: number | null; completed: boolean | null };

function SessionExerciseList({ logs }: { logs: SetLog[] }) {
  if (logs.length === 0) {
    return <p className="text-[11px] text-muted-foreground">Inga loggade övningar för detta pass</p>;
  }
  const groups = new Map<string, SetLog[]>();
  for (const l of logs) {
    const key = l.exercise_name ?? "Okänd övning";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  return (
    <ul className="space-y-3">
      {Array.from(groups.entries()).map(([name, sets]) => (
        <li key={name}>
          <p className="text-xs font-semibold mb-1.5">{name}</p>
          <ul className="space-y-1">
            {sets.sort((a, b) => a.set_number - b.set_number).map((s) => (
              <li key={s.id} className="flex items-center justify-between text-[11px] text-muted-foreground bg-[#0e1525] rounded-lg px-3 py-1.5 border border-white/5">
                <span>Set {s.set_number}</span>
                <span className="tabular-nums">
                  {s.reps ?? 0} reps × {Number(s.weight_kg ?? 0)} kg
                  {s.completed ? <span className="ml-2 text-lime-400">✓</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   HÄLSODATA TAB
============================================================ */

function HalsodataTab({ sessions }: { sessions: Session[] }) {
  const withHealth = sessions.filter((s) => s.duration_min != null || s.calories != null);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{withHealth.length} pass med hälsodata</p>
      <ul className="space-y-3">
        {withHealth.length === 0 && (
          <li className="rounded-2xl border border-white/5 bg-[#0e1525] p-6 text-xs text-muted-foreground text-center">Ingen hälsodata ännu</li>
        )}
        {withHealth.map((s) => (
          <li key={s.id} className="rounded-2xl border border-white/5 bg-[#0e1525] p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold lowercase">{new Date(s.completed_at).toLocaleDateString("sv-SE", { weekday: "long" })}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(s.completed_at).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <button className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 h-7 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30">
                <Share2 className="h-3 w-3" /> Dela
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <HealthBlock icon={<Timer className="h-3.5 w-3.5" />} label="Tid" value={`${s.duration_min ?? 0} min`} tone="purple" />
              <HealthBlock icon={<Flame className="h-3.5 w-3.5" />} label="Kalorier" value={`${s.calories ?? 0} kcal`} tone="orange" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HealthBlock({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "purple" | "orange" }) {
  const c = tone === "purple" ? "text-purple-300" : "text-orange-400";
  return (
    <div className="rounded-xl bg-[#0b1120] border border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-5 w-5 rounded-md flex items-center justify-center", tone === "purple" ? "bg-purple-500/20 text-purple-300" : "bg-orange-500/20 text-orange-400")}>
          {icon}
        </span>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className={cn("mt-1 text-sm font-bold", c)}>{value}</p>
    </div>
  );
}

/* ============================================================
   ÖVNINGAR TAB
============================================================ */

function OvningarTab({ sessions }: { sessions: Session[] }) {
  const total = sessions.reduce((a, s) => a + (s.exercises_count ?? 0), 0);
  const improved = sessions.reduce((a, s) => a + (s.improved_count ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard value={String(total)} label="Övningar totalt" />
        <SummaryCard value={String(improved)} label="Förbättrade" tone="lime" />
      </div>
      <SectionCard>
        <p className="text-sm font-semibold mb-2">Senaste pass</p>
        <ul className="space-y-2">
          {sessions.slice(0, 10).map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(s.completed_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</p>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-bold text-lime-400">{s.exercises_count ?? 0} övn.</p>
                {(s.improved_count ?? 0) > 0 && (
                  <p className="text-lime-400 flex items-center gap-0.5 justify-end"><TrendingUp className="h-3 w-3" />{s.improved_count} bättre</p>
                )}
              </div>
            </li>
          ))}
          {sessions.length === 0 && <li className="text-xs text-muted-foreground text-center py-4">Inga pass loggade ännu</li>}
        </ul>
      </SectionCard>
    </div>
  );
}
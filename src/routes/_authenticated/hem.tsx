import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/fitflow/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronRight, Check, Sparkles, Plus, Apple, BookOpen, Users, Scale, Flame, Calendar, TrendingUp, Dumbbell, Trash2, ChevronUp, ChevronDown, Trash, TrendingDown, Utensils, Watch, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePersonalization, goalLabel } from "@/lib/personalization";
import { readActiveWorkout, clearActiveWorkout } from "@/lib/active-workout";
import { getHealthCapability, isoDate, readTodayFromDevice, requestHealthPermissions, saveHealthLog, useHealthLogs } from "@/lib/health";

export const Route = createFileRoute("/_authenticated/hem")({
  component: HemPage,
});

type Schema = { id: string; name: string; tags: string[]; sessions_per_week: number; difficulty: string; progress_percent: number; is_active: boolean };
type NutritionPlan = {
  id: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: string;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
};

function HemPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const personal = usePersonalization();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [pendingPlanDelete, setPendingPlanDelete] = useState<NutritionPlan | null>(null);
  const [weight, setWeight] = useState("");
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [weightLogs, setWeightLogs] = useState<{ id: string; weight_kg: number; logged_at: string }[]>([]);
  const [weightOpen, setWeightOpen] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, exercises: 0, weights: 0, increases: 0 });
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [progression, setProgression] = useState<{ name: string; from: number; to: number; diff: number }[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Schema | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      setName((u.user?.user_metadata?.display_name as string) || u.user?.email?.split("@")[0] || "");
      const { data: s } = await supabase.from("training_schemas").select("*").order("created_at");
      setSchemas((s as Schema[]) || []);
      const { data: np } = await supabase
        .from("nutrition_plans")
        .select("*")
        .order("created_at", { ascending: false });
      setPlans((np as NutritionPlan[]) || []);
      const { data: w } = await supabase.from("weight_logs").select("weight_kg").order("logged_at", { ascending: false }).limit(1);
      if (w && w[0]) setLastWeight(Number(w[0].weight_kg));
      const { data: wAll } = await supabase
        .from("weight_logs")
        .select("id,weight_kg,logged_at")
        .order("logged_at", { ascending: false })
        .limit(30);
      setWeightLogs(((wAll as any[]) ?? []).map((r) => ({ id: r.id, weight_kg: Number(r.weight_kg), logged_at: r.logged_at })));
      const [{ count: sc }, { count: ec }, { count: wc }] = await Promise.all([
        supabase.from("workout_sessions").select("*", { count: "exact", head: true }),
        supabase.from("workout_set_logs").select("*", { count: "exact", head: true }),
        supabase.from("weight_logs").select("*", { count: "exact", head: true }),
      ]);
      // Compute weight increases from set logs (per exercise, count when weight rises vs previous log)
      let increases = 0;
      const progRows: { name: string; from: number; to: number; diff: number }[] = [];
      if (userId) {
        const { data: sets } = await supabase
          .from("workout_set_logs")
          .select("exercise_name, weight_kg, created_at")
          .order("created_at", { ascending: true });
        const byEx: Record<string, { w: number; t: string }[]> = {};
        ((sets as any[]) ?? []).forEach((r) => {
          const n = r.exercise_name as string;
          const w = Number(r.weight_kg) || 0;
          if (!n || !w) return;
          (byEx[n] ||= []).push({ w, t: r.created_at });
        });
        Object.entries(byEx).forEach(([name, arr]) => {
          let prev = arr[0].w;
          let max = prev;
          arr.slice(1).forEach((x) => {
            if (x.w > prev) increases++;
            if (x.w > max) max = x.w;
            prev = x.w;
          });
          const first = arr[0].w;
          if (max > first) progRows.push({ name, from: first, to: max, diff: +(max - first).toFixed(1) });
        });
      }
      setStats({ sessions: sc || 0, exercises: ec || 0, weights: wc || 0, increases });
      setProgression(progRows.sort((a, b) => b.diff - a.diff).slice(0, 5));
      // Streak: consecutive days with a workout session ending today/yesterday
      if (userId) {
        const { data: sessDays } = await supabase
          .from("workout_sessions")
          .select("completed_at")
          .order("completed_at", { ascending: false })
          .limit(60);
        const days = new Set(((sessDays as any[]) ?? []).map((r) => new Date(r.completed_at).toISOString().slice(0, 10)));
        let streakCount = 0;
        const d = new Date();
        // allow streak to start today or yesterday
        if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
        while (days.has(d.toISOString().slice(0, 10))) {
          streakCount++;
          d.setDate(d.getDate() - 1);
        }
        setStreak(streakCount);
        setPoints((sc || 0) * 10 + increases * 5);
      }
    })();
  }, []);

  const saveWeight = async () => {
    const v = parseFloat(weight);
    if (!v) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: inserted, error } = await supabase
      .from("weight_logs")
      .insert({ user_id: u.user.id, weight_kg: v })
      .select("id,weight_kg,logged_at")
      .single();
    if (error) return toast.error(error.message);
    setLastWeight(v); setWeight(""); toast.success("Vikt sparad");
    if (inserted) setWeightLogs((prev) => [{ id: inserted.id, weight_kg: Number(inserted.weight_kg), logged_at: inserted.logged_at }, ...prev]);
    // Synka profilens nuvarande vikt så Min Personlighet uppdateras.
    await supabase.from("profiles").update({ current_weight_kg: v }).eq("id", u.user.id);
  };

  const deleteWeight = async (id: string) => {
    const { error } = await supabase.from("weight_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    let newest: number | null = null;
    setWeightLogs((prev) => {
      const next = prev.filter((x) => x.id !== id);
      newest = next[0]?.weight_kg ?? null;
      setLastWeight(newest);
      return next;
    });
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ current_weight_kg: newest }).eq("id", u.user.id);
    toast.success("Mätning borttagen");
  };

  const goNewSchema = () => navigate({ to: "/anpassa-schema" });

  return (
    <div className="max-w-md mx-auto">
      <AppHeader />
      <div className="px-4 space-y-4">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">God träning, <span className="text-foreground font-semibold">{name}</span> <span>👋</span></p>
          <h1 className="text-2xl font-bold mt-1">Mina träningsscheman</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip color="streak">🔥 {streak} dagar</Chip>
            <Chip color="warning">🏆 {points} poäng</Chip>
            <Chip color="primary">🎯 {stats.sessions} pass</Chip>
          </div>
        </section>

        <CompletedBanner />

        <Card className="bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div className="flex-1"><p className="font-semibold">FitFlow tränare</p></div>
          </div>
          <p className="text-sm text-foreground mt-2">
            🚀 Heja {name || "kompis"}!
            {personal.goal && <> Idag fokuserar vi på att <strong>{goalLabel(personal.goal)}</strong>.</>}
            {personal.dailyKcal && <> Ditt riktvärde är ca <strong>{personal.dailyKcal} kcal/dag</strong>.</>}
          </p>
        </Card>

        {personal.isMinor && (
          <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-400/40">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">🌱</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-200">Ungdomsläge aktivt</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eftersom du är under 18 anpassar vi övningar och intensitet — fokus på teknik, rörlighet och säker progression istället för tunga maxlyft.
                </p>
              </div>
            </div>
        </Card>
        )}

        {schemas.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Du har inget aktivt schema än.</p>
            <Button onClick={goNewSchema} className="mt-3 rounded-full" size="sm"><Plus className="h-4 w-4" />Skapa nytt schema</Button>
          </Card>
        ) : (
          schemas.map((s) => (
            <SchemaCard
              key={s.id}
              s={s}
              onOpen={() => navigate({ to: "/schema/$id", params: { id: s.id } })}
              onDelete={() => setPendingDelete(s)}
            />
          ))
        )}

        {plans.length > 0 && (
          <>
            <h2 className="text-xs tracking-widest text-muted-foreground font-semibold mt-2">DINA KOSTSCHEMAN</h2>
            {plans.map((p) => (
              <NutritionPlanCard
                key={p.id}
                p={p}
                onOpen={() => navigate({ to: "/kostschema" })}
                onDelete={() => setPendingPlanDelete(p)}
              />
            ))}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <QuickTile onClick={goNewSchema} icon={<Plus className="h-4 w-4 text-primary" />} title="Nytt schema" subtitle="FitFlow hjälper dig" />
          <QuickTile onClick={() => navigate({ to: "/kostplan" })} icon={<Apple className="h-4 w-4 text-accent" />} title="Nytt Kost Schema" subtitle="FitFlow hjälper dig" />
        </div>
        <button
          onClick={() => navigate({ to: "/kaloridagbok" })}
          className="w-full text-left rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-4"
        >
          <div className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-warning" /><div className="flex-1"><p className="text-sm font-medium">Kaloridagbok</p><p className="text-xs text-muted-foreground">Logga mat — Skanna streckkod</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
        </button>
        <button
          onClick={() => navigate({ to: "/community" })}
          className="w-full text-left rounded-2xl border border-[oklch(0.55_0.18_305/0.4)] bg-gradient-to-r from-[oklch(0.55_0.18_305/0.15)] to-transparent p-4"
        >
          <div className="flex items-center gap-3"><Users className="h-4 w-4" style={{ color: "oklch(0.7 0.18 305)" }} /><div className="flex-1"><p className="text-sm font-medium">Community</p><p className="text-xs text-muted-foreground">Inlägg, humör & flöde</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
        </button>

        <SmartwatchCard onOpen={() => navigate({ to: "/halsa" })} />

        <WeightLogCard
          logs={weightLogs}
          lastWeight={lastWeight}
          weight={weight}
          setWeight={setWeight}
          saveWeight={saveWeight}
          deleteWeight={deleteWeight}
          open={weightOpen}
          setOpen={setWeightOpen}
        />

        <h2 className="text-xs tracking-widest text-muted-foreground font-semibold mt-4">DIN STATISTIK</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Calendar className="h-4 w-4 text-success" />} value={stats.sessions} label="Pass genomförda" color="text-success" />
          <StatCard icon={<Flame className="h-4 w-4 text-streak" />} value={stats.exercises} label="Övningar loggade" color="text-streak" />
          <StatCard icon={<Dumbbell className="h-4 w-4 text-primary" />} value={stats.weights} label="Vikter loggade" color="text-primary" />
          <StatCard icon={<TrendingUp className="h-4 w-4" style={{ color: "oklch(0.7 0.18 305)" }} />} value={stats.increases} label="Viktökningar" color="" extraStyle={{ color: "oklch(0.7 0.18 305)" }} />
        </div>

        <Card>
          <p className="text-xs tracking-widest text-muted-foreground font-semibold mb-3">VIKTPROGRESSION PER ÖVNING</p>
          {progression.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen progression loggad än. Logga vikter i ett pass så syns din utveckling här.</p>
          ) : (
            progression.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-b-0">
                <span className="text-foreground/90 truncate">{r.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{r.from} kg</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground font-medium">{r.to} kg</span>
                  <span className="text-success font-semibold">+{r.diff}</span>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Ta bort schema?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="text-foreground font-semibold">{pendingDelete?.name}</span> tas bort permanent. Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-full mt-0">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                setDeleting(true);
                const { error } = await supabase.from("training_schemas").delete().eq("id", pendingDelete.id);
                setDeleting(false);
                if (error) { toast.error(error.message); return; }
                const active = readActiveWorkout();
                if (active?.schemaId === pendingDelete.id) clearActiveWorkout();
                setSchemas((prev) => prev.filter((x) => x.id !== pendingDelete.id));
                toast.success("Schema borttaget");
                setPendingDelete(null);
              }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Tar bort…" : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingPlanDelete} onOpenChange={(o) => !o && setPendingPlanDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Ta bort kostschema?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Detta tar bort planen permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-full mt-0">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingPlanDelete) return;
                const { error } = await supabase.from("nutrition_plans").delete().eq("id", pendingPlanDelete.id);
                if (error) { toast.error(error.message); return; }
                setPlans((prev) => prev.filter((x) => x.id !== pendingPlanDelete.id));
                toast.success("Kostschema borttaget");
                setPendingPlanDelete(null);
              }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: "streak" | "warning" | "primary" }) {
  const cls = color === "streak" ? "bg-streak/15 text-streak border-streak/40" : color === "warning" ? "bg-warning/15 text-warning border-warning/40" : "bg-primary/15 text-primary border-primary/40";
  return <span className={`text-xs px-2.5 py-1 rounded-full border ${cls}`}>{children}</span>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}
function CompletedBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-success/30 to-success/10 border border-success/40 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-success font-semibold flex items-center gap-1"><Check className="h-3 w-3" />KLART!</p>
        <p className="font-bold mt-0.5">Ben & Rumpa</p>
        <p className="text-xs text-muted-foreground">Bra jobbat! 💪</p>
      </div>
      <ChevronRight className="h-5 w-5 text-success" />
    </div>
  );
}
function SchemaCard({ s, onOpen, onDelete }: { s: Schema; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 relative group">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between pr-9">
          <div className="flex gap-2 items-center"><Dumbbell className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">{s.name}</p></div>
          {s.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/40">Aktiv</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {s.tags?.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{t}</span>)}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{s.sessions_per_week} pass/vecka · {s.difficulty}</p>
        {s.progress_percent > 0 && (
          <div className="mt-3"><div className="h-1 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, s.progress_percent)}%` }} /></div><p className="text-[10px] text-muted-foreground mt-1 text-right">{s.progress_percent}% klart</p></div>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Ta bort schema"
        className="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
function QuickTile({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-border bg-card p-3 text-left">
      <div className="flex items-center gap-2">{icon}<p className="text-sm font-semibold">{title}</p></div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </button>
  );
}

function NutritionPlanCard({ p, onOpen, onDelete }: { p: NutritionPlan; onOpen: () => void; onDelete: () => void }) {
  const goalText =
    p.goal === "ner" ? "Gå ner i vikt" :
    p.goal === "bygga" ? "Bygga muskler" :
    p.goal === "halla" ? "Hålla vikten" :
    p.goal === "prestera" ? "Prestera bättre" : p.goal;
  const target = p.target_date
    ? new Date(p.target_date).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
    : null;
  return (
    <div className="relative rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 group">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between pr-9">
          <div className="flex gap-2 items-center">
            <Utensils className="h-4 w-4 text-emerald-400" />
            <p className="font-semibold text-sm">{goalText}</p>
          </div>
          {p.is_active && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              Aktiv
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <PlanStat label="kcal" value={p.kcal} tone="amber" />
          <PlanStat label="P" value={`${p.protein_g}g`} tone="emerald" />
          <PlanStat label="K" value={`${p.carbs_g}g`} tone="orange" />
          <PlanStat label="F" value={`${p.fat_g}g`} tone="rose" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {p.current_weight_kg && p.target_weight_kg
            ? <>Mål: {p.current_weight_kg} kg → <span className="text-foreground font-medium">{p.target_weight_kg} kg</span>{target && <> · {target}</>}</>
            : <>Sparat {new Date(p.created_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</>}
        </p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Ta bort kostschema"
        className="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PlanStat({ label, value, tone }: { label: string; value: string | number; tone: "amber" | "emerald" | "orange" | "rose" }) {
  const cls =
    tone === "amber" ? "text-amber-300 border-amber-400/30 bg-amber-500/10" :
    tone === "emerald" ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" :
    tone === "orange" ? "text-orange-300 border-orange-400/30 bg-orange-500/10" :
    "text-rose-300 border-rose-400/30 bg-rose-500/10";
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-center ${cls}`}>
      <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[9px] uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
function StatCard({ icon, value, label, color, extraStyle }: { icon: React.ReactNode; value: number; label: string; color: string; extraStyle?: React.CSSProperties }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div>{icon}</div>
      <p className={`text-3xl font-bold mt-2 ${color}`} style={extraStyle}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function WeightLogCard({
  logs, lastWeight, weight, setWeight, saveWeight, deleteWeight, open, setOpen,
}: {
  logs: { id: string; weight_kg: number; logged_at: string }[];
  lastWeight: number | null;
  weight: string;
  setWeight: (v: string) => void;
  saveWeight: () => void;
  deleteWeight: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const sorted = [...logs].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  const current = sorted[sorted.length - 1]?.weight_kg ?? lastWeight ?? 0;
  const prev = sorted[sorted.length - 2]?.weight_kg ?? null;
  const first = sorted[0]?.weight_kg ?? null;
  const sinceLast = prev != null ? +(current - prev).toFixed(1) : 0;
  const total = first != null ? +(current - first).toFixed(1) : 0;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <Card className="bg-card">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center"><Scale className="h-5 w-5 text-accent" /></div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Viktlogg</p>
          <p className="text-xs text-muted-foreground">{lastWeight ? `${lastWeight} kg senast loggat` : "Logga din vikt"}</p>
        </div>
        <span className={`text-xs font-semibold flex items-center gap-1 ${sinceLast <= 0 ? "text-success" : "text-destructive"}`}>
          {sinceLast <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {sign(sinceLast)} kg
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="t.ex. 82.5" value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" />
            <span className="self-center text-sm text-muted-foreground">kg</span>
            <Button onClick={saveWeight} className="rounded-lg bg-success hover:bg-success/90 text-success-foreground" size="sm">Spara</Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat value={`${current} kg`} label="Nuvarande" tone="foreground" />
            <MiniStat value={`${sign(sinceLast)} kg`} label="Sedan sist" tone={sinceLast <= 0 ? "success" : "destructive"} />
            <MiniStat value={`${sign(total)} kg`} label="Totalt" tone={total <= 0 ? "success" : "destructive"} />
          </div>

          <WeightSparkline values={sorted.map((l) => ({ v: l.weight_kg, t: l.logged_at }))} />

          {sorted.length > 0 && (
            <ul className="space-y-1.5">
              {[...sorted].reverse().slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground flex-1 capitalize">
                    {new Date(l.logged_at).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{l.weight_kg} kg</span>
                  <button
                    onClick={() => deleteWeight(l.id)}
                    aria-label="Ta bort"
                    className="h-8 w-8 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button className="w-full rounded-xl bg-gradient-to-r from-success to-success/80 text-success-foreground font-bold text-sm py-3 flex items-center justify-center gap-2 shadow-lg shadow-success/30 hover:shadow-success/50 transition-shadow">
            <Sparkles className="h-4 w-4" /> Få AI-rekommendationer
          </button>
        </div>
      )}
    </Card>
  );
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone: "foreground" | "success" | "destructive" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-2 py-2 text-center">
      <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function WeightSparkline({ values }: { values: { v: number; t: string }[] }) {
  if (values.length < 2) {
    return <div className="rounded-lg border border-border bg-secondary/20 h-32 flex items-center justify-center text-xs text-muted-foreground">Logga minst två mätningar för att se kurvan</div>;
  }
  const w = 320, h = 110, pad = 18;
  const vs = values.map((x) => x.v);
  const min = Math.min(...vs), max = Math.max(...vs);
  const range = max - min || 1;
  const pts = values.map((x, i) => {
    const px = pad + (i / (values.length - 1)) * (w - pad * 2);
    const py = pad + (1 - (x.v - min) / range) * (h - pad * 2);
    return [px, py] as const;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
        <path d={d} fill="none" stroke="oklch(0.78 0.18 142)" strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="oklch(0.78 0.18 142)" />
        ))}
      </svg>
    </div>
  );
}

function SmartwatchCard({ onOpen }: { onOpen: () => void }) {
  const { logs, reload } = useHealthLogs(1);
  const [syncing, setSyncing] = useState(false);
  const today = logs.find((l) => l.log_date === isoDate()) ?? null;
  const cap = typeof window === "undefined" ? "unavailable_web" : getHealthCapability();

  const sync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      const ok = await requestHealthPermissions();
      if (!ok) { toast.error("Behörighet nekades"); return; }
      const data = await readTodayFromDevice();
      if (!data) { toast.error("Kunde inte läsa data"); return; }
      await saveHealthLog({ log_date: isoDate(), source: "health_connect", ...data });
      toast.success("Synkat från smartklockan");
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Synk misslyckades");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
          <Watch className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Smartklocka</p>
          <p className="text-xs text-muted-foreground">Steg & kalorier idag</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl bg-card/60 border border-border p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Activity className="h-3 w-3 text-primary" />Steg</div>
          <p className="text-lg font-bold tabular-nums">{today?.steps?.toLocaleString("sv-SE") ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-card/60 border border-border p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Flame className="h-3 w-3 text-streak" />Kcal</div>
          <p className="text-lg font-bold tabular-nums">{today?.active_kcal?.toLocaleString("sv-SE") ?? "—"}</p>
        </div>
      </div>
      {cap === "ready" ? (
        <div
          role="button"
          tabIndex={0}
          onClick={sync}
          onKeyDown={(e) => { if (e.key === "Enter") sync(e as any); }}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synkar…" : "Synka nu"}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {cap === "plugin_missing"
            ? "Öppna appen efter nästa bygge för automatisk synk."
            : "Öppna FitFlow-appen på din Android för att koppla klockan via Health Connect."}
        </p>
      )}
    </button>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Check, X, Minus, Plus, Timer, TrendingUp, BookOpen, AlertTriangle, ChevronDown,
  Repeat, Search,
} from "lucide-react";
import { Trophy, Flame, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { ensureActiveWorkout, clearActiveWorkout } from "@/lib/active-workout";
import { setPassProgress, clearPassProgress } from "@/lib/pass-progress";
import { buildSchemaPlan, DB_FETCH_MAP, type Parsed } from "@/lib/training-plan";
import { recommendNextWeight, type Recommendation } from "@/lib/weight-progression";

export const Route = createFileRoute("/_authenticated/pass/$schemaId")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ day: z.coerce.number().int().min(0).default(0) }).parse(s),
  component: PassPage,
});

type DbExercise = {
  id: string;
  name: string;
  name_sv: string | null;
  body_part: string | null;
  equipment: string;
  image_url: string | null;
  gif_url: string | null;
  instructions_sv: string[] | null;
  instructions_en: string[] | null;
  target?: string | null;
};

type SetState = { reps: string; kg: string; done: boolean };

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Start of current ISO week (Monday 00:00 local time) as ISO string.
function startOfWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Mon = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

function formatToday() {
  try {
    return new Date().toLocaleDateString("sv-SE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function PassPage() {
  const { schemaId } = Route.useParams();
  const { day } = Route.useSearch();
  const navigate = useNavigate();

  const [schema, setSchema] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetState[]>>({});
  const [rest, setRest] = useState<Record<string, number>>({});
  const [last, setLast] = useState<Record<string, { reps: number | null; kg: number | null }>>({});
  const [recs, setRecs] = useState<Record<string, Recommendation>>({});
  const [setsPerExercise, setSetsPerExercise] = useState(3);
  const [repsHint, setRepsHint] = useState("8-12");

  // Persistent session for this schema+day in the current week. Created on
  // the first set toggle/edit and reused for autosave so progress survives
  // navigation, refresh and accidental aborts.
  const sessionIdRef = useRef<string | null>(null);
  const setsRef = useRef<Record<string, SetState[]>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // master timer
  const startedAt = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [abortOpen, setAbortOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(60);
  const [result, setResult] = useState<
    | { durationSec: number; calories: number; volumeKg: number; exercises: number; sets: number }
    | null
  >(null);
  const finishingRef = useRef(false);

  // Swap dialog state
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapQuery, setSwapQuery] = useState("");
  const [swapEquip, setSwapEquip] = useState<string>("Alla");
  const [swapList, setSwapList] = useState<DbExercise[]>([]);

  // Persist the active workout so the timer survives navigation. If we
  // already have one for this schema+day, reuse its startedAt.
  useEffect(() => {
    const ts = ensureActiveWorkout(schemaId, day);
    startedAt.current = ts;
    setElapsed(Math.floor((Date.now() - ts) / 1000));
  }, [schemaId, day]);

  useEffect(() => {
    if (!resting || restLeft <= 0) return;
    const t = setInterval(() => setRestLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resting, restLeft]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  // load schema + exercises
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("training_schemas").select("id,name,description").eq("id", schemaId).maybeSingle();
      if (!s) {
        clearActiveWorkout();
        setLoading(false);
        toast.error("Schemat finns inte längre");
        navigate({ to: "/hem", replace: true });
        return;
      }
      setSchema(s as any);
      let parsed: Parsed | null = null;
      try { parsed = s.description ? JSON.parse(s.description) : null; } catch {}
      const parts: string[] = parsed?.bodyParts?.length ? parsed.bodyParts : ["Bröst", "Rygg", "Ben"];
      const perEx = parsed?.setsPerExercise && parsed.setsPerExercise > 0 ? parsed.setsPerExercise : 3;
      setSetsPerExercise(perEx);

      const dbParts = Array.from(new Set(parts.flatMap((m) => DB_FETCH_MAP[m] ?? [m])));
      const { data: pool } = await supabase
        .from("exercises").select("id,name,name_sv,body_part,equipment,image_url,gif_url,instructions_sv,instructions_en,target")
        .in("body_part", dbParts).order("id").limit(5000);
      const byPart: Record<string, DbExercise[]> = {};
      (pool as DbExercise[] | null)?.forEach((e) => {
        let k = e.body_part ?? "_";
        if (k === "Överarmar" && (e.target === "Biceps" || e.target === "Triceps")) k = e.target;
        (byPart[k] ||= []).push(e);
      });

      // Resolve overrides/extras referenced by the schema that may not be in
      // the fetched pool (e.g. user swapped in a different body part).
      const refIds = [
        ...Object.values(parsed?.overrides ?? {}),
        ...Object.values(parsed?.extras ?? {}).flat(),
      ];
      const known = new Set<string>(Object.values(byPart).flat().map((e) => e.id));
      const missing = refIds.filter((rid) => !known.has(rid));
      const overrideEx: Record<string, DbExercise> = {};
      // Pre-populate from the already-fetched pool so overrides that point
      // to an exercise in the same body part still resolve (buildSchemaPlan
      // only applies an override when overrideEx[id] is present).
      Object.values(byPart).flat().forEach((e) => { overrideEx[e.id] = e; });
      if (missing.length) {
        const { data: extra } = await supabase
          .from("exercises")
          .select("id,name,name_sv,body_part,equipment,image_url,gif_url,instructions_sv,instructions_en,target")
          .in("id", missing);
        (extra as DbExercise[] | null)?.forEach((e) => { overrideEx[e.id] = e; });
      }

      // Use the same planner as the schema overview page so exercises match.
      const plan = buildSchemaPlan<DbExercise>(parsed, byPart, overrideEx, s.id);
      const dayPlan = plan[Math.min(day, Math.max(0, plan.length - 1))];
      const exs: DbExercise[] = dayPlan?.exercises ?? [];
      setExercises(exs);

      // Fetch recent set logs (last ~10 sessions worth) for each exercise so we
      // can: (a) show "Senast" per set, and (b) recommend a target weight that
      // takes prior sessions into account (progression / deload).
      const lastMap: Record<string, { reps: number | null; kg: number | null }> = {};
      const recMap: Record<string, Recommendation> = {};
      const { data: { user } } = await supabase.auth.getUser();
      if (user && exs.length) {
        const { data: prev } = await supabase
          .from("workout_set_logs")
          .select("exercise_id,session_id,reps,weight_kg,completed,created_at")
          .eq("user_id", user.id)
          .in("exercise_id", exs.map((e) => e.id))
          .order("created_at", { ascending: false })
          .limit(500);
        const byEx: Record<string, any[]> = {};
        (prev as any[] | null)?.forEach((r) => {
          if (!r.exercise_id) return;
          (byEx[r.exercise_id] ||= []).push(r);
        });
        exs.forEach((e) => {
          const h = byEx[e.id] ?? [];
          if (h.length) lastMap[e.id] = { reps: h[0].reps, kg: h[0].weight_kg };
          recMap[e.id] = recommendNextWeight(h, "8-12");
        });
      } else {
        exs.forEach((e) => { recMap[e.id] = recommendNextWeight([], "8-12"); });
      }
      setLast(lastMap);
      setRecs(recMap);

      // init sets + rest defaults — pre-fill kg with the recommendation so
      // the user sees the suggested weight without typing it.
      const initSets: Record<string, SetState[]> = {};
      const initRest: Record<string, number> = {};
      exs.forEach((e) => {
        const recKg = recMap[e.id]?.kg;
        const kgStr = recKg != null ? String(recKg) : "0";
        initSets[e.id] = Array.from({ length: perEx }, () => ({ reps: "8-12", kg: kgStr, done: false }));
        initRest[e.id] = 60;
      });

      // Hydrate from an existing session for this schema+day in the
      // current week so checked sets / typed reps&kg come back when the
      // user re-opens the pass — even after an abort.
      if (user) {
        const { data: sess } = await supabase
          .from("workout_sessions")
          .select("id, duration_min")
          .eq("user_id", user.id)
          .eq("schema_id", schemaId)
          .eq("day_index", day)
          .gte("completed_at", startOfWeekISO())
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sess) {
          sessionIdRef.current = sess.id;
          const { data: logs } = await supabase
            .from("workout_set_logs")
            .select("exercise_id,set_number,reps,weight_kg,completed")
            .eq("session_id", sess.id);
          (logs ?? []).forEach((l: any) => {
            if (!l.exercise_id) return;
            const arr = initSets[l.exercise_id];
            if (!arr) return;
            const si = (l.set_number ?? 1) - 1;
            if (si < 0 || si >= arr.length) return;
            arr[si] = {
              reps: l.reps != null ? String(l.reps) : arr[si].reps,
              kg: l.weight_kg != null ? String(l.weight_kg) : arr[si].kg,
              done: !!l.completed,
            };
          });
        }
      }

      setSets(initSets);
      setsRef.current = initSets;
      setRest(initRest);
      setLoading(false);
    })();
  }, [schemaId, day]);

  const current = exercises[idx];
  const doneCount = useMemo(
    () => exercises.filter((e) => (sets[e.id] ?? []).every((s) => s.done) && (sets[e.id]?.length ?? 0) > 0).length,
    [exercises, sets]
  );
  // Progress is based on completed SETS across all exercises so the bar
  // fills as the user ticks off each set (not just per exercise).
  const { doneSets: totalDoneSets, totalSets } = useMemo(() => {
    let done = 0;
    let total = 0;
    exercises.forEach((e) => {
      const arr = sets[e.id] ?? [];
      total += arr.length;
      done += arr.filter((s) => s.done).length;
    });
    return { doneSets: done, totalSets: total };
  }, [exercises, sets]);
  const progress = totalSets ? (totalDoneSets / totalSets) * 100 : 0;

  // Mirror the progress to localStorage so the schema overview can show
  // partial completion per day without needing a DB roundtrip.
  useEffect(() => {
    if (loading || !exercises.length) return;
    if (result) return;
    setPassProgress(schemaId, day, progress);
  }, [schemaId, day, progress, loading, exercises.length, result]);

  // Ensure a workout_session row exists for this schema+day so subsequent
  // set logs can be attached to it. Created lazily on the first save.
  const ensureSession = async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        schema_id: schemaId,
        name: schema?.name ?? "Pass",
        day_index: day,
        exercises_count: exercises.length,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    sessionIdRef.current = data.id;
    return data.id;
  };

  const persistSet = async (exId: string, i: number, s: SetState) => {
    const sid = await ensureSession();
    if (!sid) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ex = exercises.find((e) => e.id === exId);
    await supabase
      .from("workout_set_logs")
      .upsert(
        {
          session_id: sid,
          user_id: user.id,
          exercise_id: exId,
          exercise_name: ex?.name_sv || ex?.name || null,
          set_number: i + 1,
          reps: parseInt(s.reps) || null,
          weight_kg: parseFloat(s.kg.replace(",", ".")) || null,
          completed: s.done,
        },
        { onConflict: "session_id,exercise_id,set_number" },
      );
  };

  const scheduleSave = (exId: string, i: number, immediate = false) => {
    const key = `${exId}:${i}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    const run = () => {
      const s = (setsRef.current[exId] ?? [])[i];
      if (s) persistSet(exId, i, s);
    };
    if (immediate) run();
    else saveTimers.current[key] = setTimeout(run, 600);
  };

  const updateSet = (exId: string, i: number, patch: Partial<SetState>) => {
    setSets((prev) => {
      const arr = [...(prev[exId] ?? [])];
      arr[i] = { ...arr[i], ...patch };
      const nextAll = { ...prev, [exId]: arr };
      setsRef.current = nextAll;
      return nextAll;
    });
    // Toggling `done` saves immediately; typed values debounce.
    scheduleSave(exId, i, patch.done !== undefined);
  };
  const adjustRest = (exId: string, delta: number) =>
    setRest((prev) => ({ ...prev, [exId]: Math.max(15, (prev[exId] ?? 60) + delta) }));

  const toggleDone = (exId: string, i: number) => {
    const wasDone = sets[exId]?.[i]?.done ?? false;
    updateSet(exId, i, { done: !wasDone });
    if (!wasDone) {
      const seconds = rest[exId] ?? 60;
      setRestTotal(seconds);
      setRestLeft(seconds);
      setResting(true);
    }
  };

  const toggleAllSets = (exId: string) => {
    const arr = sets[exId] ?? [];
    const allDone = arr.every((s) => s.done);
    const targetState = !allDone;

    setSets((prev) => {
      const currentArr = prev[exId] ?? [];
      const newArr = currentArr.map((s) => ({ ...s, done: targetState }));
      const nextAll = { ...prev, [exId]: newArr };
      setsRef.current = nextAll;
      return nextAll;
    });

    arr.forEach((_, i) => {
      const s = { ...(setsRef.current[exId]?.[i] ?? { reps: repsHint, kg: "0", done: targetState }), done: targetState };
      persistSet(exId, i, s);
    });

    if (targetState) {
      toast.success("Alla set markerade som klara!");
      const seconds = rest[exId] ?? 60;
      setRestTotal(seconds);
      setRestLeft(seconds);
      setResting(true);
    } else {
      toast.info("Alla set avmarkerade");
    }
  };

  const next = () => {
    if (idx < exercises.length - 1) {
      setIdx(idx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      finish();
    }
  };

  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setRunning(false);
    // Flush any pending debounced set saves before computing totals.
    Object.keys(saveTimers.current).forEach((k) => {
      const t = saveTimers.current[k];
      if (t) {
        clearTimeout(t);
        const [exId, iStr] = k.split(":");
        const i = parseInt(iStr, 10);
        const s = (setsRef.current[exId] ?? [])[i];
        if (s) persistSet(exId, i, s);
      }
    });
    const totalSec = Math.floor((Date.now() - startedAt.current) / 1000);
    const durationMin = Math.max(1, Math.round(totalSec / 60));
    // crude calorie estimate (~6 kcal/min general strength training)
    const calories = Math.round(durationMin * 6);
    let volume = 0;
    let doneSets = 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Du måste vara inloggad"); finishingRef.current = false; return; }
    exercises.forEach((ex) => {
      (sets[ex.id] ?? []).forEach((s, i) => {
        const reps = parseInt(s.reps) || 0;
        const kg = parseFloat(s.kg.replace(",", ".")) || 0;
        if (s.done) { volume += reps * kg; doneSets += 1; }
      });
    });
    // Reuse the autosave session if one exists; otherwise create now.
    let sid = sessionIdRef.current;
    if (!sid) sid = await ensureSession();
    if (!sid) {
      toast.error("Kunde inte spara");
      finishingRef.current = false;
      return;
    }
    const { error: updErr } = await supabase
      .from("workout_sessions")
      .update({
        duration_min: durationMin,
        calories,
        volume_kg: volume,
        exercises_count: exercises.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sid);
    if (updErr) {
      toast.error(updErr.message);
      finishingRef.current = false;
      return;
    }
    clearActiveWorkout();
    setPassProgress(schemaId, day, 100);
    setResult({
      durationSec: totalSec,
      calories,
      volumeKg: volume,
      exercises: exercises.length,
      sets: doneSets,
    });
  };

  const abort = () => {
    setAbortOpen(true);
  };

  const leaveWithoutEnding = () => {
    // Keep the workout active so the floating banner stays and timer keeps running.
    setAbortOpen(false);
    navigate({ to: "/hem" });
  };

  const endWorkout = () => {
    clearActiveWorkout();
    setAbortOpen(false);
    navigate({ to: "/schema/$id", params: { id: schemaId } });
  };

  // Load swap candidates when dialog opens
  useEffect(() => {
    if (!swapOpen) return;
    const cur = exercises[idx];
    if (!cur) return;
    const bp = cur.body_part;
    let query = supabase
      .from("exercises")
      .select("id,name,name_sv,body_part,equipment,image_url,gif_url,instructions_sv,instructions_en,target");
    if (bp) query = query.eq("body_part", bp);
    if (cur.target) query = query.eq("target", cur.target);
    if (swapEquip !== "Alla") query = query.eq("equipment", swapEquip);
    if (swapQuery.trim())
      query = query.or(`name_sv.ilike.%${swapQuery}%,name.ilike.%${swapQuery}%`);
    query.order("name_sv").limit(200).then(({ data }) => setSwapList((data as DbExercise[]) || []));
  }, [swapOpen, idx, exercises, swapQuery, swapEquip]);

  const applySwap = async (newEx: DbExercise) => {
    if (!schema) return;
    let parsed: Parsed = {};
    try { parsed = schema.description ? JSON.parse(schema.description) : {}; } catch {}
    const extras = parsed.extras?.[String(day)] ?? [];
    const baseCount = exercises.length - extras.length;
    let next: Parsed;
    if (idx < baseCount) {
      const overrides = { ...(parsed.overrides ?? {}) };
      overrides[`${day}:${idx}`] = newEx.id;
      next = { ...parsed, overrides };
    } else {
      const exIdx = idx - baseCount;
      const newExtras = { ...(parsed.extras ?? {}) };
      const arr = [...(newExtras[String(day)] ?? [])];
      arr[exIdx] = newEx.id;
      newExtras[String(day)] = arr;
      next = { ...parsed, extras: newExtras };
    }
    const desc = JSON.stringify(next);
    const { error } = await supabase
      .from("training_schemas")
      .update({ description: desc })
      .eq("id", schemaId);
    if (error) { toast.error(error.message); return; }
    setSchema((s) => (s ? { ...s, description: desc } : s));
    setExercises((arr) => {
      const copy = [...arr];
      copy[idx] = newEx;
      return copy;
    });
    setSets((prev) => {
      const nextAll = prev[newEx.id]
        ? prev
        : { ...prev, [newEx.id]: Array.from({ length: setsPerExercise }, () => ({ reps: repsHint, kg: "0", done: false })) };
      setsRef.current = nextAll;
      return nextAll;
    });
    setRest((prev) => (prev[newEx.id] ? prev : { ...prev, [newEx.id]: 60 }));
    setSwapOpen(false);
    toast.success("Övning bytt — schemat uppdaterat");
  };

  // Auto-finish when every set in every exercise is checked off.
  useEffect(() => {
    if (loading || result || finishingRef.current) return;
    if (!exercises.length) return;
    const allDone = exercises.every((ex) => {
      const arr = sets[ex.id] ?? [];
      return arr.length > 0 && arr.every((s) => s.done);
    });
    if (allDone) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, exercises, loading, result]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground text-center">Laddar pass…</p>;
  if (!current) return <p className="p-6 text-sm text-muted-foreground text-center">Inga övningar hittades.</p>;

  const exSets = sets[current.id] ?? [];
  const lastDone = exSets.filter((s) => s.done).length;
  const rec = recs[current.id] ?? null;
  const media = current.gif_url || current.image_url;
  const instructions = (current.instructions_sv?.length ? current.instructions_sv : current.instructions_en) ?? [];
  const restPct = restTotal > 0 ? (restLeft / restTotal) * 100 : 0;
  const restDone = resting && restLeft === 0;

  return (
    <div className="max-w-md mx-auto pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-12 flex items-center px-3">
        <button onClick={abort} className="flex items-center gap-1 text-primary text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>
        <div className="flex-1 text-center leading-tight">
          <p className="font-semibold text-sm">Träningspass</p>
          <p className="text-[10px] text-muted-foreground capitalize tabular-nums">{formatToday()}</p>
        </div>
        <div className="w-16 text-right text-xs tabular-nums font-bold text-primary">{fmt(elapsed)}</div>
      </header>

      {/* Hero image */}
      <div className="bg-white aspect-square mx-auto max-w-xs mt-3 rounded-xl overflow-hidden flex items-center justify-center">
        {media ? (
          <img src={media} alt={current.name_sv || current.name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-muted-foreground text-sm">Ingen bild</span>
        )}
      </div>

      {/* Progress */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Övning <span className="text-foreground font-bold">{idx + 1}</span> av <span className="text-foreground font-bold">{exercises.length}</span></span>
          <span><span className="text-primary font-bold">{doneCount}</span> gjorda · <span className="text-foreground font-bold">{exercises.length - doneCount}</span> kvar</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-success transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Title row */}
      <div className="px-4 mt-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold capitalize">{current.name_sv || current.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/40 font-semibold">{current.body_part ?? "Övning"}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{exSets.length} set · {repsHint} reps</span>
          </div>
        </div>
        <button onClick={abort} className="h-8 w-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setSwapQuery(""); setSwapEquip("Alla"); setSwapOpen(true); }}
          title="Byt övning"
          className="h-8 w-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 flex items-center justify-center flex-shrink-0"
        >
          <Repeat className="h-4 w-4" />
        </button>
      </div>

      {/* Rest timer bar */}
      <div className="px-4 mt-3">
        <div className="rounded-xl bg-[oklch(0.18_0.06_265)] border border-primary/40 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold tabular-nums">
            <Timer className="h-4 w-4" /> {fmt(elapsed)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Vila:</span>
            <button onClick={() => adjustRest(current.id, -15)} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center"><Minus className="h-3 w-3" /></button>
            <span className="font-bold text-foreground w-10 text-center">{rest[current.id] ?? 60}s</span>
            <button onClick={() => adjustRest(current.id, 15)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      {/* Smart weight recommendation */}
      {rec && (
        <div className="px-4 mt-2">
          <div
            className={cn(
              "rounded-xl border px-3 py-2 flex items-center gap-3",
              rec.action === "increase" && "bg-success/10 border-success/40",
              rec.action === "hold" && "bg-primary/10 border-primary/40",
              rec.action === "deload" && "bg-streak/10 border-streak/40",
              rec.action === "start" && "bg-muted/40 border-border",
            )}
          >
            <span
              className={cn(
                "h-10 min-w-[3.25rem] px-2 rounded-lg font-extrabold text-sm flex items-center justify-center",
                rec.action === "increase" && "bg-success/20 text-success",
                rec.action === "hold" && "bg-primary/20 text-primary",
                rec.action === "deload" && "bg-streak/20 text-streak",
                rec.action === "start" && "bg-secondary text-foreground",
              )}
            >
              {rec.kg != null ? `${rec.kg} kg` : "—"}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-xs font-bold flex items-center gap-1",
                  rec.action === "increase" && "text-success",
                  rec.action === "hold" && "text-primary",
                  rec.action === "deload" && "text-streak",
                  rec.action === "start" && "text-foreground",
                )}
              >
                <TrendingUp className="h-3 w-3" />
                {rec.action === "increase" && "Öka vikten"}
                {rec.action === "hold" && "Behåll vikten"}
                {rec.action === "deload" && "Sänk vikten"}
                {rec.action === "start" && "Förslag"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug">{rec.message}</p>
            </div>
            {rec.prevKg != null && (
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground">Senast</p>
                <p className="text-xs font-bold">{rec.prevKg}kg × {rec.prevTopReps ?? "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions row */}
      <div className="px-4 mt-2">
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full rounded-xl bg-card border border-border px-3 py-2.5 flex items-center gap-2 text-xs"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span className="flex-1 text-left font-semibold">Instruktioner</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showInstructions && "rotate-180")} />
        </button>
        {showInstructions && (
          <div className="mt-2 rounded-xl bg-card/60 border border-border px-4 py-4">
            {instructions.length ? (
              <ol className="space-y-3 text-sm font-medium text-foreground list-decimal list-outside pl-5 marker:text-primary marker:font-bold">
                {instructions.map((step, i) => (
                  <li key={i} className="leading-relaxed pl-1">{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Inga instruktioner tillgängliga för denna övning.</p>
            )}
          </div>
        )}
      </div>

      {/* Set table */}
      <div className="px-4 mt-3">
        <div className="rounded-xl bg-card border border-border px-3 py-2">
          <div className="grid grid-cols-[28px_56px_1fr_1fr_32px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border items-center">
            <span>Set</span><span>Senast</span><span className="text-center">Reps</span><span className="text-center">Kg</span>
            <button
              onClick={() => toggleAllSets(current.id)}
              className="text-center hover:text-primary transition-colors flex items-center justify-center p-1 rounded hover:bg-secondary/50 cursor-pointer w-full"
              title="Klarmarkera / avmarkera alla set"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
          {exSets.map((s, i) => {
          const prev = last[current.id];
          return (
            <div key={i} className={cn(
               "grid grid-cols-[28px_56px_1fr_1fr_32px] gap-2 items-center py-2 border-b border-border/50 last:border-b-0 transition-colors",
              s.done && "bg-primary/5"
            )}>
              {s.done ? (
                <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              ) : (
                <span className="font-bold text-sm">{i + 1}</span>
              )}
              <span className="text-[11px] text-muted-foreground">{prev ? `${prev.kg}×${prev.reps}` : "—"}</span>
              <input
                value={s.reps}
                onChange={(e) => updateSet(current.id, i, { reps: e.target.value })}
                className="w-full min-w-0 bg-transparent border-b border-border text-center font-bold text-sm py-1 focus:outline-none focus:border-primary"
              />
              <input
                value={s.kg}
                onChange={(e) => updateSet(current.id, i, { kg: e.target.value })}
                className="w-full min-w-0 bg-transparent border-b border-border text-center font-bold text-sm py-1 focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => toggleDone(current.id, i)}
                className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all",
                  s.done
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_oklch(0.6_0.2_265/0.5)]"
                    : "border-border hover:border-primary/50")}
              >
                {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </button>
            </div>
          );
          })}
          
          <div className="pt-2 mt-1 border-t border-border/40 flex justify-end">
            <button
              onClick={() => toggleAllSets(current.id)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1.5 p-1 rounded transition-colors"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              {exSets.every(s => s.done) ? "Avmarkera alla" : "Markera alla som klara"}
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming exercises strip */}
      {exercises.length > 1 && (
        <div className="max-w-md mx-auto px-4 pb-28 pt-4">
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-foreground/90">
                Övningar idag
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {doneCount}<span className="opacity-60">/{exercises.length}</span>
            </p>
          </div>

          <div
            className="grid gap-2 pb-3"
            style={{ gridTemplateColumns: `repeat(${exercises.length}, minmax(0, 1fr))` }}
          >
            {exercises.map((ex, i) => {
              const exSets = sets[ex.id] ?? [];
              const isDone = exSets.length > 0 && exSets.every((s) => s.done);
              const isCurrent = i === idx;
              const thumb = ex.image_url || ex.gif_url;
              return (
                <button
                  key={ex.id}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300",
                    isCurrent
                      ? "ring-2 ring-primary shadow-[0_10px_30px_-8px_oklch(0.78_0.22_150/0.6)] scale-[1.04] -translate-y-0.5"
                      : isDone
                      ? "ring-1 ring-primary/30"
                      : "ring-1 ring-border/40 hover:ring-border/80 hover:-translate-y-0.5"
                  )}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-white to-zinc-100 overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={ex.name_sv || ex.name}
                        loading="lazy"
                        className={cn(
                          "w-full h-full object-contain transition-transform duration-500 group-hover:scale-105",
                          isDone && !isCurrent && "grayscale-[60%]"
                        )}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {(ex.name_sv || ex.name).slice(0, 2)}
                      </div>
                    )}

                    {/* Dark gradient at bottom for label legibility */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                    {/* Number badge */}
                    <div
                      className={cn(
                        "absolute top-1.5 left-1.5 h-6 w-6 rounded-full text-[11px] font-extrabold flex items-center justify-center backdrop-blur ring-1 transition-colors",
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-primary/60 shadow-md"
                          : isDone
                          ? "bg-primary/90 text-primary-foreground ring-primary/40"
                          : "bg-black/60 text-white ring-white/20"
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </div>

                    {/* Current pill */}
                    {isCurrent && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider shadow-md animate-pulse">
                        Nu
                      </div>
                    )}

                    {/* Label over gradient */}
                    <div className="absolute inset-x-0 bottom-0 px-2 py-2">
                      <p className="text-[10px] font-bold text-white leading-tight line-clamp-2 drop-shadow">
                        {ex.name_sv || ex.name}
                      </p>
                      <p className="text-[8px] uppercase tracking-wider text-white/70 mt-0.5">
                        {(sets[ex.id]?.length ?? 0)} set
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action footer */}
      <div className="fixed bottom-16 inset-x-0 px-4 z-30">
        <div className="max-w-md mx-auto space-y-2">
          <Button onClick={next} className="w-full h-12 rounded-xl bg-primary text-base font-bold">
            {idx === exercises.length - 1 ? "Avsluta pass ✓" : "Nästa övning →"}
          </Button>
          <button onClick={() => { updateSet(current.id, 0, { done: false }); next(); }} className="w-full text-center text-[11px] text-muted-foreground py-1">
            ⊘ Markera som ej utförd
          </button>
        </div>
      </div>

      {/* Rest countdown overlay */}
      {resting && (
        <>
          {/* Fullscreen dark backdrop covering entire screen during rest */}
          {!restDone && (
            <div
              className="fixed inset-0 z-40 pointer-events-none will-change-transform"
              style={{
                background:
                  "linear-gradient(to bottom, oklch(0.04 0.02 265 / 0.55) 0%, oklch(0.05 0.02 265 / 0.5) 80%, oklch(0.08 0.03 265 / 0.45) 100%)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                transform: `translateY(${100 - restPct}%)`,
                transition: "transform 1s linear",
              }}
            />
          )}

          {/* Floating timer / done card — always centered, above curtain */}
          <div
            onClick={() => { setResting(false); setRestLeft(0); }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
          >
            {restDone ? (
              <div className="text-center px-6 relative">
                {/* Outer pulsing aura */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-20 w-[520px] h-[520px] rounded-full blur-3xl opacity-70 animate-pulse"
                  style={{
                    background:
                      "radial-gradient(circle at center, oklch(0.78 0.22 150 / 0.55), transparent 65%)",
                  }}
                />
                {/* Rotating conic ring */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[360px] h-[360px] rounded-full opacity-50"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, oklch(0.82 0.22 150 / 0.8) 90deg, transparent 180deg, oklch(0.7 0.2 175 / 0.8) 270deg, transparent 360deg)",
                    animation: "spin 6s linear infinite",
                    maskImage: "radial-gradient(circle, transparent 52%, black 54%, black 70%, transparent 72%)",
                    WebkitMaskImage: "radial-gradient(circle, transparent 52%, black 54%, black 70%, transparent 72%)",
                  }}
                />
                {/* Sparkle particles */}
                {[
                  { top: "-30px", left: "10%", delay: "0ms", size: 8 },
                  { top: "20%", left: "-40px", delay: "120ms", size: 6 },
                  { top: "-20px", right: "8%", delay: "240ms", size: 10 },
                  { top: "60%", right: "-30px", delay: "360ms", size: 7 },
                  { bottom: "-30px", left: "20%", delay: "180ms", size: 9 },
                  { bottom: "-10px", right: "15%", delay: "300ms", size: 6 },
                ].map((p, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full animate-ping"
                    style={{
                      width: p.size,
                      height: p.size,
                      top: p.top,
                      left: p.left,
                      right: p.right,
                      bottom: p.bottom,
                      background: "oklch(0.92 0.18 150)",
                      boxShadow: "0 0 12px oklch(0.82 0.22 150 / 0.9)",
                      animationDelay: p.delay,
                      animationDuration: "1.8s",
                    }}
                  />
                ))}

                {/* Main badge */}
                <div
                  className="relative inline-flex flex-col items-center justify-center px-8 py-5 rounded-[1.75rem] ring-1 ring-white/30 shadow-[0_20px_60px_-10px_oklch(0.78_0.22_150/0.7),inset_0_1px_0_oklch(1_0_0/0.4)] animate-in zoom-in-50 fade-in slide-in-from-bottom-4 duration-500 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.88 0.2 145) 0%, oklch(0.78 0.22 155) 45%, oklch(0.68 0.2 180) 100%)",
                  }}
                >
                  {/* Glossy sheen sweep */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 30%, oklch(1 0 0 / 0.45) 50%, transparent 70%)",
                      animation: "shine-sweep 2.4s ease-in-out infinite",
                    }}
                  />
                  {/* Top highlight */}
                  <div
                    className="absolute inset-x-0 top-0 h-1/2 pointer-events-none opacity-50"
                    style={{
                      background:
                        "linear-gradient(to bottom, oklch(1 0 0 / 0.35), transparent)",
                    }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">⚡</span>
                    <p
                      className="font-extrabold text-3xl tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                      style={{ color: "oklch(0.18 0.06 160)" }}
                    >
                      Kör på igen!
                    </p>
                    <span className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">⚡</span>
                  </div>
                </div>

                <p className="relative text-xs uppercase tracking-[0.25em] text-white/80 mt-5 animate-in fade-in duration-700 delay-200 fill-mode-both">
                  Tryck var som helst för att fortsätta
                </p>
              </div>
            ) : (
              <>
                <p className="text-white text-3xl font-bold mb-4 animate-fade-in">Vila</p>
                <div className="flex items-center gap-8">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRestLeft((s) => Math.max(0, s - 5)); }}
                    className="h-14 w-14 rounded-full bg-transparent border border-white/30 text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors"
                  >-5</button>
                  <p key={restLeft} className="text-white font-extrabold text-8xl tabular-nums tracking-tight drop-shadow-2xl min-w-[140px] text-center animate-scale-in">{restLeft}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRestLeft((s) => s + 5); setRestTotal((t) => Math.max(t, restLeft + 5)); }}
                    className="h-14 w-14 rounded-full bg-transparent border border-white/30 text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors"
                  >+5</button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setResting(false); setRestLeft(0); }}
                  className="mt-8 px-6 py-2.5 rounded-full bg-transparent border border-white/30 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  ▶| Hoppa över
                </button>
              </>
            )}
          </div>
        </>
      )}

      <AlertDialog open={abortOpen} onOpenChange={setAbortOpen}>
        <AlertDialogContent className="rounded-2xl border-border max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Timer className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">Lämna passet?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Du har tränat i <span className="font-semibold text-foreground tabular-nums">{fmt(elapsed)}</span>.
              Du kan pausa och återgå senare — tiden fortsätter ticka.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-col-reverse gap-2">
            <AlertDialogCancel className="w-full mt-0">Fortsätt träna</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveWithoutEnding}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Lämna (fortsätt i bakgrunden)
            </AlertDialogAction>
            <button
              onClick={endWorkout}
              className="w-full text-xs text-destructive hover:underline py-1"
            >
              Avbryt passet helt
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center mb-3 shadow-[0_0_30px_oklch(0.65_0.2_265/0.5)]">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-extrabold">Snyggt jobbat!</h2>
              <p className="text-sm text-muted-foreground mt-1">Passet är sparat i din historik.</p>
              <p className="text-xs font-semibold text-primary mt-2 capitalize tabular-nums">{formatToday()}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-2xl border border-primary/30 bg-[oklch(0.18_0.06_265)] p-3 flex flex-col items-center">
                <Timer className="h-5 w-5 text-primary mb-1" />
                <p className="text-xl font-extrabold tabular-nums">{fmt(result.durationSec)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Tid</p>
              </div>
              <div className="rounded-2xl border border-streak/30 bg-[oklch(0.18_0.06_40)] p-3 flex flex-col items-center">
                <Flame className="h-5 w-5 text-streak mb-1" />
                <p className="text-xl font-extrabold tabular-nums">{result.calories}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Kalorier</p>
              </div>
              <div className="rounded-2xl border border-success/30 bg-[oklch(0.18_0.06_150)] p-3 flex flex-col items-center">
                <Dumbbell className="h-5 w-5 text-success mb-1" />
                <p className="text-xl font-extrabold tabular-nums">{Math.round(result.volumeKg)}<span className="text-xs font-bold text-muted-foreground"> kg</span></p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Volym</p>
              </div>
              <div className="rounded-2xl border border-accent/30 bg-[oklch(0.18_0.06_300)] p-3 flex flex-col items-center">
                <Check className="h-5 w-5 text-accent mb-1" />
                <p className="text-xl font-extrabold tabular-nums">{result.sets}<span className="text-xs font-bold text-muted-foreground">/{exercises.reduce((n, ex) => n + (sets[ex.id]?.length ?? 0), 0)}</span></p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Sets</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => { setResult(null); navigate({ to: "/progress" }); }}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary to-success text-primary-foreground font-bold"
              >
                Se min utveckling
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setResult(null); navigate({ to: "/hem" }); }}
                className="w-full h-10 rounded-2xl"
              >
                Till startsidan
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="rounded-2xl w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Byt övning</DialogTitle>
            <DialogDescription>
              Välj en ersättare för {current?.name_sv || current?.name}. Ändringen sparas i schemat.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pt-2 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={swapQuery}
                onChange={(e) => setSwapQuery(e.target.value)}
                placeholder="Sök övning…"
                className="pl-9 h-10"
              />
            </div>
            <div className="relative">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5 block mb-1">Utrustning</span>
              <select
                value={swapEquip}
                onChange={(e) => setSwapEquip(e.target.value)}
                className="w-full appearance-none rounded-full border border-primary/60 bg-primary/15 text-primary text-sm font-semibold px-3.5 pr-8 h-10 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {["Alla","Hantel","Skivstång","Kabel","Smithmaskin","Hävmaskin","Kettlebell","Kroppsvikt","Gummiband"].map((eq) => (
                  <option key={eq} value={eq} className="bg-card text-foreground">{eq}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto px-4 py-2 space-y-2">
            {swapList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Inga övningar hittades.</p>
            )}
            {swapList.map((e) => {
              const media = e.image_url || e.gif_url;
              return (
                <button
                  key={e.id}
                  onClick={() => applySwap(e)}
                  className="w-full flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/60 transition-colors"
                >
                  <div className="h-14 w-14 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {media ? <img src={media} alt="" className="w-full h-full object-contain" loading="lazy" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary capitalize break-words leading-snug">{e.name_sv || e.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{e.body_part} · {e.equipment}</p>
                  </div>
                  <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button variant="ghost" onClick={() => setSwapOpen(false)} className="rounded-full">Stäng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

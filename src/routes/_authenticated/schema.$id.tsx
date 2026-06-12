import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Trash2, Share2, Pencil, ChevronLeft, ChevronRight, Play, X, ChevronDown, ChevronUp, Plus, Check, Repeat, Search, Mic, MicOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { readActiveWorkout, clearActiveWorkout } from "@/lib/active-workout";
import { usePassProgress } from "@/lib/pass-progress";
import { cn } from "@/lib/utils";
import {
  buildSchemaPlan,
  DB_FETCH_MAP,
  type Parsed,
} from "@/lib/training-plan";

export const Route = createFileRoute("/_authenticated/schema/$id")({
  component: SchemaDetailPage,
});

type Schema = {
  id: string;
  name: string;
  tags: string[] | null;
  sessions_per_week: number | null;
  difficulty: string | null;
  progress_percent: number | null;
  is_active: boolean | null;
  description: string | null;
  created_at: string;
};

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

type DbExercise = {
  id: string;
  name: string;
  name_sv: string | null;
  body_part: string | null;
  equipment: string;
  image_url: string | null;
  gif_url: string | null;
  target?: string | null;
};

function SchemaDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [byPart, setByPart] = useState<Record<string, DbExercise[]>>({});
  const [overrideEx, setOverrideEx] = useState<Record<string, DbExercise>>({});
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ dayIdx: number; slotIdx: number; muscles: string[] } | null>(null);
  const [swapQuery, setSwapQuery] = useState("");
  const [swapEquip, setSwapEquip] = useState<string>("Alla");
  const [swapList, setSwapList] = useState<DbExercise[]>([]);
  const [swapAll, setSwapAll] = useState(false);
  const [swapBody, setSwapBody] = useState<string>("Denna dag");
  const [swapMode, setSwapMode] = useState<"swap" | "add">("swap");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  // Snapshot of the saved description before any unsaved regen on a given day.
  // Used to enable "Ångra" (revert) per day. Key = dayIdx as string.
  const [pendingOriginal, setPendingOriginal] = useState<Record<string, string | null>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);

  const toggleVoiceSearch = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Röstigenkänning stöds inte i den här webbläsaren");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "sv-SE";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setSwapQuery(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  // countdown 3..2..1..GO → navigate to pass page
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = setTimeout(() => {
        setCountdown(null);
        if (pendingDay !== null) {
          navigate({ to: "/pass/$schemaId", params: { schemaId: id }, search: { day: pendingDay } });
        }
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, pendingDay, id, navigate]);

  const startPass = (sessionName: string, dayIdx: number) => {
    setActiveSession(sessionName);
    setPendingDay(dayIdx);
    setCountdown(3);
  };
  const stopPass = () => {
    setActiveSession(null);
    setPendingDay(null);
    setCountdown(null);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("training_schemas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setSchema((data as Schema) || null);
      setLoading(false);
    })();
  }, [id]);

  // Load completed sessions for this schema (current ISO week, Mon→Sun)
  // to drive both the total progress bar and per-day "100%" markers.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const dow = (now.getDay() + 6) % 7; // 0=Mon
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(now.getDate() - dow);
      const { data } = await supabase
        .from("workout_sessions")
        .select("day_index,completed_at")
        .eq("user_id", user.id)
        .eq("schema_id", id)
        .gte("completed_at", weekStart.toISOString());
      const days = new Set<number>();
      (data as { day_index: number | null }[] | null)?.forEach((r) => {
        if (typeof r.day_index === "number") days.add(r.day_index);
      });
      setCompletedDays(days);
    })();
  }, [id]);

  useEffect(() => {
    if (!schema) return;
    let parts: string[] = [];
    try {
      const p = schema?.description ? JSON.parse(schema.description) : null;
      parts = (p?.bodyParts as string[] | undefined) ?? ["Bröst", "Rygg", "Ben"];
    } catch { parts = ["Bröst", "Rygg", "Ben"]; }
    const dbParts = Array.from(new Set(parts.flatMap((m) => DB_FETCH_MAP[m] ?? [m])));
    if (!dbParts.length) return;
    (async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id,name,name_sv,body_part,equipment,image_url,gif_url,target")
        .in("body_part", dbParts)
        .order("id")
        .limit(5000);
      const map: Record<string, DbExercise[]> = {};
      (data as DbExercise[] | null)?.forEach((e) => {
        // Split "Överarmar" into Biceps/Triceps virtual buckets via target
        let k = e.body_part ?? "_";
        if (k === "Överarmar" && (e.target === "Biceps" || e.target === "Triceps")) {
          k = e.target;
        }
        (map[k] ||= []).push(e);
      });
      setByPart(map);
    })();
  }, [schema?.id, schema?.description]);

  // Fetch any exercises referenced by overrides that aren't already in byPart
  useEffect(() => {
    let parsedLocal: Parsed | null = null;
    try { parsedLocal = schema?.description ? JSON.parse(schema.description) : null; } catch {}
    const ids = [
      ...Object.values(parsedLocal?.overrides ?? {}),
      ...Object.values(parsedLocal?.extras ?? {}).flat(),
    ];
    if (!ids.length) return;
    const known = new Set<string>(Object.values(byPart).flat().map((e) => e.id).concat(Object.keys(overrideEx)));
    const missing = ids.filter((id) => !known.has(id));
    if (!missing.length) return;
    (async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id,name,name_sv,body_part,equipment,image_url,gif_url,target")
        .in("id", missing);
      const map: Record<string, DbExercise> = { ...overrideEx };
      (data as DbExercise[] | null)?.forEach((e) => { map[e.id] = e; });
      setOverrideEx(map);
    })();
  }, [schema?.description, byPart]);

  // Load swap list when dialog opens / filters change
  useEffect(() => {
    if (!swapOpen || !swapTarget) return;
    // Body filter: "Denna dag" = current day's muscles, "Alla" = no filter,
    // any other value = that specific body part picked from chip row.
    const useDay = swapBody === "Denna dag";
    const useAll = swapBody === "Alla";
    const dbParts = useAll
      ? null
      : useDay
        ? Array.from(new Set(swapTarget.muscles.flatMap((m) => DB_FETCH_MAP[m] ?? [m])))
        : (DB_FETCH_MAP[swapBody] ?? [swapBody]);
    const targetFilter = useAll
      ? null
      : useDay
        ? (swapTarget.muscles.includes("Biceps") && !swapTarget.muscles.includes("Triceps")
            ? "Biceps"
            : swapTarget.muscles.includes("Triceps") && !swapTarget.muscles.includes("Biceps")
              ? "Triceps"
              : null)
        : (swapBody === "Biceps" ? "Biceps" : swapBody === "Triceps" ? "Triceps" : null);
    let query = supabase
      .from("exercises")
      .select("id,name,name_sv,body_part,equipment,image_url,gif_url");
    if (dbParts && dbParts.length) query = query.in("body_part", dbParts);
    if (targetFilter) query = query.eq("target", targetFilter);
    if (swapEquip !== "Alla") query = query.eq("equipment", swapEquip);
    if (swapQuery.trim()) query = query.or(`name_sv.ilike.%${swapQuery}%,name.ilike.%${swapQuery}%`);
    query.order("name_sv").limit(200).then(({ data }) => setSwapList((data as DbExercise[]) || []));
  }, [swapOpen, swapTarget, swapQuery, swapEquip, swapAll, swapBody]);

  const openSwap = (dayIdx: number, slotIdx: number, muscles: string[]) => {
    setSwapTarget({ dayIdx, slotIdx, muscles });
    setSwapMode("swap");
    setSwapQuery("");
    setSwapEquip("Alla");
    setSwapAll(false);
    setSwapBody("Denna dag");
    setSwapOpen(true);
  };

  const openAdd = (dayIdx: number, muscles: string[]) => {
    setSwapTarget({ dayIdx, slotIdx: -1, muscles });
    setSwapMode("add");
    setSwapQuery("");
    setSwapEquip("Alla");
    setSwapAll(false);
    setSwapBody("Denna dag");
    setSwapOpen(true);
  };

  const applySwap = async (ex: DbExercise) => {
    if (!schema || !swapTarget) return;
    let parsedLocal: Parsed = {};
    try { parsedLocal = schema.description ? JSON.parse(schema.description) : {}; } catch {}
    let next: Parsed;
    if (swapMode === "add") {
      const extras = { ...(parsedLocal.extras ?? {}) };
      const key = String(swapTarget.dayIdx);
      extras[key] = [...(extras[key] ?? []), ex.id];
      next = { ...parsedLocal, extras };
    } else {
      const overrides = { ...(parsedLocal.overrides ?? {}) };
      overrides[`${swapTarget.dayIdx}:${swapTarget.slotIdx}`] = ex.id;
      next = { ...parsedLocal, overrides };
    }
    const desc = JSON.stringify(next);
    setOverrideEx((m) => ({ ...m, [ex.id]: ex }));
    setPendingOriginal((m) => (
      m[String(swapTarget.dayIdx)] !== undefined
        ? m
        : { ...m, [String(swapTarget.dayIdx)]: schema.description }
    ));
    setSchema((s) => (s ? { ...s, description: desc } : s));
    setSwapOpen(false);
    toast.success("Förhandsvisning — tryck Spara för att behålla");
  };

  const removeExtra = async (dayIdx: number, exId: string) => {
    if (!schema) return;
    let parsedLocal: Parsed = {};
    try { parsedLocal = schema.description ? JSON.parse(schema.description) : {}; } catch {}
    const extras = { ...(parsedLocal.extras ?? {}) };
    const key = String(dayIdx);
    extras[key] = (extras[key] ?? []).filter((x) => x !== exId);
    if (!extras[key].length) delete extras[key];
    const next: Parsed = { ...parsedLocal, extras };
    const desc = JSON.stringify(next);
    setPendingOriginal((m) => (
      m[String(dayIdx)] !== undefined ? m : { ...m, [String(dayIdx)]: schema.description }
    ));
    setSchema((s) => (s ? { ...s, description: desc } : s));
    toast.success("Förhandsvisning — tryck Spara för att behålla");
  };

  const regenerateDay = async (dayIdx: number) => {
    if (!schema) return;
    let parsedLocal: Parsed = {};
    try { parsedLocal = schema.description ? JSON.parse(schema.description) : {}; } catch {}
    // Bump regen salt for this day, and clear that day's overrides/extras
    // so the rebuilt session shows fresh exercises. This is a PREVIEW only —
    // the change is held in local state until the user presses "Spara".
    const regen = { ...(parsedLocal.regen ?? {}) };
    regen[String(dayIdx)] = (regen[String(dayIdx)] ?? 0) + 1;
    const overrides = { ...(parsedLocal.overrides ?? {}) };
    Object.keys(overrides).forEach((k) => {
      if (k.startsWith(`${dayIdx}:`)) delete overrides[k];
    });
    const extras = { ...(parsedLocal.extras ?? {}) };
    delete extras[String(dayIdx)];
    const next: Parsed = { ...parsedLocal, regen, overrides, extras };
    const desc = JSON.stringify(next);
    // Snapshot the currently-saved description for this day only once,
    // so repeated regenerations before saving still revert to the original.
    setPendingOriginal((m) => (
      m[String(dayIdx)] !== undefined ? m : { ...m, [String(dayIdx)]: schema.description }
    ));
    setSchema((s) => (s ? { ...s, description: desc } : s));
    toast.success("Förhandsvisning — tryck Spara för att behålla");
  };

  const saveDay = async (dayIdx: number) => {
    if (!schema) return;
    setSavingDay(dayIdx);
    const { error } = await supabase
      .from("training_schemas")
      .update({ description: schema.description })
      .eq("id", id);
    setSavingDay(null);
    if (error) return toast.error(error.message);
    setPendingOriginal((m) => {
      const next = { ...m };
      delete next[String(dayIdx)];
      return next;
    });
    toast.success("Dagen sparad");
  };

  const undoDay = (dayIdx: number) => {
    const original = pendingOriginal[String(dayIdx)];
    if (original === undefined) return;
    setSchema((s) => (s ? { ...s, description: original } : s));
    setPendingOriginal((m) => {
      const next = { ...m };
      delete next[String(dayIdx)];
      return next;
    });
    toast.success("Ändringen ångrad");
  };

  const remove = async () => {
    setDeleting(true);
    const { error } = await supabase.from("training_schemas").delete().eq("id", id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    const active = readActiveWorkout();
    if (active?.schemaId === id) clearActiveWorkout();
    setConfirmOpen(false);
    toast.success("Schema borttaget");
    navigate({ to: "/hem" });
  };

  const openEdit = () => {
    setEditName(schema?.name ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name) return toast.error("Namnet får inte vara tomt");
    setSaving(true);
    const { error } = await supabase
      .from("training_schemas")
      .update({ name })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setSchema((s) => (s ? { ...s, name } : s));
    setEditOpen(false);
    toast.success("Schema uppdaterat");
  };

  let parsed: Parsed | null = null;
  try { parsed = schema?.description ? JSON.parse(schema.description) : null; } catch { parsed = null; }
  const plan = buildSchemaPlan(parsed, byPart, overrideEx, schema?.id ?? id);
  // Öppna automatiskt dagens dag (Mån=0 ... Sön=6) när planen laddats.
  // Om planen har färre dagar än veckodagen, fall tillbaka till sista passet.
  useEffect(() => {
    if (autoExpanded || !plan.length) return;
    const weekdayIdx = (new Date().getDay() + 6) % 7;
    const target = Math.min(weekdayIdx, plan.length - 1);
    setExpanded(target);
    setAutoExpanded(true);
  }, [plan.length, autoExpanded]);
  const totalWeeks = (() => {
    const m = parsed?.period?.match(/(\d+)/);
    return m ? parseInt(m[1]) : 1;
  })();
  // Per-day percent. A fully-saved session is always 100%, otherwise we
  // mirror live pass-page progress (sets ticked off) from localStorage.
  const passProgress = usePassProgress(schema?.id);
  const dayPercent = (i: number) => {
    if (completedDays.has(i)) return 100;
    return Math.max(0, Math.min(100, Math.round(passProgress[i] ?? 0)));
  };
  const totalProgress = plan.length
    ? Math.round(
        plan.reduce((acc, _p, i) => acc + dayPercent(i), 0) / plan.length,
      )
    : 0;
  const title = schema ? `${schema.name}` : "";
  const subtitle = parsed
    ? `${parsed.height ? parsed.height + "cm" : ""}${parsed.weight ? "/" + parsed.weight + "kg" : ""}`
    : "";

  return (
    <div className="max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-12 flex items-center px-3">
        <button onClick={() => router.history.back()} className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold text-sm flex-1 text-center">Träningspass</p>
        <div className="flex items-center gap-1">
          <button className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"><Share2 className="h-4 w-4" /></button>
          <button onClick={openEdit} className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"><Pencil className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Laddar…</p>
        ) : !schema ? (
          <p className="text-sm text-muted-foreground text-center py-8">Schemat hittades inte.</p>
        ) : (
          <>
            {/* Title block */}
            <div className="text-center">
              <h1 className="font-extrabold text-lg leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}{parsed?.age ? ` · ${parsed.age} år` : ""}</p>}
            </div>

            {/* Week navigator + total progress */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setWeek((w) => Math.max(1, w - 1))} className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Vecka</p>
                  <p className="font-extrabold text-xl text-primary">{week}<span className="text-xs text-muted-foreground font-normal"> / {totalWeeks}</span></p>
                </div>
                <button onClick={() => setWeek((w) => Math.min(totalWeeks, w + 1))} className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Totalt genomfört</span>
                <span className="text-success font-bold">{totalProgress}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-to-r from-success to-primary" style={{ width: `${Math.min(100, totalProgress)}%` }} />
              </div>

              {/* Sessions row */}
              <div className="mt-4">
                <p className="text-[11px] tracking-widest text-muted-foreground font-semibold mb-2">VECKANS TRÄNING</p>
                <div className="flex items-center justify-between gap-1.5">
                  {plan.map((p, i) => (
                    <button
                      key={p.day + i}
                      onClick={() => setExpanded(i)}
                      className={cn(
                        "flex-1 aspect-square rounded-full text-[11px] font-bold border-2 flex items-center justify-center transition-all",
                        expanded === i
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_14px_oklch(0.65_0.2_265/0.55)]"
                          : "bg-[oklch(0.18_0.04_240)] border-primary/40 text-foreground"
                      )}
                    >
                      {p.day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat value={plan.length} label="Pass" tint="primary" />
                <MiniStat value={(parsed?.exercisesPerSession ?? 5) * plan.length} label="Övningar" tint="primary" />
                <MiniStat value={`${totalProgress}%`} label="Klart" tint="success" />
                <MiniStat value={`${plan.length * 7}d`} label="Total tid" tint="primary" />
              </div>
            </div>

            {/* Day cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs tracking-widest text-muted-foreground font-semibold">VECKANS PASS</p>
                <button className="text-[11px] text-primary font-semibold flex items-center gap-1"><Plus className="h-3 w-3" />Lägg till pass</button>
              </div>
              <div className="space-y-3">
                {plan.map((p, i) => {
                  const open = expanded === i;
                  const completed = completedDays.has(i);
                  const pct = dayPercent(i);
                  return (
                    <div key={p.day + i} className="rounded-2xl border border-primary/30 bg-card overflow-hidden">
                      <button
                        onClick={() => setExpanded(open ? null : i)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <span className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border",
                          completed ? "bg-success/20 text-success border-success/50" : "bg-primary/15 text-primary border-primary/40"
                        )}>
                          {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{p.full}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.muscles.join(" · ")}</p>
                        </div>
                        <span className="text-[11px] text-success font-bold">{pct}%</span>
                        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {open && (
                        <div className="border-t border-border px-3 py-3 space-y-2 bg-[oklch(0.14_0.03_240)]">
                          {p.exercises.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Laddar övningar…</p>
                          )}
                          {p.exercises.map((ex, k) => {
                            const media = ex.image_url || ex.gif_url;
                            const extrasForDay = parsed?.extras?.[String(i)] ?? [];
                            const baseCount = p.exercises.length - extrasForDay.length;
                            const isExtra = k >= baseCount;
                            return (
                              <div
                                key={ex.id + k}
                                className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card/60 p-2.5 hover:border-primary/60 transition-colors"
                              >
                                <Link to="/ovning/$id" params={{ id: ex.id }} className="h-14 w-14 rounded-xl bg-white overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                  {media ? (
                                    <img src={media} alt={ex.name_sv || ex.name} className="w-full h-full object-contain" loading="lazy" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">{k + 1}</span>
                                  )}
                                </Link>
                                <Link to="/ovning/$id" params={{ id: ex.id }} className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-primary truncate capitalize">{ex.name_sv || ex.name}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{ex.equipment}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                      {parsed?.setsPerExercise && parsed.setsPerExercise > 0 ? parsed.setsPerExercise : 4}×8–12
                                    </span>
                                    {isExtra && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">Extra</span>}
                                  </div>
                                </Link>
                                {isExtra ? (
                                  <button
                                    onClick={() => removeExtra(i, ex.id)}
                                    title="Ta bort övning"
                                    className="h-8 w-8 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center justify-center flex-shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openSwap(i, k, p.muscles)}
                                    title="Byt övning"
                                    className="h-8 w-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 flex items-center justify-center flex-shrink-0"
                                  >
                                    <Repeat className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => openAdd(i, p.muscles)}
                            className="w-full h-10 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Lägg till övning
                          </button>
                          <button
                            onClick={() => regenerateDay(i)}
                            className="w-full h-10 rounded-xl bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent/90 transition-colors shadow-sm"
                            title={`Generera ${p.full} på nytt`}
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Generera om {p.full}
                          </button>
                          {pendingOriginal[String(i)] !== undefined && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => undoDay(i)}
                                disabled={savingDay === i}
                                className="h-10 rounded-xl"
                              >
                                <X className="h-3.5 w-3.5" /> Ångra
                              </Button>
                              <Button
                                onClick={() => saveDay(i)}
                                disabled={savingDay === i}
                                className="h-10 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                              >
                                <Check className="h-3.5 w-3.5" /> {savingDay === i ? "Sparar…" : "Spara"}
                              </Button>
                            </div>
                          )}
                          <Button onClick={() => startPass(p.full, i)} className="w-full mt-1 h-10 rounded-xl bg-primary"><Play className="h-3.5 w-3.5" /> Starta pass</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => setConfirmOpen(true)}
              className="w-full h-11 rounded-2xl"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Tar bort…" : "Ta bort schema"}
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Ta bort schema?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="text-foreground font-semibold">{schema?.name}</span> tas bort permanent. Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-full mt-0">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); remove(); }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Tar bort…" : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Redigera schema</DialogTitle>
            <DialogDescription>Byt namn på ditt träningsschema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-semibold">Namn</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Schemats namn"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-full">Avbryt</Button>
            <Button onClick={saveEdit} disabled={saving} className="rounded-full">
              {saving ? "Sparar…" : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="rounded-2xl w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{swapMode === "add" ? "Lägg till övning" : "Byt övning"}</DialogTitle>
            <DialogDescription>
              {swapMode === "add" ? "Välj en övning att lägga till" : "Välj en ersättare"} {swapBody === "Denna dag" && swapTarget ? `för ${swapTarget.muscles.join(" · ")}` : swapBody === "Alla" ? "från alla övningar" : `för ${swapBody}`}.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pt-2 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={swapQuery}
                onChange={(e) => setSwapQuery(e.target.value)}
                placeholder="Sök övning…"
                className="pl-9 pr-11 h-10"
              />
              <button
                type="button"
                onClick={toggleVoiceSearch}
                aria-label={listening ? "Stoppa diktering" : "Diktera sökning"}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                  listening ? "bg-primary text-primary-foreground animate-pulse" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5 block">Muskelgrupp</span>
                <div className="relative">
                  <select
                    value={swapBody}
                    onChange={(e) => setSwapBody(e.target.value)}
                    className="w-full appearance-none rounded-full border border-accent/60 bg-accent/15 text-accent-foreground text-sm font-semibold px-3.5 pr-8 h-10 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {["Denna dag","Alla","Bröst","Rygg","Axlar","Biceps","Triceps","Underarmar","Mage","Ben","Vader","Nacke","Kondition"].map((bp) => (
                      <option key={bp} value={bp} className="bg-card text-foreground">{bp}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-foreground pointer-events-none" />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5 block">Utrustning</span>
                <div className="relative">
                  <select
                    value={swapEquip}
                    onChange={(e) => setSwapEquip(e.target.value)}
                    className="w-full appearance-none rounded-full border border-primary/60 bg-primary/15 text-primary text-sm font-semibold px-3.5 pr-8 h-10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {["Alla","Hantel","Skivstång","Kabel","Smithmaskin","Hävmaskin","Kettlebell","Kroppsvikt","Gummiband"].map((eq) => (
                      <option key={eq} value={eq} className="bg-card text-foreground">{eq}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                </div>
              </label>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto px-4 py-2 space-y-3">
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

      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center">
          <button
            onClick={stopPass}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center justify-center">
            <div
              key={countdown}
              className="h-44 w-44 rounded-full border-4 border-primary/60 bg-primary/15 flex items-center justify-center animate-scale-in shadow-[0_0_60px_oklch(0.65_0.2_265/0.55)]"
            >
              <span className="text-7xl font-extrabold text-primary tabular-nums">
                {countdown === 0 ? "GO" : countdown}
              </span>
            </div>
          </div>
          <p className="mt-6 text-xs tracking-[0.35em] text-muted-foreground font-semibold animate-fade-in">
            {countdown === 0 ? "KÖR!" : "GÖR DIG REDO"}
          </p>
          {activeSession && (
            <p className="mt-2 text-sm font-semibold text-foreground animate-fade-in">{activeSession}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label, tint }: { value: React.ReactNode; label: string; tint: "primary" | "success" }) {
  return (
    <div className="rounded-xl border border-border bg-[oklch(0.16_0.04_240)] px-3 py-2.5">
      <p className={cn("text-xl font-extrabold", tint === "success" ? "text-success" : "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
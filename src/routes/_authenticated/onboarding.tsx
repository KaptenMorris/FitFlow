import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronLeft, Check } from "lucide-react";
import goalMuscle from "@/assets/goal-muscle.jpg";
import goalStrength from "@/assets/goal-strength.jpg";
import goalWeightloss from "@/assets/goal-weightloss.jpg";
import goalCardio from "@/assets/goal-cardio.jpg";
import goalAthletic from "@/assets/goal-athletic.jpg";
import goalHealth from "@/assets/goal-health.jpg";
import genderMan from "@/assets/gender-man.jpg";
import genderWoman from "@/assets/gender-woman.jpg";
import improveLook from "@/assets/improve-look.jpg";
import improveConfidence from "@/assets/improve-confidence.jpg";
import improveHealth from "@/assets/improve-health.jpg";
import improveEnergy from "@/assets/improve-energy.jpg";
import improveStress from "@/assets/improve-stress.jpg";
import improveImmune from "@/assets/improve-immune.jpg";
import improveFocus from "@/assets/improve-focus.jpg";
import improveDetox from "@/assets/improve-detox.jpg";
import obstacleSugar from "@/assets/obstacle-sugar.jpg";
import obstacleRules from "@/assets/obstacle-rules.jpg";
import obstacleNight from "@/assets/obstacle-night.jpg";
import obstacleSchedule from "@/assets/obstacle-schedule.jpg";
import obstacleJunk from "@/assets/obstacle-junk.jpg";
import obstacleSupport from "@/assets/obstacle-support.jpg";
import obstacleOther from "@/assets/obstacle-other.jpg";
import expTried from "@/assets/exp-tried.jpg";
import expActive from "@/assets/exp-active.jpg";
import expNew from "@/assets/exp-new.jpg";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const TOTAL_STEPS = 8;

type Goal = "bygga" | "starkare" | "ner" | "kondition" | "atletisk" | "halsa";
type Gender = "man" | "kvinna" | "annat";
type Experience = "slutade" | "fortfarande" | "aldrig";

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // answers
  const [goal, setGoal] = useState<Goal>("bygga");
  const [improvements, setImprovements] = useState<string[]>([]);
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience>("aldrig");
  const [gender, setGender] = useState<Gender>("man");
  const [birthYear, setBirthYear] = useState(1995);
  const [heightCm, setHeightCm] = useState(180);
  const [weightKg, setWeightKg] = useState(80);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const meta = (data.user.user_metadata?.display_name as string | undefined)
          ?? data.user.email?.split("@")[0] ?? "";
        setDisplayName(meta);
      }
    })();
  }, []);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canContinue = () => {
    if (step === 2) return improvements.length > 0;
    if (step === 3) return obstacles.length > 0;
    return true;
  };

  const finish = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Inte inloggad"); setSaving(false); return; }
    const birth = `${birthYear}-01-01`;
    const goalMap: Record<Goal, string> = {
      bygga: "bygga",
      starkare: "bygga",
      ner: "ner",
      kondition: "uthallighet",
      atletisk: "bygga",
      halsa: "halla",
    };
    // Hämta befintlig profil för att inte skriva över trial_started_at (DB-trigger blockerar)
    const { data: existing } = await supabase
      .from("profiles")
      .select("trial_started_at")
      .eq("id", user.id)
      .maybeSingle();
    const baseUpdate = {
      display_name: displayName.trim(),
      birth_date: birth,
      gender,
      height_cm: heightCm,
      current_weight_kg: weightKg,
      fitness_goal: goalMap[goal],
      motivation: improvements.join(", ") || null,
      limitations: obstacles.join(", ") || null,
      has_completed_onboarding: true,
    };
    const updates = existing?.trial_started_at
      ? baseUpdate
      : { ...baseUpdate, trial_started_at: new Date().toISOString() };
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Välkommen! Du har 7 dagar gratis Pro 🚀");
    navigate({ to: "/hem" });
  };

  const progress = step / TOTAL_STEPS;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[900px] rounded-full bg-[radial-gradient(closest-side,oklch(0.74_0.13_180/0.22),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.15_200/0.15),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.18_130/0.14),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={back}
            disabled={step === 1}
            className="h-9 w-9 rounded-full grid place-items-center text-white/70 hover:text-white disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500 shadow-[0_0_20px_oklch(0.74_0.13_180/0.6)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-white/50 tabular-nums w-8 text-right">{step}/{TOTAL_STEPS}</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
          {step === 1 && <StepGoal value={goal} onChange={setGoal} />}
          {step === 2 && <StepImprovements value={improvements} onChange={setImprovements} />}
          {step === 3 && <StepObstacles value={obstacles} onChange={setObstacles} />}
          {step === 4 && <StepExperience value={experience} onChange={setExperience} />}
          {step === 5 && <StepGender value={gender} onChange={setGender} />}
          {step === 6 && <WheelStep title="När fyller du år?" subtitle="Din ålder hjälper oss anpassa din plan" unit="" value={birthYear} onChange={setBirthYear} min={1940} max={new Date().getFullYear() - 13} />}
          {step === 7 && <RulerStep title="Hur lång är du?" subtitle="Ungefär går jättebra" unit="cm" value={heightCm} onChange={setHeightCm} min={140} max={220} />}
          {step === 8 && <RulerStep title="Vad väger du?" subtitle="Ungefär går jättebra" unit="kg" step={0.5} value={weightKg} onChange={setWeightKg} min={40} max={180} />}
        </div>

        {/* Footer CTA */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            disabled={!canContinue() || saving}
            onClick={step === TOTAL_STEPS ? finish : next}
            className="relative w-full h-14 rounded-full text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_10px_40px_-10px_oklch(0.74_0.13_180/0.7)] active:scale-[0.99] transition overflow-hidden disabled:opacity-40"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20" />
            <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            {saving ? "Sparar…" : step === TOTAL_STEPS ? "Slutför & Starta FitFlow" : "Nästa"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== HEADERS & SHARED ====================== */

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2 pb-6 text-center max-w-md mx-auto">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-white/55 mt-2">{subtitle}</p>}
    </div>
  );
}

function OptionRow({
  active, onClick, emoji, label, multi = false,
}: { active: boolean; onClick: () => void; emoji?: string; label: string; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-200",
        "backdrop-blur-xl border ring-1",
        active
          ? "bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 border-primary/60 ring-primary/30 shadow-[0_0_30px_-8px_oklch(0.74_0.13_180/0.55)]"
          : "bg-white/[0.03] border-white/10 ring-white/[0.04] hover:bg-white/[0.05] hover:border-white/20",
      )}
    >
      {emoji && <span className="text-xl shrink-0">{emoji}</span>}
      <span className={cn("flex-1 text-[15px] font-semibold", active ? "text-white" : "text-white/85")}>{label}</span>
      <span className={cn(
        "h-6 w-6 rounded-full grid place-items-center shrink-0 transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]"
          : "border border-white/20",
      )}>
        {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

/* ====================== STEP 1 — Goal ====================== */
function StepGoal({ value, onChange }: { value: Goal; onChange: (v: Goal) => void }) {
  const opts: { v: Goal; img: string; label: string; sub: string }[] = [
    { v: "bygga",    img: goalMuscle,     label: "Bygga muskler",         sub: "Hypertrofi · 8–12 reps" },
    { v: "starkare", img: goalStrength,   label: "Bli starkare",          sub: "Styrka · 4–6 tunga reps" },
    { v: "ner",      img: goalWeightloss, label: "Gå ner i vikt",         sub: "Fettförbränning · hög volym" },
    { v: "kondition",img: goalCardio,     label: "Kondition",             sub: "Uthållighet & puls" },
    { v: "atletisk", img: goalAthletic,   label: "Atletisk & funktionell", sub: "Explosiv styrka" },
    { v: "halsa",    img: goalHealth,     label: "Allmän hälsa",          sub: "Rörlighet & välmående" },
  ];
  return (
    <>
      <StepHeader title="Vad är ditt mål?" subtitle="Vi bygger din plan runt det här" />
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 bg-white/[0.03]",
                active
                  ? "border-primary/70 ring-primary/40 shadow-[0_0_30px_-6px_oklch(0.74_0.13_180/0.6)]"
                  : "border-white/10 ring-white/[0.04] hover:border-white/25",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={o.img}
                  alt=""
                  loading="lazy"
                  width={768}
                  height={576}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-500",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                {active && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="px-3 pt-2 pb-3">
                <p className={cn("text-[14px] font-bold leading-tight", active ? "text-white" : "text-white/90")}>
                  {o.label}
                </p>
                <p className="text-[11px] text-white/55 mt-0.5">{o.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ====================== STEP 2 — Improvements ====================== */
function StepImprovements({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const opts: { img: string; label: string; sub: string }[] = [
    { img: improveLook,       label: "Se bättre ut",          sub: "Form & estetik" },
    { img: improveConfidence, label: "Mer självsäker",        sub: "Mental styrka" },
    { img: improveHealth,     label: "Bättre hälsa",          sub: "Långsiktigt välmående" },
    { img: improveEnergy,     label: "Mer energi",            sub: "Pigg hela dagen" },
    { img: improveStress,     label: "Minska stress",         sub: "Lugn & balans" },
    { img: improveImmune,     label: "Starkare immunförsvar", sub: "Färre förkylningar" },
    { img: improveFocus,      label: "Fokus & klarhet",       sub: "Skärpt sinne" },
    { img: improveDetox,      label: "Detox & nystart",       sub: "Ren omstart" },
  ];
  const toggle = (l: string) => onChange(value.includes(l) ? value.filter((x) => x !== l) : [...value, l]);
  return (
    <>
      <StepHeader title="Vad vill du förbättra?" subtitle="Välj allt som passar" />
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {opts.map((o) => {
          const active = value.includes(o.label);
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => toggle(o.label)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 bg-white/[0.03]",
                active
                  ? "border-primary/70 ring-primary/40 shadow-[0_0_30px_-6px_oklch(0.74_0.13_180/0.6)]"
                  : "border-white/10 ring-white/[0.04] hover:border-white/25",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={o.img}
                  alt=""
                  loading="lazy"
                  width={768}
                  height={576}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-500",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                {active && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="px-3 pt-2 pb-3">
                <p className={cn("text-[14px] font-bold leading-tight", active ? "text-white" : "text-white/90")}>
                  {o.label}
                </p>
                <p className="text-[11px] text-white/55 mt-0.5">{o.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ====================== STEP 3 — Obstacles ====================== */
function StepObstacles({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const opts: { img: string; label: string; sub: string }[] = [
    { img: obstacleSugar,    label: "Sötsug",            sub: "Socker & snacks" },
    { img: obstacleRules,    label: "För många regler",  sub: "Komplicerat" },
    { img: obstacleNight,    label: "Kvällssnacks",      sub: "Sena cravings" },
    { img: obstacleSchedule, label: "Fullt schema",      sub: "För lite tid" },
    { img: obstacleJunk,     label: "Ohälsosamma vanor", sub: "Snabbmat & junk" },
    { img: obstacleSupport,  label: "Brist på stöd",     sub: "Saknar pepp" },
    { img: obstacleOther,    label: "Något annat",       sub: "Eget hinder" },
  ];
  const toggle = (l: string) => onChange(value.includes(l) ? value.filter((x) => x !== l) : [...value, l]);
  return (
    <>
      <StepHeader title="Vad brukar stå i vägen?" subtitle="Vi hjälper dig runt det" />
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {opts.map((o) => {
          const active = value.includes(o.label);
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => toggle(o.label)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 bg-white/[0.03]",
                active
                  ? "border-primary/70 ring-primary/40 shadow-[0_0_30px_-6px_oklch(0.74_0.13_180/0.6)]"
                  : "border-white/10 ring-white/[0.04] hover:border-white/25",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={o.img}
                  alt=""
                  loading="lazy"
                  width={768}
                  height={576}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-500",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                {active && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="px-3 pt-2 pb-3">
                <p className={cn("text-[14px] font-bold leading-tight", active ? "text-white" : "text-white/90")}>
                  {o.label}
                </p>
                <p className="text-[11px] text-white/55 mt-0.5">{o.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ====================== STEP 4 — Experience ====================== */
function StepExperience({ value, onChange }: { value: Experience; onChange: (v: Experience) => void }) {
  const opts: { v: Experience; img: string; label: string; sub: string }[] = [
    { v: "slutade",     img: expTried,  label: "Testat tidigare", sub: "Men slutade efter ett tag" },
    { v: "fortfarande", img: expActive, label: "Ja, gör det än",  sub: "Spårar mat regelbundet" },
    { v: "aldrig",      img: expNew,    label: "Nej, aldrig",     sub: "Helt nytt för mig" },
  ];
  return (
    <>
      <StepHeader title="Har du spårat kalorier tidigare?" subtitle="Vi anpassar upplevelsen efter din vana" />
      <div className="space-y-3 max-w-md mx-auto">
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 flex items-stretch bg-white/[0.03]",
                active
                  ? "border-primary/70 ring-primary/40 shadow-[0_0_30px_-6px_oklch(0.74_0.13_180/0.6)]"
                  : "border-white/10 ring-white/[0.04] hover:border-white/25",
              )}
            >
              <div className="relative w-28 shrink-0 overflow-hidden">
                <img
                  src={o.img}
                  alt=""
                  loading="lazy"
                  width={448}
                  height={448}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/30 to-background" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[15px] font-bold leading-tight", active ? "text-white" : "text-white/90")}>
                    {o.label}
                  </p>
                  <p className="text-[12px] text-white/55 mt-0.5">{o.sub}</p>
                </div>
                <span className={cn(
                  "h-6 w-6 rounded-full grid place-items-center shrink-0 transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]"
                    : "border border-white/25 bg-white/[0.04]",
                )}>
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ====================== STEP 5 — Gender ====================== */
function StepGender({ value, onChange }: { value: Gender; onChange: (v: Gender) => void }) {
  const main: { v: Gender; img: string; label: string; sub: string }[] = [
    { v: "man",    img: genderMan,   label: "Man",    sub: "Manlig metabolism" },
    { v: "kvinna", img: genderWoman, label: "Kvinna", sub: "Kvinnlig metabolism" },
  ];
  const neutralActive = value === "annat";
  return (
    <>
      <StepHeader title="Välj ditt kön" subtitle="Det hjälper oss uppskatta ditt kaloribehov mer exakt" />
      <div className="max-w-md mx-auto space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {main.map((o) => {
            const active = value === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => onChange(o.v)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 bg-white/[0.03]",
                  active
                    ? "border-primary/70 ring-primary/40 shadow-[0_0_30px_-6px_oklch(0.74_0.13_180/0.6)]"
                    : "border-white/10 ring-white/[0.04] hover:border-white/25",
                )}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <img
                    src={o.img}
                    alt=""
                    loading="lazy"
                    width={768}
                    height={960}
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-500",
                      active ? "scale-105" : "group-hover:scale-105",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  {active && (
                    <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2">
                    <p className={cn("text-[15px] font-bold leading-tight", active ? "text-white" : "text-white/95")}>
                      {o.label}
                    </p>
                    <p className="text-[11px] text-white/60 mt-0.5">{o.sub}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onChange("annat")}
          className={cn(
            "w-full relative overflow-hidden rounded-2xl text-left border ring-1 transition-all duration-200 p-3.5 flex items-center gap-3",
            neutralActive
              ? "bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 border-primary/60 ring-primary/30 shadow-[0_0_30px_-8px_oklch(0.74_0.13_180/0.55)]"
              : "bg-white/[0.03] border-white/10 ring-white/[0.04] hover:bg-white/[0.05] hover:border-white/20",
          )}
        >
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-white/[0.06] border border-white/10 text-lg shrink-0">
            🤐
          </div>
          <span className={cn("flex-1 text-[14px] font-semibold", neutralActive ? "text-white" : "text-white/85")}>
            Föredrar att inte svara
          </span>
          <span className={cn(
            "h-6 w-6 rounded-full grid place-items-center shrink-0 transition",
            neutralActive
              ? "bg-primary text-primary-foreground shadow-[0_0_14px_oklch(0.74_0.13_180/0.7)]"
              : "border border-white/25 bg-white/[0.04]",
          )}>
            {neutralActive && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        </button>
      </div>
    </>
  );
}

/* ====================== RULER PICKER (matches Kostplan) ====================== */
function RulerStep({
  title, subtitle, unit, min, max, step = 1, value, onChange,
}: { title: string; subtitle?: string; unit: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  const ticks = useMemo(() => {
    const arr: { v: number; major: boolean }[] = [];
    for (let v = min; v <= max; v += step) arr.push({ v, major: Math.round(v) % 5 === 0 });
    return arr;
  }, [min, max, step]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  const commit = () => {
    const n = Number(draft.replace(",", "."));
    if (!isNaN(n)) {
      const clamped = Math.min(max, Math.max(min, n));
      const snapped = Math.round(clamped / step) * step;
      onChange(Number(snapped.toFixed(2)));
    }
    setEditing(false);
  };
  return (
    <>
      <StepHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center pt-4">
        {/* Yellow measuring-tape strip */}
        <div
          className="relative w-full max-w-xl h-10 rounded-xl overflow-hidden ring-1 ring-primary/40 shadow-[0_8px_24px_-8px_oklch(0.74_0.13_180/0.5)]"
          style={{ background: "linear-gradient(180deg,oklch(0.88_0.1_180)_0%,oklch(0.74_0.13_180)_60%,oklch(0.5_0.13_180)_100%)" }}
        >
          <div className="absolute inset-0 flex items-end">
            {Array.from({ length: 41 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <span className={cn("w-px bg-zinc-900/70", i % 5 === 0 ? "h-5" : "h-3")} />
              </div>
            ))}
          </div>
          <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-zinc-900/40" />
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-zinc-900/40" />
        </div>

        {/* Neon glass display */}
        <div className="relative mt-6 rounded-3xl px-8 py-5 bg-gradient-to-b from-zinc-900/80 to-black/80 ring-1 ring-white/10 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_20px_50px_-20px_rgba(0,0,0,0.7)]">
          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-teal-400/20" />
          {editing ? (
            <div className="flex items-baseline">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step={step}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                className="text-6xl font-extrabold tabular-nums bg-transparent border-b border-teal-400 outline-none text-center w-56 text-teal-300"
              />
              <span className="text-base align-top text-teal-300/70 ml-1">{unit}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setDraft(String(value)); setEditing(true); }}
              className="text-6xl font-extrabold tabular-nums text-teal-300 drop-shadow-[0_0_18px_rgba(94,234,212,0.6)] hover:opacity-80 transition"
              title="Tryck för att skriva in exakt värde"
            >
              {value}
              <span className="text-base align-top text-teal-300/70 ml-1">{unit}</span>
            </button>
          )}
        </div>

        {/* Fine-tune +/- */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
            className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-xl active:scale-95 hover:bg-white/10"
          >−</button>
          <div className="px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm tabular-nums text-white/80">Finjustera</div>
          <button
            onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
            className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-xl active:scale-95 hover:bg-white/10"
          >+</button>
        </div>

        <div className="relative w-full max-w-2xl mt-8">
          <div className="flex items-end h-10 overflow-hidden mb-2">
            {ticks.map((t) => (
              <div key={t.v} className="flex-1 flex flex-col items-center">
                {t.major && <span className="text-[10px] text-white/40">{t.v}</span>}
                <span className={cn("w-px bg-white/30", t.major ? "h-4" : "h-2")} />
              </div>
            ))}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-teal-400"
          />
        </div>
      </div>
    </>
  );
}

/* ====================== WHEEL PICKER (iOS-style) ====================== */
function WheelStep({
  title, subtitle, value, onChange, min, max, unit,
}: { title: string; subtitle?: string; value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  return (
    <>
      <StepHeader title={title} subtitle={subtitle} />
      <div className="max-w-md mx-auto">
        <Wheel value={value} onChange={onChange} min={min} max={max} unit={unit} />
      </div>
    </>
  );
}

function Wheel({
  value, onChange, min, max, unit,
}: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  const ITEM_H = 56;
  const VISIBLE = 5;
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }, [min, max]);
  const idx = items.indexOf(value);

  // Sync external value → scroll
  useEffect(() => {
    const el = ref.current;
    if (!el || idx < 0) return;
    el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  }, [idx]);

  const onScroll = () => {
    if (editing) return;
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    const next = items[Math.max(0, Math.min(items.length - 1, i))];
    if (next !== value) onChange(next);
  };

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
    setEditing(false);
  };

  return (
    <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
      {/* center highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 h-14 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/15 to-accent/15 border border-primary/40 shadow-[0_0_30px_-8px_oklch(0.74_0.13_180/0.6),inset_0_0_20px_oklch(0.74_0.13_180/0.15)]"
      />
      {/* fade masks */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent z-10" />
      {/* unit */}
      {unit && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/50 z-20">
          {unit}
        </span>
      )}
      {/* Inline edit overlay */}
      {editing && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-14 z-30 flex items-center justify-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-40 bg-transparent text-center text-white text-4xl font-extrabold tabular-nums tracking-tight outline-none border-b-2 border-primary/70"
          />
        </div>
      )}
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none", paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}
      >
        {items.map((n) => {
          const active = n === value;
          const dist = Math.abs(n - value);
          return (
            <div
              key={n}
              className="snap-center flex items-center justify-center"
              style={{
                height: ITEM_H,
                opacity: active ? 1 : Math.max(0.18, 0.7 - dist * 0.18),
                transform: `scale(${active ? 1.15 : 1 - Math.min(0.18, dist * 0.06)})`,
                transition: "opacity 200ms, transform 200ms",
              }}
            >
              {active ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className={cn(
                    "tabular-nums font-extrabold tracking-tight text-white text-4xl",
                    editing && "opacity-0",
                  )}
                  aria-label="Skriv värde"
                >
                  {n}
                </button>
              ) : (
                <span className="tabular-nums font-extrabold tracking-tight text-white/55 text-2xl">
                  {n}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Helper hint */}
      <p className="absolute inset-x-0 -bottom-6 text-center text-[11px] text-white/40 z-20">
        Tryck på siffran för att skriva
      </p>
    </div>
  );
}
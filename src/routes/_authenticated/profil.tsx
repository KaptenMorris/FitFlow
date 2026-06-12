import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Mail, Award, KeyRound, Apple, Trophy, Sparkles, Heart, BookOpen, ChevronRight, ChevronDown, LogOut, Users, Crown, ShieldCheck, Eye, EyeOff, Dumbbell, TrendingDown, Zap, Flame, Sun, Moon, Sunset, Check, Pencil, Lock, Cake, Ruler, Scale, Target, MessageCircle, AlertTriangle, Watch } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
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
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profil")({ component: ProfilPage });

type Profile = {
  display_name: string | null;
  created_at: string;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  fitness_goal: string | null;
  training_time: string | null;
  motivation: string | null;
  limitations: string | null;
};
type Session = { completed_at: string; calories: number | null; volume_kg: number | null; duration_min: number | null };
type DietPlan = { goals: string[]; target_date: string | null; current_weight_kg: number | null; target_weight_kg: number | null };

const GOAL_LABEL: Record<string, string> = {
  build_muscle: "Bygga muskler", lose_weight: "Gå ner i vikt", lean_recomp: "Lean recomp",
  get_stronger: "Bli starkare", general_fitness: "Allmän fitness",
};
const TIME_LABEL: Record<string, string> = { morning: "Morgon", afternoon: "Eftermiddag", evening: "Kväll" };

function ProfilPage() {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [openPwd, setOpenPwd] = useState(false);
  const [openMe, setOpenMe] = useState(true);
  const { isAdmin, tier } = useSubscription();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteAccountFn = useServerFn(deleteMyAccount);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setAuthUser({ id: u.id, email: u.email || "" });
      const [{ data: p }, { data: s }, { data: d }] = await Promise.all([
        supabase.from("profiles").select("display_name,created_at,birth_date,height_cm,current_weight_kg,goal_weight_kg,fitness_goal,training_time,motivation,limitations").eq("id", u.id).maybeSingle(),
        supabase.from("workout_sessions").select("completed_at,calories,volume_kg,duration_min").eq("user_id", u.id).order("completed_at", { ascending: false }).limit(500),
        supabase.from("diet_plans").select("goals,target_date,current_weight_kg,target_weight_kg").eq("user_id", u.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (p) setProfile(p as Profile);
      if (s) setSessions(s as Session[]);
      if (d) setDiet(d as DietPlan);
    })();
  }, []);

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const displayName = profile?.display_name || authUser?.email.split("@")[0] || "Användare";

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountFn();
      await supabase.auth.signOut();
      toast.success("Ditt konto är borttaget");
      navigate({ to: "/login", replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte ta bort kontot");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="text-center py-4 border-b border-border"><h1 className="font-semibold">Profil</h1></header>
      <div className="px-4 space-y-3 pt-4">
        <p className="text-xs text-muted-foreground">Dina kontoinställningar</p>

        <Card>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-success/20 flex items-center justify-center"><User className="h-5 w-5 text-success" /></div>
            <div><p className="font-bold">{displayName}</p><p className="text-xs text-success">{isAdmin ? "Administratör" : `Medlem · ${tier ?? "free"}`}</p></div>
          </div>
          <Field icon={<Mail className="h-4 w-4 text-streak" />} label="E-post" value={authUser?.email || ""} />
          <Field icon={<Award className="h-4 w-4 text-warning" />} label="Medlem sedan" value={profile?.created_at ? formatDate(profile.created_at) : "—"} />
        </Card>

        <PasswordCard open={openPwd} setOpen={setOpenPwd} />

        <RowCard icon={<Apple className="h-4 w-4 text-accent" />} title="Aktivt kostschema" subtitle={dietSubtitle(diet)} onClick={() => navigate({ to: "/kostschema" })} />

        <Link to="/community" className="block">
          <RowCard icon={<Users className="h-4 w-4 text-accent" />} title="Community" subtitle="Flöde, humör och inlägg" className="bg-gradient-to-r from-accent/10 to-card border-accent/30" />
        </Link>

        <Link to="/pricing" className="block">
          <RowCard icon={<Crown className="h-4 w-4 text-warning" />} title="Prenumeration" subtitle="Hantera din FitFlow-plan" className="bg-gradient-to-r from-warning/15 to-card border-warning/40" />
        </Link>

        {isAdmin && (
          <Link to="/admin" className="block">
            <RowCard icon={<ShieldCheck className="h-4 w-4 text-warning" />} title="Admin Dashboard" subtitle="Hantera användare, roller och prenumerationer" className="bg-gradient-to-r from-warning/20 to-card border-warning/50" />
          </Link>
        )}

        <Card className="bg-gradient-to-br from-warning/10 to-card border-warning/30">
          <p className="flex items-center gap-1 text-sm"><Trophy className="h-4 w-4 text-warning" />Dina prestationspoäng</p>
          <p className="text-4xl font-bold text-warning mt-1">{stats.points}</p>
          <p className="text-xs text-muted-foreground">totala poäng</p>
          {stats.currentStreak > 0 && (
            <span className="absolute right-4 top-4 text-xs px-2 py-1 rounded-full bg-streak/20 text-streak border border-streak/40">🔥 {stats.currentStreak} dagars streak!</span>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg border border-border bg-card/50 p-2"><p className="text-xs text-muted-foreground">🔥 Nuvarande streak</p><p className="text-lg font-bold">{stats.currentStreak} <span className="text-xs text-muted-foreground font-normal">dagar</span></p></div>
            <div className="rounded-lg border border-border bg-card/50 p-2"><p className="text-xs text-muted-foreground">⭐ Längsta streak</p><p className="text-lg font-bold">{stats.longestStreak} <span className="text-xs text-muted-foreground font-normal">dagar</span></p></div>
          </div>
        </Card>

        <Link to="/achievements" className="block">
          <RowCard icon={<Trophy className="h-4 w-4 text-streak" />} title="Achievements & Nivåer" subtitle="Se din resa, märken och belöningar" className="bg-gradient-to-r from-streak/10 to-card border-streak/30" />
        </Link>

        <PersonalityCard open={openMe} setOpen={setOpenMe} profile={profile} displayName={displayName} userId={authUser?.id} onSaved={(p) => setProfile((prev) => prev ? { ...prev, ...p } : prev)} />

        <Link to="/progress" className="block">
          <RowCard icon={<Heart className="h-4 w-4 text-destructive" />} title="Hälsodata & Statistik" subtitle="Vikt, volym, kalorier och pass" />
        </Link>
        <Link to="/halsa" className="block">
          <RowCard icon={<Watch className="h-4 w-4 text-primary" />} title="Smartklocka & Health Connect" subtitle="Synka steg, puls, kalorier och sömn" />
        </Link>
        <Link to="/ovningar" className="block">
          <RowCard icon={<BookOpen className="h-4 w-4 text-success" />} title="Träningslogg" subtitle={`${sessions.length} avklarade pass`} />
        </Link>

        <Card>
          <p className="font-semibold mb-1">Om ditt konto</p>
          <p className="text-xs text-muted-foreground">Alla dina träningsscheman, genomförda pass och inställningar sparas säkert på ditt personliga konto. Du kan logga in från vilken enhet som helst och fortsätta där du slutade.</p>
        </Card>

        <Button variant="outline" onClick={signOut} className="w-full"><LogOut className="h-4 w-4" />Logga ut</Button>

        <Button
          variant="outline"
          onClick={() => { setConfirmText(""); setDeleteOpen(true); }}
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />Ta bort konto
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Ta bort ditt konto?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Detta tar permanent bort ditt konto, alla scheman, pass, kostplaner, viktloggar och övrig data. Detta går inte att ångra.
              <br /><br />
              Skriv <span className="font-semibold text-foreground">RADERA</span> för att bekräfta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RADERA"
            className="text-center"
          />
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-full mt-0" disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || confirmText.trim().toUpperCase() !== "RADERA"}
              onClick={(e) => { e.preventDefault(); deleteAccount(); }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Tar bort…" : "Ta bort konto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PasswordCard({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [cnf, setCnf] = useState("");
  const [sCur, setSCur] = useState(false); const [sNw, setSNw] = useState(false); const [sCnf, setSCnf] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (nw.length < 6) return toast.error("Nytt lösenord måste vara minst 6 tecken");
    if (nw !== cnf) return toast.error("Lösenorden matchar inte");
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email; if (!email) throw new Error("Ingen användare");
      const { error: vErr } = await supabase.auth.signInWithPassword({ email, password: cur });
      if (vErr) { toast.error("Nuvarande lösenord stämmer inte"); return; }
      const { error } = await supabase.auth.updateUser({ password: nw });
      if (error) throw error;
      toast.success("Lösenordet är uppdaterat");
      setCur(""); setNw(""); setCnf(""); setOpen(false);
    } catch (e: any) { toast.error(e.message || "Kunde inte uppdatera lösenord"); }
    finally { setBusy(false); }
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className="w-full text-left"><RowCard icon={<KeyRound className="h-4 w-4 text-muted-foreground" />} title="Byt lösenord" subtitle="Uppdatera ditt kontolösenord" /></button>;
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-success" />Byt lösenord</p>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Avbryt</button>
      </div>
      <PwdInput label="Nuvarande lösenord" placeholder="Ange nuvarande lösenord" value={cur} onChange={setCur} show={sCur} setShow={setSCur} />
      <PwdInput label="Nytt lösenord" placeholder="Minst 6 tecken" value={nw} onChange={setNw} show={sNw} setShow={setSNw} />
      <PwdInput label="Bekräfta nytt lösenord" placeholder="Upprepa nytt lösenord" value={cnf} onChange={setCnf} show={sCnf} setShow={setSCnf} />
      <Button onClick={submit} disabled={busy} className="w-full rounded-full bg-success text-success-foreground hover:bg-success/90 font-semibold">{busy ? "Sparar…" : "Spara nytt lösenord"}</Button>
    </Card>
  );
}
function PwdInput({ label, placeholder, value, onChange, show, setShow }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        <Input type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const GOALS: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "build_muscle", label: "Bygga muskler", icon: <Dumbbell className="h-4 w-4" />, color: "oklch(0.75 0.18 140)" },
  { id: "lose_weight", label: "Gå ner i vikt", icon: <TrendingDown className="h-4 w-4" />, color: "oklch(0.7 0.18 35)" },
  { id: "lean_recomp", label: "Lean recomp", icon: <Zap className="h-4 w-4" />, color: "oklch(0.75 0.18 190)" },
  { id: "get_stronger", label: "Bli starkare", icon: <Flame className="h-4 w-4" />, color: "oklch(0.7 0.18 25)" },
  { id: "general_fitness", label: "Allmän fitness", icon: <Heart className="h-4 w-4" />, color: "oklch(0.7 0.18 350)" },
];
const TIMES: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "morning", label: "Morgon", icon: <Sun className="h-4 w-4 text-warning" /> },
  { id: "afternoon", label: "Eftermiddag", icon: <Sunset className="h-4 w-4 text-accent" /> },
  { id: "evening", label: "Kväll", icon: <Moon className="h-4 w-4 text-primary" /> },
];

function PersonalityCard({ open, setOpen, profile, displayName, userId, onSaved }: { open: boolean; setOpen: (v: boolean) => void; profile: Profile | null; displayName: string; userId: string | undefined; onSaved: (p: Partial<Profile>) => void }) {
  const complete = profile && profile.height_cm && profile.current_weight_kg && profile.fitness_goal;
  const initBirth = profile?.birth_date ? new Date(profile.birth_date) : null;
  const [name, setName] = useState(displayName);
  const [year, setYear] = useState<string>(initBirth ? String(initBirth.getFullYear()) : "");
  const [month, setMonth] = useState<number | null>(initBirth ? initBirth.getMonth() : null);
  const [day, setDay] = useState<string>(initBirth ? String(initBirth.getDate()) : "");
  const [height, setHeight] = useState<string>(profile?.height_cm ? String(profile.height_cm) : "");
  const [weight, setWeight] = useState<string>(profile?.current_weight_kg ? String(profile.current_weight_kg) : "");
  const [goalW, setGoalW] = useState<string>(profile?.goal_weight_kg ? String(profile.goal_weight_kg) : "");
  const [goal, setGoal] = useState<string | null>(profile?.fitness_goal || null);
  const [time, setTime] = useState<string | null>(profile?.training_time || null);
  const [motivation, setMotivation] = useState<string>(profile?.motivation || "");
  const [limitations, setLimitations] = useState<string>(profile?.limitations || "");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(displayName);
    const b = profile.birth_date ? new Date(profile.birth_date) : null;
    setYear(b ? String(b.getFullYear()) : "");
    setMonth(b ? b.getMonth() : null);
    setDay(b ? String(b.getDate()) : "");
    setHeight(profile.height_cm ? String(profile.height_cm) : "");
    setWeight(profile.current_weight_kg ? String(profile.current_weight_kg) : "");
    setGoalW(profile.goal_weight_kg ? String(profile.goal_weight_kg) : "");
    setGoal(profile.fitness_goal || null);
    setTime(profile.training_time || null);
    setMotivation(profile.motivation || "");
    setLimitations(profile.limitations || "");
  }, [profile, displayName]);

  const age = useMemo(() => {
    const y = parseInt(year), m = month, d = parseInt(day);
    if (!y || m === null || !d) return null;
    const bd = new Date(y, m, d);
    const a = Math.floor((Date.now() - bd.getTime()) / 31557600000);
    return a > 0 && a < 120 ? a : null;
  }, [year, month, day]);

  const save = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const y = parseInt(year), m = month, d = parseInt(day);
      const birth_date = y && m !== null && d ? new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10) : null;
      const updates: Partial<Profile> = {
        display_name: name.trim() || null,
        birth_date,
        height_cm: height ? Number(height.replace(",", ".")) : null,
        current_weight_kg: weight ? Number(weight.replace(",", ".")) : null,
        goal_weight_kg: goalW ? Number(goalW.replace(",", ".")) : null,
        fitness_goal: goal,
        training_time: time,
        motivation: motivation.trim() || null,
        limitations: limitations.trim() || null,
      };
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
      onSaved(updates);
      toast.success("Profilen sparad – FitFlow kan nu skapa bättre scheman åt dig");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Kunde inte spara");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-success" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Min Personlighet</p>
          <p className="text-xs text-muted-foreground truncate">Hej {displayName} 👋 — {complete ? "profilen är komplett" : "fyll i för bättre scheman"}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 pt-2">
          {!editing ? (
            <ReadOnlyPersonality
              name={name}
              age={age}
              height={height}
              weight={weight}
              goalW={goalW}
              goal={goal}
              time={time}
              motivation={motivation}
              limitations={limitations}
              onEdit={() => setEditing(true)}
            />
          ) : (
        <fieldset className="space-y-4 group" aria-busy={busy}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">Ju mer du berättar, desto mer personliga blir träningsrekommendationer, viktförslag och AI-råd. Inget är obligatoriskt.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrap label="Vad kallas du?"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Förnamn" /></FieldWrap>
            <FieldWrap label="Födelseår"><Input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="ÅÅÅÅ" /></FieldWrap>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Födelsemånad</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {MONTHS.map((m, i) => (
                <button key={m} type="button" onClick={() => setMonth(i)} className={`h-9 rounded-lg border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${month === i ? "border-success bg-success/15 text-success" : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <FieldWrap label="Födelsedag"><Input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="DD" /></FieldWrap>
            {age && <p className="text-sm text-success font-semibold pb-2.5">≈ {age} år</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrap label="Längd (cm)"><Input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="t.ex. 180" /></FieldWrap>
            <FieldWrap label="Nuv. vikt (kg)"><Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="t.ex. 75" /></FieldWrap>
          </div>
          <FieldWrap label="Målvikt (kg)"><Input inputMode="decimal" value={goalW} onChange={(e) => setGoalW(e.target.value)} placeholder="t.ex. 70" /></FieldWrap>

          <div>
            <label className="text-xs text-muted-foreground">Primärt mål</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {GOALS.map((g) => {
                const active = goal === g.id;
                return (
                  <button key={g.id} type="button" onClick={() => setGoal(g.id)} className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${active ? "border-success bg-success/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                    <span style={{ color: g.color }}>{g.icon}</span>
                    <span className="text-xs font-semibold">{g.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-success ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Föredrar att träna</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TIMES.map((t) => {
                const active = time === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTime(t.id)} className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 transition disabled:cursor-not-allowed disabled:opacity-70 ${active ? "border-success bg-success/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                    {t.icon}
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <FieldWrap label="Vad motiverar dig att träna?"><Input value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="t.ex. mer energi, hälsa, prestation…" /></FieldWrap>
          <FieldWrap label="Skador eller begränsningar? (valfritt)">
            <textarea value={limitations} onChange={(e) => setLimitations(e.target.value)} placeholder="t.ex. Knäproblem – undvik djupa squats" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </FieldWrap>

          <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" disabled={false} onClick={() => { setEditing(false); }} className="flex-1 !pointer-events-auto !opacity-100">Avbryt</Button>
                <Button type="button" onClick={save} disabled={busy} className="flex-[2] rounded-md bg-success text-success-foreground hover:bg-success/90 font-semibold !pointer-events-auto !opacity-100"><Check className="h-4 w-4" />{busy ? "Sparar…" : "Spara profil"}</Button>
          </div>
        </fieldset>
          )}
        </div>
      )}
    </Card>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-secondary/50 to-secondary/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span style={accent ? { color: accent } : undefined}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold text-foreground truncate">{value}</div>
    </div>
  );
}

function ReadOnlyPersonality({ name, age, height, weight, goalW, goal, time, motivation, limitations, onEdit }: {
  name: string; age: number | null; height: string; weight: string; goalW: string;
  goal: string | null; time: string | null; motivation: string; limitations: string; onEdit: () => void;
}) {
  const goalMeta = GOALS.find((g) => g.id === goal);
  const timeMeta = TIMES.find((t) => t.id === time);
  const dash = <span className="text-muted-foreground/60">–</span>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon={<User className="h-3.5 w-3.5" />} label="Kallas" value={name || dash} accent="oklch(0.75 0.18 190)" />
        <StatTile icon={<Cake className="h-3.5 w-3.5" />} label="Ålder" value={age ? `${age} år` : dash} accent="oklch(0.75 0.18 320)" />
        <StatTile icon={<Ruler className="h-3.5 w-3.5" />} label="Längd" value={height ? `${height} cm` : dash} accent="oklch(0.75 0.18 140)" />
        <StatTile icon={<Scale className="h-3.5 w-3.5" />} label="Vikt" value={weight ? `${weight} kg` : dash} accent="oklch(0.75 0.18 35)" />
        <StatTile icon={<Target className="h-3.5 w-3.5" />} label="Målvikt" value={goalW ? `${goalW} kg` : dash} accent="oklch(0.75 0.18 260)" />
        <StatTile
          icon={goalMeta?.icon ?? <Sparkles className="h-3.5 w-3.5" />}
          label="Mål"
          value={goalMeta?.label ?? dash}
          accent={goalMeta?.color}
        />
        {timeMeta && (
          <StatTile icon={timeMeta.icon} label="Tränar" value={timeMeta.label} />
        )}
      </div>

      {motivation && (
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            <span>Motivation</span>
          </div>
          <p className="mt-1 text-sm italic text-foreground/90">"{motivation}"</p>
        </div>
      )}

      {limitations && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Begränsningar</span>
          </div>
          <p className="mt-1 text-sm text-foreground/90 leading-relaxed">{limitations}</p>
        </div>
      )}

      <Button type="button" variant="outline" onClick={onEdit} className="w-full border-dashed">
        <Pencil className="h-4 w-4" />Redigera profil
      </Button>
    </div>
  );
}
function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function computeStats(sessions: Session[]) {
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
  return { points, currentStreak: current, longestStreak: longest };
}
function dietSubtitle(d: DietPlan | null) {
  if (!d) return "Inget kostschema aktivt – tryck för att skapa";
  const goal = d.goals[0] ? (GOAL_LABEL[d.goals[0]] || d.goals[0]) : "Plan";
  const w = d.current_weight_kg && d.target_weight_kg ? ` · ${d.current_weight_kg} → ${d.target_weight_kg} kg` : "";
  return `${goal}${w}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative rounded-2xl border border-border bg-card p-4 space-y-3 ${className}`}>{children}</div>;
}
function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="h-8 w-8 rounded-md bg-card flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium truncate">{value}</p></div>
    </div>
  );
}
function RowCard({ icon, title, subtitle, rightIcon, className = "", onClick }: { icon: React.ReactNode; title: string; subtitle?: string; rightIcon?: React.ReactNode; className?: string; onClick?: () => void }) {
  const inner = (
    <div className={`rounded-2xl border border-border bg-card p-3 flex items-center gap-3 ${className}`}>
      <div className="h-8 w-8 rounded-md bg-secondary/60 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{title}</p>{subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}</div>
      {rightIcon || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
  if (onClick) return <button onClick={onClick} className="w-full text-left">{inner}</button>;
  return inner;
}
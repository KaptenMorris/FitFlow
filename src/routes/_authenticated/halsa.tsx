import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Activity, Heart, Flame, Moon, Watch, Smartphone, RefreshCw, PlusCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getHealthCapability,
  isoDate,
  readTodayFromDevice,
  requestHealthPermissions,
  saveHealthLog,
  useHealthLogs,
  type HealthLog,
} from "@/lib/health";

export const Route = createFileRoute("/_authenticated/halsa")({ component: HalsaPage });

function HalsaPage() {
  const { logs, loading, reload } = useHealthLogs(7);
  const [syncing, setSyncing] = useState(false);
  const cap = useMemo(() => (typeof window === "undefined" ? "unavailable_web" : getHealthCapability()), []);

  const today = logs.find((l) => l.log_date === isoDate()) ?? null;

  const stepsMax = Math.max(10000, ...logs.map((l) => l.steps ?? 0));

  async function handleSync() {
    setSyncing(true);
    try {
      const ok = await requestHealthPermissions();
      if (!ok) {
        toast.error("Behörighet nekades eller saknas");
        return;
      }
      const data = await readTodayFromDevice();
      if (!data) {
        toast.error("Kunde inte läsa data från klockan");
        return;
      }
      await saveHealthLog({ log_date: isoDate(), source: "health_connect", ...data });
      toast.success("Synkat från Health Connect");
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Synk misslyckades");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-10 space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/profil" className="p-2 -ml-2 rounded-full hover:bg-card"><ChevronLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Hälsa & smartklocka</h1>
          <p className="text-xs text-muted-foreground">Steg, puls, kalorier och sömn</p>
        </div>
      </div>

      <ConnectCard capability={cap} syncing={syncing} onSync={handleSync} />

      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Idag</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Activity className="h-4 w-4" />} label="Steg" value={today?.steps?.toLocaleString("sv-SE") ?? "—"} accent="text-primary" />
          <StatCard icon={<Heart className="h-4 w-4" />} label="Vilopuls" value={today?.resting_hr_bpm ? `${today.resting_hr_bpm} bpm` : "—"} accent="text-destructive" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Aktiv kcal" value={today?.active_kcal?.toLocaleString("sv-SE") ?? "—"} accent="text-streak" />
          <StatCard icon={<Moon className="h-4 w-4" />} label="Sömn" value={today?.sleep_minutes ? `${Math.floor(today.sleep_minutes / 60)}h ${today.sleep_minutes % 60}m` : "—"} accent="text-warning" />
        </div>
      </section>

      <ManualEntry onSaved={reload} initial={today} />

      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Senaste 7 dagarna</p>
        <div className="rounded-2xl border border-border bg-card p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen data ännu. Synka från klockan eller fyll i manuellt.</p>
          ) : (
            <ul className="space-y-2">
              {[...logs].reverse().map((l) => (
                <li key={l.log_date} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{formatShortDate(l.log_date)}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((l.steps ?? 0) / stepsMax) * 100)}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-16 text-right">{l.steps?.toLocaleString("sv-SE") ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`flex items-center gap-1.5 text-xs ${accent}`}>{icon}<span className="text-muted-foreground">{label}</span></div>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function ConnectCard({ capability, syncing, onSync }: { capability: string; syncing: boolean; onSync: () => void }) {
  if (capability === "ready") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4">
        <div className="flex items-center gap-2 mb-1"><Watch className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Health Connect tillgängligt</span></div>
        <p className="text-xs text-muted-foreground mb-3">Synka steg, puls, kalorier och sömn från din smartklocka via Google Health Connect.</p>
        <Button onClick={onSync} disabled={syncing} className="w-full">
          {syncing ? <><RefreshCw className="h-4 w-4 animate-spin" />Synkar…</> : <><RefreshCw className="h-4 w-4" />Synka nu</>}
        </Button>
      </div>
    );
  }
  if (capability === "plugin_missing") {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <div className="flex items-center gap-2 mb-1"><Smartphone className="h-4 w-4 text-warning" /><span className="text-sm font-semibold">Plugin saknas i appen</span></div>
        <p className="text-xs text-muted-foreground">Den här Android-bygget saknar Health Connect-plugin. Lägg till <code className="px-1 rounded bg-card">capacitor-health-connect</code> och bygg om appen. Tills dess kan du fylla i manuellt.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1"><Smartphone className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-semibold">Öppna i mobilappen</span></div>
      <p className="text-xs text-muted-foreground">
        Smartklocka-synk kräver FitFlow-appen på din Android-telefon via Google Health Connect (kompatibel med Wear OS, Fitbit, Samsung Galaxy Watch m.fl.). I webbläsaren kan du fylla i din data manuellt nedan.
      </p>
    </div>
  );
}

function ManualEntry({ onSaved, initial }: { onSaved: () => void; initial: HealthLog | null }) {
  const [steps, setSteps] = useState<string>(initial?.steps?.toString() ?? "");
  const [hr, setHr] = useState<string>(initial?.resting_hr_bpm?.toString() ?? "");
  const [kcal, setKcal] = useState<string>(initial?.active_kcal?.toString() ?? "");
  const [sleepH, setSleepH] = useState<string>(initial?.sleep_minutes ? Math.floor(initial.sleep_minutes / 60).toString() : "");
  const [sleepM, setSleepM] = useState<string>(initial?.sleep_minutes ? (initial.sleep_minutes % 60).toString() : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const sleepMinutes = (Number(sleepH || 0) * 60) + Number(sleepM || 0);
      await saveHealthLog({
        log_date: isoDate(),
        source: initial?.source === "health_connect" ? "health_connect" : "manual",
        steps: steps ? Number(steps) : null,
        resting_hr_bpm: hr ? Number(hr) : null,
        active_kcal: kcal ? Number(kcal) : null,
        sleep_minutes: sleepMinutes || null,
      });
      toast.success("Sparat");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Logga manuellt för idag</p></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Steg"><Input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="0" /></Field>
        <Field label="Vilopuls (bpm)"><Input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="0" /></Field>
        <Field label="Aktiv kcal"><Input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="0" /></Field>
        <Field label="Sömn h / m">
          <div className="flex gap-1">
            <Input inputMode="numeric" value={sleepH} onChange={(e) => setSleepH(e.target.value)} placeholder="h" />
            <Input inputMode="numeric" value={sleepM} onChange={(e) => setSleepM(e.target.value)} placeholder="m" />
          </div>
        </Field>
      </div>
      <Button onClick={save} disabled={saving} variant="outline" className="w-full">
        {saving ? "Sparar…" : <><CheckCircle2 className="h-4 w-4" />Spara</>}
      </Button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric" });
}
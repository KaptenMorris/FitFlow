import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HealthLog = {
  log_date: string;
  steps: number | null;
  resting_hr_bpm: number | null;
  active_kcal: number | null;
  sleep_minutes: number | null;
  source: string;
};

/** Returns ISO date string YYYY-MM-DD in local time. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when running inside the Capacitor native shell (Android/iOS app). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/** Returns the Health Connect plugin if installed in the Capacitor app, else null. */
function getHealthConnectPlugin(): any | null {
  if (!isNativeApp()) return null;
  const cap = (window as any).Capacitor;
  return cap?.Plugins?.HealthConnect ?? null;
}

export type HealthCapability =
  | "unavailable_web"
  | "plugin_missing"
  | "ready";

export function getHealthCapability(): HealthCapability {
  if (!isNativeApp()) return "unavailable_web";
  if (!getHealthConnectPlugin()) return "plugin_missing";
  return "ready";
}

const READ_TYPES = ["Steps", "HeartRate", "ActiveCaloriesBurned", "SleepSession"];

/** Request Health Connect read permissions. No-op on web. */
export async function requestHealthPermissions(): Promise<boolean> {
  const plugin = getHealthConnectPlugin();
  if (!plugin) return false;
  try {
    await plugin.requestHealthPermissions({ read: READ_TYPES, write: [] });
    return true;
  } catch (e) {
    console.error("[health] permission error", e);
    return false;
  }
}

function sumRecords(records: any[] | undefined, key: string): number {
  if (!records?.length) return 0;
  return records.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);
}

/** Fetch today's totals from Health Connect (Android). Returns null when unavailable. */
export async function readTodayFromDevice(): Promise<Omit<HealthLog, "log_date" | "source"> | null> {
  const plugin = getHealthConnectPlugin();
  if (!plugin) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const timeRangeFilter = { type: "between", startTime: start.toISOString(), endTime: end.toISOString() };

  try {
    const [steps, hr, kcal, sleep] = await Promise.all([
      plugin.readRecords({ type: "Steps", timeRangeFilter }).catch(() => null),
      plugin.readRecords({ type: "HeartRate", timeRangeFilter }).catch(() => null),
      plugin.readRecords({ type: "ActiveCaloriesBurned", timeRangeFilter }).catch(() => null),
      plugin.readRecords({ type: "SleepSession", timeRangeFilter }).catch(() => null),
    ]);

    const stepCount = sumRecords(steps?.records, "count");
    const kcalTotal = sumRecords(kcal?.records, "energy")
      || sumRecords(kcal?.records, "energyKilocalories");

    // Heart rate: average resting if multiple samples
    let hrAvg: number | null = null;
    const hrRecords = hr?.records ?? [];
    if (hrRecords.length) {
      const samples = hrRecords.flatMap((r: any) => r?.samples ?? []);
      const bpms = samples.map((s: any) => Number(s?.beatsPerMinute)).filter((n: number) => Number.isFinite(n));
      if (bpms.length) hrAvg = Math.round(bpms.reduce((a: number, b: number) => a + b, 0) / bpms.length);
    }

    // Sleep minutes: sum (end - start)
    let sleepMin = 0;
    for (const r of sleep?.records ?? []) {
      if (r?.startTime && r?.endTime) {
        sleepMin += Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000);
      }
    }

    return {
      steps: stepCount || null,
      resting_hr_bpm: hrAvg,
      active_kcal: kcalTotal ? Math.round(kcalTotal) : null,
      sleep_minutes: sleepMin || null,
    };
  } catch (e) {
    console.error("[health] read error", e);
    return null;
  }
}

/** Upsert a health log row for the current user. */
export async function saveHealthLog(input: Partial<HealthLog> & { log_date: string; source?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Inte inloggad");
  const row = {
    user_id: u.user.id,
    log_date: input.log_date,
    steps: input.steps ?? null,
    resting_hr_bpm: input.resting_hr_bpm ?? null,
    active_kcal: input.active_kcal ?? null,
    sleep_minutes: input.sleep_minutes ?? null,
    source: input.source ?? "manual",
  };
  const { error } = await supabase.from("health_logs").upsert(row, { onConflict: "user_id,log_date" });
  if (error) throw error;
}

/** Hook: load the last N days of logs for the current user, newest first. */
export function useHealthLogs(days = 7) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLogs([]); setLoading(false); return; }
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const { data } = await supabase
      .from("health_logs")
      .select("log_date, steps, resting_hr_bpm, active_kcal, sleep_minutes, source")
      .eq("user_id", u.user.id)
      .gte("log_date", isoDate(from))
      .order("log_date", { ascending: false });
    setLogs((data ?? []) as HealthLog[]);
    setLoading(false);
  }, [days]);
  useEffect(() => { reload(); }, [reload]);
  return { logs, loading, reload };
}
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Legacy-värden (recept, pro_allt) accepteras för bakåtkompatibilitet men
// kartas om till de nya nivåerna i appen.
export type SubscriptionTier = "free" | "bas" | "standard" | "pro" | "recept" | "pro_allt";

export type PlanId = "bas" | "standard" | "pro";

export const TRIAL_DAYS = 7;

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // kr / month
  features: string[];
  highlight?: boolean;
  badge?: string;
  accent: string; // tailwind gradient classes
};

export const PLANS: Plan[] = [
  {
    id: "bas",
    name: "FitFlow Bas",
    tagline: "Kom igång",
    price: 59,
    features: [
      "Skapa och följ träningsscheman",
      "Logga pass och vikter",
      "Grundläggande statistik",
    ],
    accent: "from-primary/20 to-primary/5",
  },
  {
    id: "standard",
    name: "FitFlow Standard",
    tagline: "Mer av allt",
    price: 99,
    features: [
      "Allt i Bas",
      "Hela övningsdatabasen",
      "Avancerad progress­spårning",
      "Kostrekommendationer & recept",
    ],
    highlight: true,
    badge: "Populärast",
    accent: "from-accent/20 to-primary/10",
  },
  {
    id: "pro",
    name: "FitFlow Pro",
    tagline: "Allt FitFlow erbjuder",
    price: 149,
    features: [
      "Allt i Standard",
      "AI-coach & personlig anpassning",
      "Community & vänner",
      "Prioriterad support & tidig tillgång",
    ],
    accent: "from-warning/30 via-accent/20 to-primary/20",
  },
];

// Tier ranking — högre nummer = mer access
const TIER_RANK: Record<string, number> = {
  free: 0,
  bas: 1,
  recept: 2,    // legacy → behandlas som standard
  standard: 2,
  pro: 3,
  pro_allt: 3,  // legacy → behandlas som pro
};

function rank(tier: SubscriptionTier | null | undefined): number {
  return TIER_RANK[tier ?? "free"] ?? 0;
}

export function hasSchemaAccess(tier: SubscriptionTier | null | undefined, isAdmin = false): boolean {
  if (isAdmin) return true;
  return rank(tier) >= 1;
}
export function hasExercisesAccess(tier: SubscriptionTier | null | undefined, isAdmin = false): boolean {
  if (isAdmin) return true;
  return rank(tier) >= 2;
}
export function hasRecipesAccess(tier: SubscriptionTier | null | undefined, isAdmin = false): boolean {
  if (isAdmin) return true;
  return rank(tier) >= 2;
}
export function hasProAccess(tier: SubscriptionTier | null | undefined, isAdmin = false): boolean {
  if (isAdmin) return true;
  return rank(tier) >= 3;
}

export function tierLabel(tier: SubscriptionTier | null | undefined, isAdmin = false): string {
  if (isAdmin) return "Admin – Full tillgång";
  switch (tier) {
    case "bas": return "FitFlow Bas";
    case "standard": return "FitFlow Standard";
    case "recept": return "FitFlow Standard";
    case "pro": return "FitFlow Pro";
    case "pro_allt": return "FitFlow Pro";
    default: return "Gratisversion";
  }
}

// ---------- Trial-logik ----------

export function trialEndsAt(trialStartedAt: string | null | undefined): Date | null {
  if (!trialStartedAt) return null;
  const d = new Date(trialStartedAt);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

export function isTrialActive(trialStartedAt: string | null | undefined): boolean {
  const ends = trialEndsAt(trialStartedAt);
  return !!ends && ends.getTime() > Date.now();
}

export function trialDaysLeft(trialStartedAt: string | null | undefined): number {
  const ends = trialEndsAt(trialStartedAt);
  if (!ends) return 0;
  const ms = ends.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Effektiv tier under en aktiv trial = pro. */
export function effectiveTier(
  tier: SubscriptionTier | null | undefined,
  trialStartedAt: string | null | undefined,
): SubscriptionTier {
  if ((!tier || tier === "free") && isTrialActive(trialStartedAt)) return "pro";
  return tier ?? "free";
}

/** Har användaren en aktiv betald plan ELLER en pågående trial? */
export function hasActiveAccess(
  tier: SubscriptionTier | null | undefined,
  trialStartedAt: string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  if (tier && tier !== "free") return true;
  return isTrialActive(trialStartedAt);
}

export function useSubscription() {
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) { setTier("free"); setIsAdmin(false); setLoading(false); } return; }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("subscription_tier, trial_started_at").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin"),
      ]);
      if (cancelled) return;
      const rawTier = ((profile?.subscription_tier as SubscriptionTier) ?? "free");
      setTrialStartedAt(((profile as any)?.trial_started_at as string | null) ?? null);
      // Behandla trial som pro
      setTier(effectiveTier(rawTier, ((profile as any)?.trial_started_at as string | null) ?? null));
      setIsAdmin((roles?.length ?? 0) > 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { tier, isAdmin, loading, trialStartedAt, trialDaysLeft: trialDaysLeft(trialStartedAt), trialActive: isTrialActive(trialStartedAt) };
}
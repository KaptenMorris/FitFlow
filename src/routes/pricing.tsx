import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Sparkles, Loader2, Crown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, type PlanId, type SubscriptionTier, tierLabel, isTrialActive, trialDaysLeft } from "@/lib/subscription";
import { toast } from "sonner";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Priser & prenumerationer — FitFlow" },
      { name: "description", content: "Välj rätt FitFlow-plan för dig. Avsluta när du vill. Alla priser i SEK inkl. moms." },
      { property: "og:title", content: "Priser & prenumerationer — FitFlow" },
      { property: "og:description", content: "Välj rätt FitFlow-plan för dig. Avsluta när du vill. Alla priser i SEK inkl. moms." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const { openCheckout } = usePaddleCheckout();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAuthed(false); return; }
      setIsAuthed(true);
      const [{ data }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("subscription_tier, trial_started_at").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin"),
      ]);
      setCurrentTier((data?.subscription_tier as SubscriptionTier) ?? "free");
      setTrialStartedAt(((data as any)?.trial_started_at as string | null) ?? null);
      setIsAdmin((roles?.length ?? 0) > 0);
    })();
  }, []);

  const choose = async (planId: PlanId) => {
    setLoadingPlan(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const priceId =
        planId === "bas" ? "fitflow_bas_monthly"
        : planId === "standard" ? "fitflow_standard_monthly"
        : "fitflow_pro_monthly";
      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/hem?checkout=success`,
      });
    } catch (e) {
      toast.error("Något gick fel", { description: e instanceof Error ? e.message : "Försök igen" });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-10">
      <PaymentTestModeBanner />
      <header className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isAuthed ? "/profil" : "/"}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="font-semibold leading-tight">Prenumerationer</h1>
          {isAuthed && (
            <p className="text-xs text-muted-foreground">Aktiv plan: {tierLabel(currentTier, isAdmin)}</p>
          )}
        </div>
      </header>

      {isAuthed && !isAdmin && currentTier === "free" && isTrialActive(trialStartedAt) && (
        <div className="mx-4 mt-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-accent/10 p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Din Pro-testperiod är aktiv</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Du har {trialDaysLeft(trialStartedAt)} dag{trialDaysLeft(trialStartedAt) === 1 ? "" : "ar"} kvar med full tillgång. Välj en plan innan testet tar slut för att fortsätta använda FitFlow.
            </p>
          </div>
        </div>
      )}

      {isAuthed && !isAdmin && currentTier === "free" && !isTrialActive(trialStartedAt) && trialStartedAt && (
        <div className="mx-4 mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-semibold text-sm">Din testperiod är slut</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Välj en plan nedan för att fortsätta använda FitFlow.
          </p>
        </div>
      )}

      {isAuthed && isAdmin && (
        <div className="mx-4 mt-4 rounded-2xl border border-warning/50 bg-gradient-to-br from-warning/20 via-accent/10 to-primary/10 p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-warning to-accent flex items-center justify-center flex-shrink-0">
            <Crown className="h-4 w-4 text-background" />
          </div>
          <div>
            <p className="font-semibold text-sm">Admin – Full tillgång</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Du har full tillgång till alla funktioner i FitFlow utan en aktiv prenumeration.
            </p>
          </div>
        </div>
      )}

      <section className="px-4 pt-6 pb-2 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Premium FitFlow
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Välj din plan</h2>
        <p className="text-sm text-muted-foreground">Avsluta när du vill. Alla priser i SEK och inkl. moms.</p>
      </section>

      <div className="px-4 mt-6 space-y-4">
        {PLANS.map((plan) => {
          const isCurrent = isAuthed && currentTier === plan.id;
          const isLoading = loadingPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-3xl border bg-gradient-to-br p-5",
                plan.accent,
                plan.highlight
                  ? "border-warning/60 shadow-[0_0_0_1px_oklch(0.78_0.16_85/0.4),0_20px_60px_-20px_oklch(0.78_0.16_85/0.45)]"
                  : "border-border",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-warning to-accent text-background shadow">
                  ⭐ {plan.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{plan.tagline}</p>
                  <h3 className="text-lg font-bold mt-0.5">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold leading-none">{plan.price} kr</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">/månad</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={cn(
                      "mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0",
                      plan.highlight ? "bg-warning/30 text-warning" : "bg-primary/20 text-primary",
                    )}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => choose(plan.id)}
                disabled={isCurrent || isLoading}
                className={cn(
                  "w-full mt-5 rounded-full font-semibold",
                  plan.highlight
                    ? "bg-gradient-to-r from-warning to-accent text-background hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />Bearbetar…</>)
                  : isCurrent ? "Aktiv plan"
                  : isAuthed ? <>Starta prenumeration</>
                  : <>Logga in för att starta</>}
              </Button>
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center mt-4 px-4">
          Betalning hanteras via Paddle.com, vår återförsäljare och Merchant of Record. Du kan när som helst byta eller säga upp din plan.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2">
          <Link to="/villkor" className="hover:underline">Villkor</Link>
          <Link to="/integritetspolicy" className="hover:underline">Integritetspolicy</Link>
          <Link to="/aterbetalning" className="hover:underline">Återbetalningspolicy</Link>
        </div>
      </div>
    </div>
  );
}
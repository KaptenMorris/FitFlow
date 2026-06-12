import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Dumbbell, BarChart3, Apple, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveWorkoutBanner } from "@/components/fitflow/ActiveWorkoutBanner";
import { hasActiveAccess, type SubscriptionTier } from "@/lib/subscription";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/login", replace: true }); return; }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("has_completed_onboarding, subscription_tier, trial_started_at")
          .eq("id", data.session.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", data.session.user.id).eq("role", "admin"),
      ]);
      if (profile && !profile.has_completed_onboarding && pathname !== "/onboarding") {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      // Tvinga val av plan om trial gått ut och ingen aktiv prenumeration finns.
      const isAdmin = (roles?.length ?? 0) > 0;
      const tier = ((profile as any)?.subscription_tier as SubscriptionTier) ?? "free";
      const trialStartedAt = ((profile as any)?.trial_started_at as string | null) ?? null;
      const allowedWhenLocked = pathname === "/pricing" || pathname === "/profil" || pathname === "/onboarding";
      if (profile?.has_completed_onboarding && !hasActiveAccess(tier, trialStartedAt, isAdmin) && !allowedWhenLocked) {
        navigate({ to: "/pricing", replace: true });
        return;
      }
      setReady(true);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login", replace: true });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, pathname]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Laddar…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main><Outlet /></main>
      <ActiveWorkoutBanner />
      <BottomNav />
    </div>
  );
}

const tabs = [
  { to: "/hem", label: "Hem", icon: Home },
  { to: "/ovningar", label: "Övningar", icon: Dumbbell },
  { to: "/coach", label: "Coach", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/nutrition", label: "Nutrition", icon: Apple },
  { to: "/profil", label: "Profil", icon: User },
] as const;

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-6 max-w-md mx-auto">
        {tabs.map((t) => {
          const active = t.to === "/nutrition" ? pathname.startsWith("/nutrition") : pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link to={t.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-xs", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
                {active && <span className="h-0.5 w-6 rounded-full bg-primary -mb-1" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
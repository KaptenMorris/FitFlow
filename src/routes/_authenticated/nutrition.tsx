import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, LineChart, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/nutrition")({
  component: NutritionLayout,
});

const subtabs: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/nutrition", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/nutrition/log", label: "Logga", icon: Plus },
  { to: "/nutrition/analytics", label: "Insikter", icon: LineChart },
  { to: "/nutrition/coaching", label: "Strategi", icon: Compass },
];

function NutritionLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
        <div className="max-w-md mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Nutrition</h1>
              <p className="text-[11px] text-muted-foreground">Smart coaching som anpassar sig efter dig</p>
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto -mx-1 px-1">
            {subtabs.map((t) => {
              const Icon = t.icon;
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link key={t.to} to={t.to as any} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-4">
        <Outlet />
      </div>
    </div>
  );
}
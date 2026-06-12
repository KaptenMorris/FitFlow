import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LockedFeature({
  title,
  description,
  requiredPlans,
}: {
  title: string;
  description: string;
  requiredPlans: string[];
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6 text-center space-y-4">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-3">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
          <div className="mt-4 inline-flex flex-wrap gap-1.5 justify-center">
            {requiredPlans.map((p) => (
              <span key={p} className="text-[11px] px-2 py-1 rounded-full bg-secondary/60 border border-border">
                {p}
              </span>
            ))}
          </div>
          <Button asChild className="mt-5 w-full rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Link to="/pricing"><Sparkles className="h-4 w-4" />Uppgradera din plan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
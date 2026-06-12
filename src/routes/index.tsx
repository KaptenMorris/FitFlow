import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/subscription";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitFlow — Träning, kost & priser" },
      { name: "description", content: "Se FitFlows abonnemang, funktioner och villkor innan du skapar konto." },
      { property: "og:title", content: "FitFlow — Träning, kost & priser" },
      { property: "og:description", content: "Se FitFlows abonnemang, funktioner och villkor innan du skapar konto." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:px-6 md:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium text-primary">FitFlow för träning och kost</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Allt du behöver för att planera, följa och utveckla din träning</h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Jämför planer, se priser och läs villkor innan du skapar konto. FitFlow hjälper dig med träningsschema, kost, progression och coachning i samma app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="font-semibold">
              <Link to="/pricing">Se priser <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/login">Logga in / skapa konto</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight">Offentlig prislista</h2>
          <p className="mt-2 text-sm text-muted-foreground">Alla priser visas öppet före registrering. Abonnemang förnyas månadsvis och kan sägas upp när som helst.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article key={plan.id} className="border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{plan.tagline}</p>
                  <h3 className="mt-1 text-xl font-semibold">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold leading-none">{plan.price} kr</p>
                  <p className="mt-1 text-xs text-muted-foreground">/månad</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>MC Tech säljer FitFlow. Betalning och abonnemang hanteras av Paddle.com som Merchant of Record.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/pricing" className="hover:text-foreground">Priser</Link>
            <Link to="/villkor" className="hover:text-foreground">Villkor / Terms</Link>
            <Link to="/integritetspolicy" className="hover:text-foreground">Integritetspolicy / Privacy</Link>
            <Link to="/aterbetalning" className="hover:text-foreground">Återbetalning / Refunds</Link>
            <Link to="/login" className="hover:text-foreground">Logga in</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

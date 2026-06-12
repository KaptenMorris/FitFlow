import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aterbetalning")({
  head: () => ({
    meta: [
      { title: "Återbetalningspolicy — FitFlow" },
      { name: "description", content: "FitFlows återbetalningspolicy med 30 dagars pengarna-tillbaka-garanti." },
      { property: "og:title", content: "Återbetalningspolicy — FitFlow" },
      { property: "og:description", content: "FitFlows återbetalningspolicy med 30 dagars pengarna-tillbaka-garanti." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Återbetalningspolicy</h1>
      </header>

      <article className="space-y-5 text-sm leading-relaxed text-foreground/90">
        <p className="text-xs text-muted-foreground">Senast uppdaterad: 7 juni 2026</p>

        <section>
          <h2 className="text-lg font-semibold mt-4">30 dagars pengarna-tillbaka-garanti</h2>
          <p>
            Vi vill att du ska vara nöjd med FitFlow. Om du av någon anledning inte är nöjd kan
            du begära full återbetalning inom <strong>30 dagar</strong> från beställningsdatumet
            för en prenumeration.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">Så begär du återbetalning</h2>
          <p>
            Beställningar och betalningar hanteras av vår online-återförsäljare{" "}
            <strong>Paddle.com</strong>, som är Merchant of Record för alla våra köp.
            Återbetalningar hanteras därför av Paddle:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Gå till{" "}
              <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                paddle.net
              </a>{" "}
              och ange den e-post du använde vid köpet.
            </li>
            <li>Välj den aktuella ordern och begär återbetalning.</li>
            <li>
              Du kan även kontakta vår support hos MC Tech, så hjälper vi dig vidare.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">Uppsägning</h2>
          <p>
            Du kan när som helst säga upp din prenumeration via din kundportal hos Paddle. Vid
            uppsägning behåller du tillgång till betalfunktioner till slutet av den innevarande
            betalperioden. Ingen automatisk förnyelse sker därefter.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">Behandling</h2>
          <p>
            Godkända återbetalningar krediteras tillbaka till det ursprungliga betalningssättet.
            Behandlingstiden varierar beroende på din bank eller kortutgivare, vanligtvis 5–10
            bankdagar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">Konsumenträtt</h2>
          <p>
            Denna policy påverkar inte dina lagstadgade rättigheter som konsument enligt svensk
            och europeisk konsumentlagstiftning.
          </p>
        </section>
      </article>
    </div>
  );
}
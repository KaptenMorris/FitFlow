import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/villkor")({
  head: () => ({
    meta: [
      { title: "Användarvillkor — FitFlow" },
      { name: "description", content: "Användarvillkor för FitFlow av MC Tech." },
      { property: "og:title", content: "Användarvillkor — FitFlow" },
      { property: "og:description", content: "Användarvillkor för FitFlow av MC Tech." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Användarvillkor</h1>
      </header>

      <article className="prose prose-invert max-w-none space-y-5 text-sm leading-relaxed text-foreground/90">
        <p className="text-xs text-muted-foreground">Senast uppdaterad: 7 juni 2026</p>

        <section>
          <h2 className="text-lg font-semibold mt-4">1. Säljare</h2>
          <p>
            FitFlow tillhandahålls av <strong>MC Tech</strong> ("vi", "oss" eller "MC Tech").
            Genom att använda tjänsten ingår du avtal med MC Tech.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">2. Godkännande av villkoren</h2>
          <p>
            Genom att skapa ett konto, logga in eller på annat sätt använda FitFlow godkänner du
            dessa villkor. Om du inte godkänner villkoren ska du inte använda tjänsten.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">3. Tjänsten</h2>
          <p>
            FitFlow är en digital tränings- och kostapp som låter dig planera scheman, logga pass
            och följa din progress. Vissa funktioner kräver en betald prenumeration.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">4. Konto och behörighet</h2>
          <p>
            Du ansvarar för att de uppgifter du anger är korrekta och för att hålla dina
            inloggningsuppgifter konfidentiella. Du är ansvarig för all aktivitet under ditt konto.
            Du måste vara minst 16 år eller ha vårdnadshavares samtycke för att använda tjänsten.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">5. Otillåten användning</h2>
          <p>Du får inte:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>använda tjänsten i strid med tillämplig lag,</li>
            <li>använda tjänsten för bedrägeri eller spam,</li>
            <li>göra intrång i tredje parts immateriella rättigheter,</li>
            <li>störa eller försöka kringgå säkerhetsmekanismer (t.ex. skadlig kod, sondering eller skrapning).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">6. Immateriella rättigheter</h2>
          <p>
            MC Tech äger samtliga rättigheter till tjänsten, dess innehåll, källkod, design och
            varumärken. Du får en begränsad, icke-exklusiv och icke-överlåtbar rätt att använda
            tjänsten inom ramen för vald plan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">7. Tjänstenivå</h2>
          <p>
            Vi strävar efter hög tillgänglighet men kan inte garantera att tjänsten alltid är
            tillgänglig, oavbruten eller felfri. Tjänsten tillhandahålls "i befintligt skick".
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">8. Betalning, prenumeration och återbetalning</h2>
          <p>
            Beställningsprocessen sköts av vår online-återförsäljare <strong>Paddle.com</strong>.
            Paddle.com är Merchant of Record för alla våra beställningar. Paddle hanterar alla
            kundtjänstärenden gällande betalning, fakturering, skatter, uppsägning och
            återbetalningar.
          </p>
          <p>
            Genom att slutföra ett köp accepterar du även{" "}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Paddles köparvillkor
            </a>{" "}
            som reglerar betalning, fakturering, moms, uppsägning och återbetalningar. Se även vår{" "}
            <Link to="/aterbetalning" className="text-primary underline">återbetalningspolicy</Link>.
          </p>
          <p>
            Prenumerationer förnyas automatiskt månadsvis tills du säger upp dem. Vid uppsägning
            behåller du tillgång till betalfunktioner till slutet av den innevarande betalperioden.
            Vid byte av plan sker bytet direkt med proportionell debitering.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">9. Avstängning och uppsägning</h2>
          <p>
            Vi kan stänga av eller avsluta ditt konto vid: väsentligt avtalsbrott, utebliven
            betalning, säkerhets- eller bedrägeririsk, eller upprepade/allvarliga brott mot
            dessa villkor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">10. Ansvarsbegränsning</h2>
          <p>
            I den utsträckning lag tillåter är MC Techs samlade ansvar gentemot dig begränsat
            till de avgifter du betalat under de 12 senaste månaderna. Vi ansvarar inte för
            indirekta skador, förlorad vinst, dataförluster eller goodwill.
          </p>
          <p>
            Inget i dessa villkor begränsar ansvar som inte får begränsas enligt lag (t.ex.
            grov vårdslöshet, personskada eller bedrägeri).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">11. Hälsofriskrivning</h2>
          <p>
            FitFlow är ett verktyg för träning och kostloggning. Innehållet utgör inte medicinsk
            rådgivning. Rådfråga alltid läkare innan du påbörjar nya tränings- eller kostprogram.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">12. Tillämplig lag</h2>
          <p>
            Dessa villkor styrs av svensk lag. Tvister avgörs vid svensk allmän domstol.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">13. Kontakt</h2>
          <p>
            Frågor om villkoren skickas till MC Tech via e-post.
          </p>
        </section>
      </article>
    </div>
  );
}
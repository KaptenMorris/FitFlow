import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integritetspolicy")({
  head: () => ({
    meta: [
      { title: "Integritetspolicy — FitFlow" },
      { name: "description", content: "Så hanterar MC Tech personuppgifter i FitFlow." },
      { property: "og:title", content: "Integritetspolicy — FitFlow" },
      { property: "og:description", content: "Så hanterar MC Tech personuppgifter i FitFlow." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Integritetspolicy</h1>
      </header>

      <article className="space-y-5 text-sm leading-relaxed text-foreground/90">
        <p className="text-xs text-muted-foreground">Senast uppdaterad: 7 juni 2026</p>

        <section>
          <h2 className="text-lg font-semibold mt-4">1. Personuppgiftsansvarig</h2>
          <p>
            <strong>MC Tech</strong> är personuppgiftsansvarig för behandlingen av dina
            personuppgifter i FitFlow.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">2. Kategorier av personuppgifter vi samlar in</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Kontouppgifter:</strong> namn, e-postadress, lösenord (hashat).</li>
            <li><strong>Profil- och hälsodata:</strong> ålder, vikt, längd, mål, träningspass, kostloggar.</li>
            <li><strong>Användningsdata:</strong> sidvisningar, klick, enhetsinformation, IP-adress, ungefärlig plats.</li>
            <li><strong>Supportärenden:</strong> meddelanden du skickar till vår support.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">3. Ändamål och rättslig grund</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Skapa och hantera ditt konto — fullgörande av avtal.</li>
            <li>Tillhandahålla tränings- och kostfunktioner — fullgörande av avtal.</li>
            <li>Säkerhet, bedrägeribekämpning och loggning — berättigat intresse.</li>
            <li>Förbättring av tjänsten och produktutveckling — berättigat intresse.</li>
            <li>Kundtjänst och svar på förfrågningar — berättigat intresse.</li>
            <li>Marknadsföring (när tillämpligt) — samtycke.</li>
            <li>Bokföring och lagstadgade krav — rättslig förpliktelse.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">4. Delning av personuppgifter</h2>
          <p>Vi delar personuppgifter med följande kategorier av mottagare:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Paddle.com Market Limited</strong> — vår Merchant of Record som hanterar
              betalningar, prenumerationer, fakturering och skatter.
            </li>
            <li>
              <strong>Underleverantörer:</strong> hosting, databas, e-post, analys och supportverktyg.
            </li>
            <li><strong>Professionella rådgivare:</strong> juridik och bokföring.</li>
            <li><strong>Myndigheter:</strong> när det krävs enligt lag.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">5. Lagringstid</h2>
          <p>
            Vi sparar personuppgifter så länge ditt konto är aktivt och därefter den tid som krävs
            enligt lag (t.ex. bokföring) eller för att hantera tvister. Därefter raderas eller
            anonymiseras uppgifterna.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">6. Internationella överföringar</h2>
          <p>
            Vissa av våra underleverantörer kan vara baserade utanför EU/EES. När så sker använder
            vi lämpliga skyddsåtgärder, t.ex. EU-kommissionens standardavtalsklausuler.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">7. Dina rättigheter</h2>
          <p>Enligt GDPR har du rätt att:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>begära tillgång till dina uppgifter,</li>
            <li>begära rättelse eller radering,</li>
            <li>begära begränsning eller invända mot behandling,</li>
            <li>begära dataportabilitet,</li>
            <li>återkalla samtycke när behandling sker på den grunden,</li>
            <li>lämna klagomål till tillsynsmyndigheten (Integritetsskyddsmyndigheten, IMY).</li>
          </ul>
          <p>Vi svarar normalt inom en månad från det att vi mottagit din begäran.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">8. Säkerhet</h2>
          <p>
            Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina
            personuppgifter, inklusive kryptering vid överföring, åtkomstkontroller och loggning.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">9. Cookies</h2>
          <p>
            FitFlow använder nödvändiga cookies för inloggning och sessioner samt vid behov
            analyscookies för att förbättra tjänsten. Du kan hantera cookies via din webbläsare.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-4">10. Kontakt</h2>
          <p>
            Frågor om denna integritetspolicy eller dina rättigheter skickas till MC Tech via
            e-post.
          </p>
        </section>
      </article>
    </div>
  );
}
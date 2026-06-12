import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ovning/$id")({
  component: OvningDetail,
});

type Ex = {
  id: string;
  name: string;
  name_sv: string | null;
  muscle_group: string;
  sub_muscle: string | null;
  target: string | null;
  body_part: string | null;
  equipment: string;
  secondary_muscles: string[] | null;
  image_url: string | null;
  gif_url: string | null;
  instructions_sv: string[] | null;
  instructions_en: string[] | null;
};

function OvningDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [ex, setEx] = useState<Ex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("exercises").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setEx(data as Ex | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="max-w-md mx-auto p-6 text-sm text-muted-foreground">Laddar…</div>;
  if (!ex) return <div className="max-w-md mx-auto p-6 text-sm text-muted-foreground">Övningen hittades inte.</div>;

  const title = ex.name_sv || ex.name;
  const steps = (ex.instructions_sv && ex.instructions_sv.length ? ex.instructions_sv : ex.instructions_en) || [];

  return (
    <div className="max-w-md mx-auto pb-10">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.history.back();
            else router.navigate({ to: "/ovningar" });
          }}
          aria-label="Tillbaka"
          className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold truncate flex-1">{title}</h1>
      </div>

      <div className="px-4">
        <div className="relative rounded-2xl overflow-hidden bg-secondary border border-border aspect-square shadow-[0_0_30px_oklch(0.7_0.18_180/0.15)]">
          {ex.gif_url ? (
            <img src={ex.gif_url} alt={title} className="w-full h-full object-contain bg-white" loading="eager" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Dumbbell className="h-12 w-12 text-muted-foreground" /></div>
          )}
        </div>

        <h2 className="text-2xl font-bold mt-4 capitalize">{title}</h2>
        {ex.name_sv && ex.name && ex.name_sv.toLowerCase() !== ex.name.toLowerCase() && (
          <p className="text-xs text-muted-foreground italic mt-0.5">{ex.name}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <Pill label="Muskelgrupp" value={ex.muscle_group} tone="teal" />
          {ex.target && <Pill label="Mål" value={ex.target} />}
          <Pill label="Utrustning" value={ex.equipment} />
          {ex.body_part && ex.body_part.toLowerCase() !== ex.muscle_group.toLowerCase() && (
            <Pill label="Kroppsdel" value={ex.body_part} />
          )}
        </div>

        {ex.secondary_muscles && ex.secondary_muscles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Sekundära muskler</p>
            <div className="flex flex-wrap gap-1.5">
              {ex.secondary_muscles.map((m, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground">{m}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Instruktioner</h3>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 h-7 w-7 rounded-full bg-[oklch(0.7_0.18_180)] text-[oklch(0.12_0.03_240)] text-xs font-bold flex items-center justify-center shadow-[0_0_12px_oklch(0.7_0.18_180/0.5)]">{i + 1}</span>
                <p className="text-sm leading-relaxed text-foreground pt-0.5">{s}</p>
              </li>
            ))}
            {steps.length === 0 && <li className="text-sm text-muted-foreground">Inga instruktioner tillgängliga.</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: "teal" }) {
  return (
    <div className={`text-xs px-2.5 py-1 rounded-md border ${tone === "teal" ? "bg-[oklch(0.7_0.18_180/0.15)] border-[oklch(0.7_0.18_180/0.4)] text-[oklch(0.85_0.12_180)]" : "bg-card border-border text-foreground"}`}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
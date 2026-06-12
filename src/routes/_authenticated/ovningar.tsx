import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/fitflow/AppHeader";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ovningar")({ component: OvningarPage });

type Ex = { id: string; name: string; name_sv: string | null; muscle_group: string; sub_muscle: string | null; equipment: string; image_url: string | null; body_part: string | null };
const BODY = ["Alla","Bröst","Rygg","Axlar","Överarmar","Underarmar","Mage","Ben","Vader","Nacke","Kondition"];
const EQUIP = ["Alla","Kroppsvikt","Hantel","Skivstång","Kabel","Kettlebell","Gummiband","Smithmaskin","Hävmaskin"];

function OvningarPage() {
  const [list, setList] = useState<Ex[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [body, setBody] = useState("Alla");
  const [equip, setEquip] = useState("Alla");

  useEffect(() => {
    supabase.from("exercises").select("id", { count: "exact", head: true }).then(({ count }) => setTotal(count || 0));
  }, []);

  useEffect(() => {
    let query = supabase.from("exercises").select("id,name,name_sv,muscle_group,sub_muscle,equipment,image_url,body_part");
    if (body !== "Alla") query = query.eq("body_part", body);
    if (equip !== "Alla") query = query.eq("equipment", equip);
    if (q.trim()) query = query.or(`name_sv.ilike.%${q}%,name.ilike.%${q}%`);
    query.order("name_sv").limit(500).then(({ data }) => setList((data as Ex[]) || []));
  }, [q, body, equip]);

  const filtered = list;

  return (
    <div className="max-w-md mx-auto">
      <AppHeader />
      <div className="px-4 space-y-3">
        <div><h1 className="text-2xl font-bold">Övningar</h1><p className="text-xs text-muted-foreground">{total || list.length} övningar</p></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Sök övning..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
        <ChipRow items={BODY} value={body} onChange={setBody} activeClass="bg-accent text-accent-foreground" />
        <ChipRow items={EQUIP} value={equip} onChange={setEquip} activeClass="bg-accent text-accent-foreground" />
        <div className="space-y-2 pb-6">
          {filtered.map((e) => (
            <Link key={e.id} to="/ovning/$id" params={{ id: e.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-[oklch(0.7_0.18_180/0.5)] transition-colors">
              <div className="h-14 w-14 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                {e.image_url ? <img src={e.image_url} alt="" className="w-full h-full object-contain" loading="lazy" /> : <Dumbbell className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-primary truncate capitalize">{e.name_sv || e.name}</p>
                <p className="text-xs truncate"><span className="text-foreground">{e.muscle_group}</span>{e.sub_muscle && <span className="text-muted-foreground"> · {e.sub_muscle}</span>}<span className="text-muted-foreground"> · {e.equipment}</span></p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Inga övningar matchar filtret.</p>}
        </div>
      </div>
    </div>
  );
}

function ChipRow({ items, value, onChange, activeClass }: { items: string[]; value: string; onChange: (v: string) => void; activeClass: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      {items.map((i) => (
        <button key={i} onClick={() => onChange(i)} className={cn("text-xs px-3 py-1.5 rounded-md border whitespace-nowrap", value === i ? activeClass + " border-transparent" : "bg-card border-border text-muted-foreground")}>{i}</button>
      ))}
    </div>
  );
}
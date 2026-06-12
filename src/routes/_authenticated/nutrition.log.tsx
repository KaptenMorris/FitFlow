import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recipeFromUrl } from "@/lib/recipe-url.functions";
import { CameraScanner } from "@/components/nutrition/CameraScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Camera, Barcode, Link2, Zap, ChefHat, Clock, Plus, Loader2, ArrowRight } from "lucide-react";
import { searchFoods, recentFoodNames, logFood } from "@/lib/macrofactor/api";
import type { Food, Meal } from "@/lib/macrofactor/types";
import { todayISO } from "@/lib/macrofactor/algorithms";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nutrition/log")({
  validateSearch: (s: Record<string, unknown>) => ({
    meal: (s.meal as Meal) ?? guessMeal(),
    date: (s.date as string) ?? todayISO(),
  }),
  component: Logger,
});

function guessMeal(): Meal {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}

function gradeFood(f: { protein_g: number; sugar_g: number | null; sat_fat_g?: number | null; fiber_g: number | null; kcal: number }): "A"|"B"|"C"|"D"|"E" {
  let score = 0;
  const pPerKcal = f.kcal > 0 ? (f.protein_g * 4) / f.kcal : 0;
  if (pPerKcal >= 0.4) score += 2; else if (pPerKcal >= 0.2) score += 1;
  if ((f.fiber_g ?? 0) >= 3) score += 1;
  if ((f.sugar_g ?? 0) >= 12) score -= 2; else if ((f.sugar_g ?? 0) >= 6) score -= 1;
  if ((f.sat_fat_g ?? 0) >= 5) score -= 1;
  if (score >= 3) return "A";
  if (score >= 1) return "B";
  if (score >= 0) return "C";
  if (score >= -2) return "D";
  return "E";
}

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-300",
  B: "bg-lime-500/20 text-lime-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-orange-500/20 text-orange-300",
  E: "bg-rose-500/20 text-rose-300",
};

function Logger() {
  const { meal, date } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"sok"|"snabb"|"recept">("sok");
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [currentMeal, setCurrentMeal] = useState<Meal>(meal);

  // Quick add state
  const [qaName, setQaName] = useState("Quick add");
  const [qaKcal, setQaKcal] = useState("");
  const [qaP, setQaP] = useState("");
  const [qaC, setQaC] = useState("");
  const [qaF, setQaF] = useState("");

  // Smart integrations
  const [cameraOpen, setCameraOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlVal, setUrlVal] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const fromUrl = useServerFn(recipeFromUrl);

  function fillQuick(p: { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) {
    setQaName(p.name);
    setQaKcal(String(p.kcal));
    setQaP(String(p.protein_g));
    setQaC(String(p.carbs_g));
    setQaF(String(p.fat_g));
    setTab("snabb");
  }

  async function lookupBarcode() {
    const code = barcode.trim();
    if (!/^\d{6,14}$/.test(code)) return toast.error("Ogiltig streckkod");
    setBarcodeBusy(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const j = await res.json();
      if (j.status !== 1 || !j.product) throw new Error("Hittade ingen produkt");
      const p = j.product;
      const n = p.nutriments ?? {};
      const name = p.product_name || p.generic_name || `Produkt ${code}`;
      fillQuick({
        name,
        kcal: Math.round(Number(n["energy-kcal_100g"]) || (Number(n.energy_100g) || 0) / 4.184 || 0),
        protein_g: Math.round(Number(n.proteins_100g) || 0),
        carbs_g: Math.round(Number(n.carbohydrates_100g) || 0),
        fat_g: Math.round(Number(n.fat_100g) || 0),
      });
      toast.success(`Hittade: ${name} (per 100g)`);
      setBarcodeOpen(false);
      setBarcode("");
    } catch (e: any) {
      toast.error(e?.message ?? "Sökning misslyckades");
    } finally {
      setBarcodeBusy(false);
    }
  }

  async function lookupUrl() {
    if (!urlVal.trim()) return;
    setUrlBusy(true);
    try {
      const r = await fromUrl({ data: { url: urlVal.trim() } });
      fillQuick(r);
      toast.success(`Hämtade: ${r.name}`);
      setUrlOpen(false);
      setUrlVal("");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte hämta recept");
    } finally {
      setUrlBusy(false);
    }
  }

  const searchQ = useQuery({ queryKey: ["mf-foods", q], queryFn: () => searchFoods(q) });
  const recentQ = useQuery({ queryKey: ["mf-recent"], queryFn: () => recentFoodNames(6) });

  const logMut = useMutation({
    mutationFn: logFood,
    onSuccess: () => {
      toast.success("Loggat");
      qc.invalidateQueries({ queryKey: ["mf-log"] });
      qc.invalidateQueries({ queryKey: ["mf-recent"] });
      setSelected(null);
      navigate({ to: "/nutrition" });
    },
  });

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök mat..." className="pl-9" />
        </div>
      </div>

      {/* Meal picker */}
      <div className="flex gap-1 text-xs">
        {(["breakfast","lunch","dinner","snack"] as Meal[]).map((m) => (
          <button key={m} onClick={() => setCurrentMeal(m)} className={`px-3 py-1.5 rounded-full ${currentMeal===m ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}>
            {({breakfast:"Frukost",lunch:"Lunch",dinner:"Middag",snack:"Mellan"})[m]}
          </button>
        ))}
      </div>

      {/* Smart integrations row (placeholders) */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setCameraOpen(true)} className="rounded-xl border border-dashed border-border/60 bg-secondary/30 py-3 flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Camera className="h-4 w-4" />
          Foto-AI
        </button>
        <button onClick={() => setBarcodeOpen(true)} className="rounded-xl border border-dashed border-border/60 bg-secondary/30 py-3 flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Barcode className="h-4 w-4" />
          Streckkod
        </button>
        <button onClick={() => setUrlOpen(true)} className="rounded-xl border border-dashed border-border/60 bg-secondary/30 py-3 flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Link2 className="h-4 w-4" />
          URL → recept
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([["sok","Sök"],["snabb","Snabb-tillägg"],["recept","Recept"]] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 text-xs font-medium ${tab===id ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "sok" && (
        <div className="space-y-3">
          {!q && (recentQ.data?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Smart historik</p>
              <div className="flex flex-wrap gap-1.5">
                {recentQ.data!.map((r) => (
                  <button key={r.name} onClick={() => logMut.mutate({ servings: 1, meal: currentMeal, date, quick: r })} className="px-3 py-1.5 rounded-full bg-secondary text-xs hover:bg-primary/20 transition-colors">
                    {r.name} <span className="text-muted-foreground tabular-nums">· {Math.round(r.kcal)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {searchQ.data?.map((f) => {
              const grade = gradeFood(f);
              return (
                <button key={f.id} onClick={() => { setSelected(f); setServings(1); }} className="w-full text-left p-3 rounded-lg bg-card border border-border/50 hover:border-primary/40 flex items-center gap-3 transition-colors">
                  <span className={`h-7 w-7 rounded-md grid place-items-center text-xs font-bold ${GRADE_COLOR[grade]}`}>{grade}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{f.serving_label} · {Math.round(f.kcal)} kcal · P{Math.round(f.protein_g)} K{Math.round(f.carbs_g)} F{Math.round(f.fat_g)}</p>
                  </div>
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              );
            })}
            {searchQ.isSuccess && searchQ.data?.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">Inga träffar — testa Snabb-tillägg.</p>
            )}
          </div>
        </div>
      )}

      {tab === "snabb" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Snabb-tillägg</h3></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Namn</Label><Input value={qaName} onChange={(e) => setQaName(e.target.value)} /></div>
            <div><Label className="text-[10px]">Kcal</Label><Input type="number" inputMode="decimal" value={qaKcal} onChange={(e) => setQaKcal(e.target.value)} /></div>
            <div><Label className="text-[10px]">Protein (g)</Label><Input type="number" inputMode="decimal" value={qaP} onChange={(e) => setQaP(e.target.value)} /></div>
            <div><Label className="text-[10px]">Kolh (g)</Label><Input type="number" inputMode="decimal" value={qaC} onChange={(e) => setQaC(e.target.value)} /></div>
            <div><Label className="text-[10px]">Fett (g)</Label><Input type="number" inputMode="decimal" value={qaF} onChange={(e) => setQaF(e.target.value)} /></div>
          </div>
          <Button className="w-full" onClick={() => {
            const kcal = parseFloat(qaKcal); if (isNaN(kcal)) return toast.error("Ange kcal");
            logMut.mutate({ servings: 1, meal: currentMeal, date, quick: { name: qaName, kcal, protein_g: parseFloat(qaP)||0, carbs_g: parseFloat(qaC)||0, fat_g: parseFloat(qaF)||0 } });
          }}>Lägg till</Button>
        </Card>
      )}

      {tab === "recept" && (
        <Card className="p-6 text-center space-y-4">
          <ChefHat className="h-8 w-8 mx-auto text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Recept-byggare</p>
            <p className="text-xs text-muted-foreground">Skapa egna recept med flera ingredienser, AI-generera nya och logga med ett klick.</p>
          </div>
          <Button className="w-full" onClick={() => navigate({ to: "/recept" })}>
            Öppna recept <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Card>
      )}

      {/* Servings drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selected?.name}</DrawerTitle>
          </DrawerHeader>
          {selected && (
            <div className="px-4 pb-2 space-y-4">
              <p className="text-xs text-muted-foreground text-center">{selected.serving_label}</p>
              <div className="flex items-center justify-center gap-3">
                <Button size="icon" variant="outline" onClick={() => setServings((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}>−</Button>
                <div className="text-2xl font-semibold tabular-nums w-20 text-center">{servings}</div>
                <Button size="icon" variant="outline" onClick={() => setServings((s) => +(s + 0.25).toFixed(2))}>+</Button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[["Kcal", Math.round(selected.kcal*servings)], ["P", Math.round(selected.protein_g*servings)+"g"], ["K", Math.round(selected.carbs_g*servings)+"g"], ["F", Math.round(selected.fat_g*servings)+"g"]].map(([l,v]) => (
                  <div key={l} className="p-2 rounded bg-secondary/60"><div className="text-[10px] text-muted-foreground">{l}</div><div className="text-sm font-medium tabular-nums">{v}</div></div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Måltid</span>
                <select className="bg-secondary rounded px-2 py-1 text-xs" value={currentMeal} onChange={(e) => setCurrentMeal(e.target.value as Meal)}>
                  <option value="breakfast">Frukost</option><option value="lunch">Lunch</option><option value="dinner">Middag</option><option value="snack">Mellanmål</option>
                </select>
              </div>
            </div>
          )}
          <DrawerFooter>
            <Button onClick={() => selected && logMut.mutate({ food: selected, servings, meal: currentMeal, date })} disabled={logMut.isPending}>Logga</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sök streckkod</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">EAN / UPC</Label>
            <Input inputMode="numeric" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="t.ex. 7310070000010" onKeyDown={(e) => { if (e.key === "Enter") lookupBarcode(); }} />
            <p className="text-[10px] text-muted-foreground">Data från Open Food Facts. Värden visas per 100g.</p>
          </div>
          <DialogFooter>
            <Button onClick={lookupBarcode} disabled={barcodeBusy}>{barcodeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sök"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recept från URL</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Länk till recept</Label>
            <Input autoFocus value={urlVal} onChange={(e) => setUrlVal(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") lookupUrl(); }} />
            <p className="text-[10px] text-muted-foreground">AI uppskattar näringsvärden per portion.</p>
          </div>
          <DialogFooter>
            <Button onClick={lookupUrl} disabled={urlBusy}>{urlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hämta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraScanner open={cameraOpen} onOpenChange={setCameraOpen} onResult={fillQuick} />
    </div>
  );
}
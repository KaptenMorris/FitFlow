import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChefHat, Plus, ChevronDown, ChevronUp, Search, X, Minus, Sparkles,
  Trash2, Save, ShoppingCart, CalendarPlus, Pencil, Check, Info, Loader2,
  ImageIcon, Upload, Share2, Send, Users, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { lookupProduct, generateRecipe, generateRecipeImage, ensureRecipeImage, signRecipeImages } from "@/lib/recipes.functions";
import { shareRecipe } from "@/lib/friends.functions";
import { RecipeLibrary } from "@/components/fitflow/RecipeLibrary";
import { useSubscription, hasRecipesAccess } from "@/lib/subscription";
import { LockedFeature } from "@/components/fitflow/LockedFeature";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/recept")({ component: ReceptPage });

function ConfirmDeleteDialog({
  recipeName, onConfirm, trigger,
}: { recipeName: string; onConfirm: () => unknown | Promise<unknown>; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm rounded-3xl border-border bg-card p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-destructive/20 via-destructive/5 to-transparent px-6 pt-6 pb-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogHeader className="mt-4 text-center sm:text-center">
            <AlertDialogTitle className="text-lg">Radera receptet?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              <span className="font-semibold text-foreground">{recipeName}</span> tas bort permanent.
              Det går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="flex-row gap-2 p-4 pt-2">
          <AlertDialogCancel className="flex-1 m-0 rounded-xl">Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);
              try { await onConfirm(); setOpen(false); } finally { setLoading(false); }
            }}
            className="flex-1 m-0 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Radera
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Ingredient = {
  name: string;
  grams: number;
  kcal_per_100: number;
  protein_per_100: number;
  fat_per_100: number;
  carbs_per_100: number;
};
type Recipe = {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  protein_source: string | null;
  protein_type: string | null;
  portions: number;
  ingredients: Ingredient[];
  steps: string[];
  checked_steps: boolean[];
  image_url: string | null;
  in_meal_plan: boolean;
};

const MEAL_TYPES = ["Frukost", "Lunch", "Middag", "Mellanmål"];
const PROTEIN_TYPES = [
  { label: "Kyckling", emoji: "🍗" },
  { label: "Kött", emoji: "🥩" },
  { label: "Fisk", emoji: "🐟" },
  { label: "Vegetarisk", emoji: "🥬" },
  { label: "FitFlow väljer", emoji: "🎲" },
];
const QUICK_PRODUCTS = ["Kycklingfilé", "Havregryn", "Ägg", "Lax", "Kvarg", "Ris kokt", "Banan", "Mandel"];

function proteinEmoji(p: string | null | undefined): string {
  const k = (p ?? "").toLowerCase().trim();
  if (k.includes("kyckling") || k.includes("kalkon") || k.includes("fågel")) return "🍗";
  if (k.includes("fisk") || k.includes("lax") || k.includes("torsk") || k.includes("tonfisk") || k.includes("räk") || k.includes("skaldjur")) return "🐟";
  if (k.includes("veget") || k.includes("vegan") || k.includes("tofu") || k.includes("baljväxt")) return "🥬";
  if (k.includes("kött") || k.includes("nöt") || k.includes("biff") || k.includes("fläsk") || k.includes("lamm") || k.includes("oxfil") || k.includes("färs")) return "🥩";
  return "🍽️";
}

function sumMacros(ings: Ingredient[]) {
  return ings.reduce(
    (a, i) => {
      const f = (i.grams || 0) / 100;
      a.kcal += (i.kcal_per_100 || 0) * f;
      a.protein += (i.protein_per_100 || 0) * f;
      a.fat += (i.fat_per_100 || 0) * f;
      a.carbs += (i.carbs_per_100 || 0) * f;
      return a;
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

function ReceptPage() {
  const { tier, isAdmin, loading: subLoading } = useSubscription();
  const [tab, setTab] = useState<"upptack" | "sparade" | "mina" | "produkter">("upptack");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const signImages = useServerFn(signRecipeImages);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setRecipes([]); return; }
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    const list = ((data as unknown) as Recipe[]) || [];
    setRecipes(list);
    const needSign = list
      .filter((r) => !r.image_url && (r as unknown as { image_path?: string | null }).image_path)
      .map((r) => r.id);
    if (needSign.length) {
      try {
        const { urls } = await signImages({ data: { recipeIds: needSign } });
        setRecipes((prev) => prev.map((r) => (urls[r.id] ? { ...r, image_url: urls[r.id] } : r)));
      } catch { /* ignore signing failures */ }
    }
  };
  useEffect(() => { refresh(); }, []);

  if (subLoading) return <div className="max-w-md mx-auto py-10 text-center text-sm text-muted-foreground">Laddar…</div>;
  if (!hasRecipesAccess(tier, isAdmin)) {
    return (
      <LockedFeature
        title="Recept är en premiumfunktion"
        description="Lås upp hela receptbiblioteket, kostrekommendationer och näringsspårning genom att uppgradera din plan."
        requiredPlans={["FitFlow Standard", "FitFlow Pro"]}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="relative flex items-center justify-center py-4 border-b border-border">
        <Link to="/nutrition" className="absolute left-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Nutrition
        </Link>
        <h1 className="font-semibold">Recept</h1>
      </header>
      <div className="px-4 space-y-4 pt-4">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/20 via-card to-card p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.7_0.2_140/0.4),_transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-1 text-accent text-xs font-semibold tracking-wide">
              <ChefHat className="h-4 w-4" />FITFLOWS RECEPT
            </div>
            <h2 className="text-2xl font-bold mt-2 leading-tight">
              Recept anpassade<br />just för dig
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              FitFlow-genererade utifrån dina mål & makron — som HelloFresh, fast personligare.
            </p>
            <Button
              onClick={() => setCreating(true)}
              className="mt-3 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
            >
              <Plus className="h-4 w-4" />Skapa nytt recept
            </Button>
          </div>
        </div>

        <div className="flex gap-1 bg-card rounded-xl p-1 border border-border">
          {[
            { key: "upptack", label: "Upptäck" },
            { key: "sparade", label: "Sparade" },
            { key: "mina", label: "Mina" },
            { key: "produkter", label: "Produkter" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={cn(
                "flex-1 text-xs py-2 rounded-lg transition-colors",
                tab === t.key ? "bg-foreground/10 text-foreground font-semibold" : "text-muted-foreground",
              )}
            >{t.label}</button>
          ))}
        </div>

        {tab === "upptack" && <RecipeLibrary mode="discover" />}
        {tab === "sparade" && <RecipeLibrary mode="saved" />}

        {tab === "mina" && (
          <div className="space-y-3">
            {recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga recept ännu. Klicka "Skapa nytt recept" för att börja.
              </p>
            ) : (
              recipes.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  open={openId === r.id}
                  onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                  onEdit={() => setEditingId(r.id)}
                  onRefresh={refresh}
                />
              ))
            )}
          </div>
        )}

        {tab === "produkter" && <ProduktPanel />}
      </div>

      {creating && (
        <RecipeModal
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); setCreating(false); }}
        />
      )}
      {editingId && (
        <RecipeModal
          recipe={recipes.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSaved={async () => { await refresh(); setEditingId(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Produkter ------------------------------ */
function ProduktPanel() {
  const lookup = useServerFn(lookupProduct);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const run = async (term?: string) => {
    const query = (term ?? q).trim();
    if (!query) return;
    setQ(query);
    setLoading(true);
    setResult(null);
    try {
      const data = await lookup({ data: { query } });
      if ((data as any).error) toast.error("Hittade inte livsmedlet");
      else setResult(data);
    } catch (e: any) {
      toast.error(e.message ?? "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sök efter ett livsmedel för att se näringsvärden per 100g.
      </p>
      <div className="flex gap-2">
        <div className={cn("flex-1 flex items-center gap-2 rounded-xl border bg-card px-3 transition-colors", q ? "border-accent" : "border-border")}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="T.ex. kycklingfilé, havregryn, ägg..."
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
          />
          {q && (
            <button onClick={() => { setQ(""); setResult(null); }} aria-label="Rensa">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          onClick={() => run()}
          disabled={loading}
          className="bg-accent text-accent-foreground hover:bg-accent/90 px-4"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          {QUICK_PRODUCTS.map((p) => (
            <button
              key={p}
              onClick={() => run(p)}
              className="px-3 py-1.5 rounded-full text-xs border border-border bg-card hover:bg-foreground/5 transition-colors"
            >{p}</button>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-sm text-muted-foreground">FitFlow letar näringsvärden...</span>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div>
            <h3 className="text-lg font-bold">{result.name}</h3>
            {result.subtitle && <p className="text-xs text-muted-foreground">{result.subtitle}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MacroBox color="success" value={result.kcal} unit="kcal" label="Kalorier per 100g" />
            <MacroBox color="primary" value={result.protein_g} unit="g" label="Protein per 100g" />
            <MacroBox color="warning" value={result.fat_g} unit="g" label="Fett per 100g" />
            <MacroBox color="streak" value={result.carbs_g} unit="g" label="Kolhydrater per 100g" />
          </div>
          {result.note && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{result.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MacroBox({ color, value, unit, label }: { color: string; value: number; unit: string; label: string }) {
  const cls: Record<string, string> = {
    success: "text-success bg-success/10 border-success/20",
    primary: "text-primary bg-primary/10 border-primary/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    streak: "text-streak bg-streak/10 border-streak/20",
  };
  return (
    <div className={cn("rounded-xl border p-3", cls[color])}>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{Math.round(Number(value) || 0)}</span>
        <span className="text-xs font-semibold">{unit}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ----------------------------- Recipe Card ----------------------------- */
function RecipeCard({
  recipe, open, onToggle, onEdit, onRefresh,
}: {
  recipe: Recipe; open: boolean; onToggle: () => void; onEdit: () => void; onRefresh: () => Promise<void>;
}) {
  const [portions, setPortions] = useState(recipe.portions || 2);
  const [checked, setChecked] = useState<boolean[]>(
    Array.isArray(recipe.checked_steps) && recipe.checked_steps.length === recipe.steps.length
      ? recipe.checked_steps : recipe.steps.map(() => false),
  );
  const [showShop, setShowShop] = useState(false);
  useEffect(() => { setPortions(recipe.portions || 2); }, [recipe.portions]);

  const [autoImgUrl, setAutoImgUrl] = useState<string | null>(recipe.image_url);
  const [autoImgLoading, setAutoImgLoading] = useState(false);
  const ensureImg = useServerFn(ensureRecipeImage);
  useEffect(() => { setAutoImgUrl(recipe.image_url); }, [recipe.image_url, recipe.id]);
  const runGenerate = async (force = false) => {
    setAutoImgLoading(true);
    try {
      const r = await ensureImg({ data: { recipeId: recipe.id, force } });
      if (r.image_url) setAutoImgUrl(r.image_url);
      else if (r.error === "NO_CREDITS") toast.error("AI-krediter slut – lägg till krediter i arbetsytan.");
      else if (r.error === "RATE_LIMIT") toast.error("För många bildförfrågningar – prova snart igen.");
      else if (r.error) toast.error("Kunde inte skapa bild just nu.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("NO_CREDITS")) toast.error("AI-krediter slut – lägg till krediter i arbetsytan.");
      else if (msg.includes("RATE_LIMIT")) toast.error("För många bildförfrågningar – prova snart igen.");
      else toast.error("Kunde inte skapa bild just nu.");
    } finally {
      setAutoImgLoading(false);
    }
  };
  useEffect(() => {
    if (open && !autoImgUrl && !autoImgLoading) void runGenerate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const basePortions = recipe.portions || 2;
  const scale = portions / basePortions;
  const ings = recipe.ingredients || [];
  const macrosBase = useMemo(() => sumMacros(ings), [ings]);
  const perPortion = {
    kcal: macrosBase.kcal / basePortions,
    protein: macrosBase.protein / basePortions,
    fat: macrosBase.fat / basePortions,
    carbs: macrosBase.carbs / basePortions,
  };
  const totalScaled = {
    kcal: macrosBase.kcal * scale,
    protein: macrosBase.protein * scale,
    fat: macrosBase.fat * scale,
    carbs: macrosBase.carbs * scale,
  };

  const toggleStep = async (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    await supabase.from("recipes").update({ checked_steps: next } as any).eq("id", recipe.id);
  };

  const deleteRecipe = async () => {
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) toast.error(error.message);
    else { toast.success("Receptet raderades"); onRefresh(); }
  };

  const toggleMealPlan = async () => {
    const next = !recipe.in_meal_plan;
    const { error } = await supabase.from("recipes").update({ in_meal_plan: next } as any).eq("id", recipe.id);
    if (error) toast.error(error.message);
    else { toast.success(next ? "Tillagd i kostschema" : "Borttagen från kostschema"); onRefresh(); }
  };

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-[oklch(0.3_0.1_320/0.25)] to-card">
      <button onClick={onToggle} className="w-full text-left">
        <div className="h-28 bg-gradient-to-br from-muted to-muted/40 relative overflow-hidden">
          {autoImgUrl ? (
            <img src={autoImgUrl} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🍽️</div>
          )}
          {autoImgLoading && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[11px] font-semibold">Skapar bild...</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-2 left-3 right-10">
            <h3 className="font-bold text-base text-white drop-shadow">{recipe.name}</h3>
            {recipe.description && open && (
              <p className="text-xs text-white/80 line-clamp-2 mt-0.5">{recipe.description}</p>
            )}
          </div>
          <div className="absolute bottom-2 right-3 text-white/80">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        <div className="p-3 pb-2">
          <div className="flex gap-2 text-xs flex-wrap">
            {recipe.meal_type && <span className="px-2 py-0.5 rounded-full bg-foreground/10">🍱 {recipe.meal_type}</span>}
            {(recipe.protein_type || recipe.protein_source) && (
              <span className="px-2 py-0.5 rounded-full bg-foreground/10">{proteinEmoji(recipe.protein_type || recipe.protein_source)} {recipe.protein_type || recipe.protein_source}</span>
            )}
          </div>
          <div className="flex gap-3 mt-2 text-sm font-semibold">
            <span className="text-success">{Math.round(perPortion.kcal)} kcal</span>
            <span className="text-primary">{Math.round(perPortion.protein)}g P</span>
            <span className="text-warning">{Math.round(perPortion.fat)}g F</span>
            <span className="text-streak">{Math.round(perPortion.carbs)}g K</span>
            <span className="ml-auto text-xs text-muted-foreground font-normal">/ portion</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2">
            <span className="text-sm font-medium">Portioner</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPortions(Math.max(1, portions - 1))}
                className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center"
              ><Minus className="h-3 w-3" /></button>
              <span className="font-bold text-base w-6 text-center">{portions}</span>
              <button
                onClick={() => setPortions(portions + 1)}
                className="h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
              ><Plus className="h-3 w-3" /></button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <TotalBox color="text-success" value={Math.round(totalScaled.kcal)} unit="kcal" label="Kalorier" portions={portions} />
            <TotalBox color="text-primary" value={Math.round(totalScaled.protein) + "g"} unit="" label="Protein" portions={portions} />
            <TotalBox color="text-warning" value={Math.round(totalScaled.fat) + "g"} unit="" label="Fett" portions={portions} />
            <TotalBox color="text-streak" value={Math.round(totalScaled.carbs) + "g"} unit="" label="Kolhydr." portions={portions} />
          </div>

          {ings.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-1">Ingredienser</h4>
              <div className="space-y-1">
                {ings.map((i, idx) => {
                  const g = Math.round(i.grams * scale);
                  const kcal = Math.round((i.kcal_per_100 * g) / 100);
                  const colors = ["text-primary", "text-warning", "text-streak", "text-success", "text-accent"];
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm py-1">
                      <span className={cn("font-medium", colors[idx % colors.length])}>{i.name}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold">{g}g</span>
                        <span className="text-muted-foreground w-14 text-right">{kcal} kcal</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recipe.steps?.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-2">Gör så här</h4>
              <div className="space-y-2">
                {recipe.steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => toggleStep(i)}
                    className="w-full flex items-start gap-2 text-left rounded-lg border border-border bg-card/40 px-3 py-2"
                  >
                    <span className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                      checked[i] ? "bg-accent border-accent" : "border-border",
                    )}>
                      {checked[i] && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
                    </span>
                    <span className={cn("text-xs", checked[i] && "line-through text-muted-foreground")}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowShop(true)}
            variant="outline"
            className="w-full rounded-xl border-warning/40 bg-warning/5 hover:bg-warning/10 text-foreground"
          >
            <ShoppingCart className="h-4 w-4 text-warning" />Skapa handlingslista
          </Button>
          <Button
            onClick={toggleMealPlan}
            variant="outline"
            className={cn(
              "w-full rounded-xl",
              recipe.in_meal_plan && "border-accent bg-accent/10 text-accent",
            )}
          >
            <CalendarPlus className="h-4 w-4" />
            {recipe.in_meal_plan ? "I kostschema" : "Lägg till i kostschema"}
          </Button>
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="outline" className="flex-1 rounded-xl">
              <Pencil className="h-4 w-4" />Redigera
            </Button>
            <ShareRecipeDialog
              recipe={recipe}
              trigger={
                <Button variant="outline" size="icon" className="rounded-xl border-accent/40 text-accent hover:bg-accent/10">
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
            <ConfirmDeleteDialog
              recipeName={recipe.name}
              onConfirm={deleteRecipe}
              trigger={
                <Button variant="outline" size="icon" className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      )}

      {showShop && (
        <ShoppingListSheet recipe={recipe} portions={portions} onClose={() => setShowShop(false)} />
      )}
    </div>
  );
}

function TotalBox({ color, value, unit, label, portions }: { color: string; value: number | string; unit: string; label: string; portions: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-2 text-center">
      <div className={cn("font-bold text-base", color)}>{value}{unit && <span className="text-xs ml-0.5">{unit}</span>}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-[9px] text-muted-foreground/60">{portions} port</div>
    </div>
  );
}

/* ---------------------------- Shopping List ---------------------------- */
function ShoppingListSheet({ recipe, portions, onClose }: { recipe: Recipe; portions: number; onClose: () => void }) {
  const base = recipe.portions || 2;
  const scale = portions / base;
  const [checked, setChecked] = useState<boolean[]>((recipe.ingredients || []).map(() => false));
  const doneCount = checked.filter(Boolean).length;
  const pct = recipe.ingredients.length ? Math.round((doneCount / recipe.ingredients.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border-t border-border rounded-t-3xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-warning" />
            <h3 className="font-bold">Handlingslista</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">{recipe.name} · {portions} port.</p>
        <div className="flex items-center justify-between text-xs">
          <span>{doneCount} av {recipe.ingredients.length} införskaffade</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: pct + "%" }} />
        </div>
        <div className="space-y-2">
          {recipe.ingredients.map((i, idx) => {
            const g = Math.round(i.grams * scale);
            return (
              <button
                key={idx}
                onClick={() => { const n = [...checked]; n[idx] = !n[idx]; setChecked(n); }}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-2 text-left"
              >
                <span className={cn("h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0", checked[idx] ? "bg-accent border-accent" : "border-border")}>
                  {checked[idx] && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
                </span>
                <div className="flex-1">
                  <div className={cn("text-sm font-medium", checked[idx] && "line-through text-muted-foreground")}>{i.name}</div>
                  <div className="text-[10px] text-muted-foreground">{g}g · köp 1 ≈ {Math.max(100, Math.ceil(g / 100) * 100)}g</div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">1 st</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Recipe Modal ---------------------------- */
function RecipeModal({
  recipe, onClose, onSaved,
}: { recipe?: Recipe; onClose: () => void; onSaved: () => Promise<void> }) {
  const isEdit = !!recipe;
  const generate = useServerFn(generateRecipe);
  const generateImg = useServerFn(generateRecipeImage);
  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [mealType, setMealType] = useState(recipe?.meal_type || "Middag");
  const [proteinType, setProteinType] = useState(recipe?.protein_type || "Kyckling");
  const [portions, setPortions] = useState(recipe?.portions || 2);
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe?.ingredients || []);
  const [steps, setSteps] = useState<string[]>(recipe?.steps || []);
  const [imageUrl, setImageUrl] = useState<string | null>(recipe?.image_url ?? null);
  const [imagePath, setImagePath] = useState<string | null>(
    (recipe as unknown as { image_path?: string | null } | null)?.image_path ?? null,
  );
  const [imgLoading, setImgLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const totals = useMemo(() => sumMacros(ingredients), [ingredients]);

  const runGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    const stages = [
      "Funderar på smaker...",
      "Väljer ingredienser...",
      "Räknar makron...",
      "Skriver instruktioner...",
      "Finputsar receptet...",
    ];
    let s = 0;
    setProgressLabel(stages[0]);
    const iv = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8 + 2, 92));
      s = (s + 1) % stages.length;
      setProgressLabel(stages[s]);
    }, 700);
    try {
      const data = await generate({ data: { meal_type: mealType, protein_type: proteinType, portions } });
      const d = data as any;
      if (d.name) setName(d.name);
      if (d.description) setDescription(d.description);
      if (Array.isArray(d.ingredients)) setIngredients(d.ingredients);
      if (Array.isArray(d.steps)) setSteps(d.steps);
      setProgress(100);
      setProgressLabel("Klart!");
    } catch (e: any) {
      toast.error(e.message ?? "Genereringen misslyckades");
    } finally {
      clearInterval(iv);
      setTimeout(() => setGenerating(false), 400);
    }
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Ge receptet ett namn");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const totalsLocal = sumMacros(ingredients);
    const payload: any = {
      user_id: u.user.id,
      name, description: description || null,
      meal_type: mealType, protein_type: proteinType, protein_source: proteinType,
      portions,
      ingredients, steps,
      checked_steps: Array(steps.length).fill(false),
      image_url: imagePath ? null : imageUrl,
      image_path: imagePath,
      kcal: Math.round(totalsLocal.kcal / Math.max(1, portions)),
      protein_g: Math.round(totalsLocal.protein / Math.max(1, portions)),
      fat_g: Math.round(totalsLocal.fat / Math.max(1, portions)),
      carbs_g: Math.round(totalsLocal.carbs / Math.max(1, portions)),
    };
    const { error } = isEdit
      ? await supabase.from("recipes").update(payload).eq("id", recipe!.id)
      : await supabase.from("recipes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Recept uppdaterat" : "Recept sparat");
    onSaved();
  };

  const uploadImageBlob = async (blob: Blob, ext: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Inte inloggad");
    const path = `${u.user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("recipe-images").upload(path, blob, {
      contentType: blob.type || `image/${ext}`,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabase.storage
      .from("recipe-images")
      .createSignedUrl(path, 60 * 60);
    if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Kunde inte signera bild-URL");
    setImagePath(path);
    return signed.signedUrl;
  };

  const aiGenerateImage = async () => {
    if (!name.trim()) return toast.error("Ge receptet ett namn först");
    setImgLoading(true);
    try {
      const { b64_json } = await generateImg({
        data: {
          name,
          description: description || undefined,
          protein_type: proteinType || undefined,
          ingredients: ingredients.map((i) => i.name).filter(Boolean),
        },
      });
      const bin = atob(b64_json);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const url = await uploadImageBlob(blob, "png");
      setImageUrl(url);
      toast.success("Bild genererad!");
    } catch (e: any) {
      toast.error(e.message ?? "Kunde inte generera bild");
    } finally { setImgLoading(false); }
  };

  const onFilePick = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Välj en bildfil");
    if (file.size > 8 * 1024 * 1024) return toast.error("Bilden är för stor (max 8MB)");
    setImgLoading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const url = await uploadImageBlob(file, ext);
      setImageUrl(url);
      toast.success("Bild uppladdad");
    } catch (e: any) {
      toast.error(e.message ?? "Uppladdning misslyckades");
    } finally { setImgLoading(false); }
  };

  const removeRecipe = async () => {
    if (!recipe) return;
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) return toast.error(error.message);
    toast.success("Raderat");
    onSaved();
  };

  if (generating) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col items-center justify-center px-6">
        <h2 className="text-2xl font-bold text-primary">FitFlow</h2>
        <p className="text-sm text-muted-foreground mt-1">Ditt recept förbereds</p>
        <div className="my-8 relative">
          <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/40 flex items-center justify-center text-6xl animate-pulse">
            🧪
          </div>
          <div className="absolute -inset-4 bg-accent/20 blur-3xl rounded-full -z-10" />
        </div>
        <div className="rounded-full bg-accent/20 border border-accent/40 px-4 py-1 text-[10px] text-accent">
          {progressLabel}
        </div>
        <div className="flex gap-3 mt-6">
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
            <div className="text-sm font-bold">{mealType}</div>
            <div className="text-[10px] text-muted-foreground">Kategori</div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
            <div className="text-sm font-bold">{proteinType}</div>
            <div className="text-[10px] text-muted-foreground">Protein</div>
          </div>
        </div>
        <div className="w-full max-w-xs mt-8">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{progressLabel}</span>
            <span className="font-bold text-accent">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent/60 transition-all" style={{ width: progress + "%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold">{isEdit ? "Redigera recept" : "Nytt recept"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Receptnamn" className="rounded-xl bg-card border-border" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kort beskrivning (valfritt)" rows={2} className="rounded-xl bg-card border-border resize-none" />

          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : imgLoading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="text-xs">Förbereder bilden...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-50" />
                  <span className="text-xs">Ingen bild ännu</span>
                </div>
              )}
              {imageUrl && !imgLoading && (
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="Ta bort bild"
                ><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
            <div className="flex gap-2 p-2">
              <Button onClick={aiGenerateImage} disabled={imgLoading} variant="outline" className="flex-1 rounded-lg bg-accent/10 border-accent/40 hover:bg-accent/20 h-9">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs">Generera med AI</span>
              </Button>
              <label className={cn("flex-1 rounded-lg border border-border bg-card hover:bg-card/70 h-9 flex items-center justify-center gap-2 text-xs cursor-pointer", imgLoading && "opacity-50 pointer-events-none")}>
                <Upload className="h-3.5 w-3.5" />Ladda upp
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFilePick(f); e.currentTarget.value = ""; }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-2">
              <div className="text-[10px] text-muted-foreground px-1">Kategori</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealType(m)}
                    className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", mealType === m ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card text-muted-foreground")}
                  >{m}</button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-2 flex flex-col justify-center">
              <div className="text-[10px] text-muted-foreground px-1">Portioner</div>
              <div className="flex items-center justify-between mt-1">
                <button onClick={() => setPortions(Math.max(1, portions - 1))} className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="font-bold">{portions}</span>
                <button onClick={() => setPortions(portions + 1)} className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-base">🤖</span>Generera recept med FitFlow
            </div>
            <div className="flex flex-wrap gap-1">
              {PROTEIN_TYPES.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setProteinType(p.label)}
                  className={cn("px-2.5 py-1 rounded-full text-xs border", proteinType === p.label ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card text-muted-foreground")}
                >{p.label} {p.emoji}</button>
              ))}
            </div>
            <Button onClick={runGenerate} variant="outline" className="w-full rounded-xl bg-accent/10 border-accent/40 text-foreground hover:bg-accent/20">
              <Sparkles className="h-4 w-4 text-accent" />Generera recept med FitFlow
            </Button>
          </div>

          {ingredients.length > 0 && (
            <>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                  <Save className="h-4 w-4" />{isEdit ? "Spara ändringar" : "Spara receptet"}
                </Button>
                {isEdit && (
                  <ConfirmDeleteDialog
                    recipeName={recipe!.name}
                    onConfirm={removeRecipe}
                    trigger={
                      <Button variant="outline" className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
                        Radera
                      </Button>
                    }
                  />
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <TotalBoxSmall color="text-success" value={Math.round(totals.kcal)} label="Kcal totalt" />
                <TotalBoxSmall color="text-primary" value={Math.round(totals.protein) + "g"} label="Protein" />
                <TotalBoxSmall color="text-warning" value={Math.round(totals.fat) + "g"} label="Fett" />
                <TotalBoxSmall color="text-streak" value={Math.round(totals.carbs) + "g"} label="Kolh." />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Ingredienser</h4>
              <button
                onClick={() => setIngredients([...ingredients, { name: "", grams: 100, kcal_per_100: 0, protein_per_100: 0, fat_per_100: 0, carbs_per_100: 0 }])}
                className="text-xs text-accent flex items-center gap-1"
              ><Plus className="h-3 w-3" />Lägg till</button>
            </div>
            <div className="space-y-2">
              {ingredients.length === 0 ? (
                <button
                  onClick={() => setIngredients([{ name: "", grams: 100, kcal_per_100: 0, protein_per_100: 0, fat_per_100: 0, carbs_per_100: 0 }])}
                  className="w-full border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:bg-card/50"
                >+ Lägg till ingrediens</button>
              ) : (
                ingredients.map((ing, idx) => (
                  <IngredientRow
                    key={idx}
                    value={ing}
                    onChange={(v) => { const n = [...ingredients]; n[idx] = v; setIngredients(n); }}
                    onRemove={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">≡ Gör så här</h4>
            <Textarea
              value={steps.join("\n")}
              onChange={(e) => setSteps(e.target.value.split("\n").filter((s) => s.trim().length))}
              placeholder={"Skriv tillagningsinstruktioner...\n\nTips: Skriv ett steg per rad, t.ex:\n1. Förvärm ugnen till 200°C\n2. Krydda kycklingen..."}
              rows={6}
              className="rounded-xl bg-card border-border text-sm"
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sticky bottom-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Spara ändringar" : "Spara recept"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TotalBoxSmall({ color, value, label }: { color: string; value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-2 text-center">
      <div className={cn("font-bold", color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function IngredientRow({
  value, onChange, onRemove,
}: { value: Ingredient; onChange: (v: Ingredient) => void; onRemove: () => void }) {
  const lookup = useServerFn(lookupProduct);
  const [loading, setLoading] = useState(false);
  const total = {
    kcal: Math.round((value.kcal_per_100 * value.grams) / 100),
    protein: Math.round((value.protein_per_100 * value.grams) / 100),
    fat: Math.round((value.fat_per_100 * value.grams) / 100),
  };

  const autoFill = async () => {
    if (!value.name.trim()) return toast.error("Skriv ett ingrediensnamn först");
    setLoading(true);
    try {
      const data: any = await lookup({ data: { query: value.name } });
      if (data?.error) toast.error("Hittade inte livsmedlet");
      else onChange({
        ...value,
        kcal_per_100: Number(data.kcal) || 0,
        protein_per_100: Number(data.protein_g) || 0,
        fat_per_100: Number(data.fat_g) || 0,
        carbs_per_100: Number(data.carbs_g) || 0,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Kunde inte hämta");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-2 space-y-2">
      <div className="flex gap-2 items-center">
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ingrediens" className="flex-1 h-9 rounded-lg bg-card border-border" />
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2">
          <Input
            type="number"
            value={value.grams || ""}
            onChange={(e) => onChange({ ...value, grams: Number(e.target.value) })}
            className="w-14 h-8 border-0 bg-transparent px-0 text-right"
          />
          <span className="text-xs text-muted-foreground">g</span>
        </div>
        <button onClick={autoFill} disabled={loading} className="h-8 w-8 rounded-lg bg-accent/20 border border-accent/40 text-accent flex items-center justify-center" aria-label="AI-fyll">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        </button>
        <button onClick={onRemove} className="h-8 w-8 rounded-lg border border-border text-muted-foreground flex items-center justify-center" aria-label="Ta bort">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {([
          ["Kcal/100g", "kcal_per_100"],
          ["Prot/100g", "protein_per_100"],
          ["Fett/100g", "fat_per_100"],
          ["Kolh/100g", "carbs_per_100"],
        ] as const).map(([label, key]) => (
          <div key={key} className="rounded-lg border border-border bg-card px-1.5 py-1">
            <div className="text-[9px] text-muted-foreground">{label}</div>
            <Input
              type="number"
              value={(value as any)[key] || ""}
              onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) } as Ingredient)}
              className="h-6 border-0 bg-transparent p-0 text-xs"
            />
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground">
        → {total.kcal} kcal · {total.protein}g protein · {total.fat}g fett
      </div>
    </div>
  );
}

/* ----------------------------- Share Dialog ---------------------------- */
function ShareRecipeDialog({ recipe, trigger }: { recipe: Recipe; trigger: React.ReactNode }) {
  const share = useServerFn(shareRecipe);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(new Set());
    setLoading(true);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted");
      const ids = (fs ?? []).map((f: any) => f.requester_id === u.user!.id ? f.addressee_id : f.requester_id);
      if (ids.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: ids });
        setFriends((profs ?? []) as any);
      } else {
        setFriends([]);
      }
      setLoading(false);
    })();
  }, [open]);

  const toggle = (id: string) => {
    const n = new Set(picked);
    n.has(id) ? n.delete(id) : n.add(id);
    setPicked(n);
  };

  const send = async () => {
    if (picked.size === 0) return;
    setSending(true);
    try {
      await share({ data: { recipe_id: recipe.id, to_user_ids: Array.from(picked) } });
      toast.success(`Receptet delades med ${picked.size} ${picked.size === 1 ? "vän" : "vänner"}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Kunde inte dela");
    } finally { setSending(false); }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-accent" />
                <h3 className="font-bold">Dela receptet</h3>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Välj vilka vänner som ska få <span className="font-semibold text-foreground">{recipe.name}</span></p>

              {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
              ) : friends.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                  <Users className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Inga vänner ännu</p>
                  <p className="text-xs text-muted-foreground">Gå till Profil → Vänner för att hitta vänner att dela recept med.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => {
                    const on = picked.has(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggle(f.id)}
                        className={cn("w-full flex items-center gap-3 rounded-xl border p-3 transition-colors", on ? "border-accent bg-accent/10" : "border-border bg-card")}
                      >
                        {f.avatar_url ? (
                          <img src={f.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                            {(f.display_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1 text-left text-sm font-medium truncate">{f.display_name ?? "Användare"}</span>
                        <span className={cn("h-5 w-5 rounded-md border flex items-center justify-center", on ? "bg-accent border-accent" : "border-border")}>
                          {on && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {friends.length > 0 && (
                <Button onClick={send} disabled={picked.size === 0 || sending} className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Dela med {picked.size || 0} {picked.size === 1 ? "vän" : "vänner"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
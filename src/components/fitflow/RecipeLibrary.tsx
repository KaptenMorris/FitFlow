import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, X, Clock, Heart, Plus, Minus, Check, Flame, Loader2, Sparkles,
  ChefHat, BookmarkCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ensureRecipeImage, signRecipeImages } from "@/lib/recipes.functions";
import breakfastVegetarianImage from "@/assets/recipes/breakfast-vegetarian.jpg";
import lunchChickenImage from "@/assets/recipes/lunch-chicken.jpg";
import dinnerFishImage from "@/assets/recipes/dinner-fish.jpg";
import dinnerBeefImage from "@/assets/recipes/dinner-beef.jpg";
import lunchVegetarianImage from "@/assets/recipes/lunch-vegetarian.jpg";
import snackImage from "@/assets/recipes/snack.jpg";

type Ing = {
  name: string; grams: number;
  kcal_per_100: number; protein_per_100: number;
  fat_per_100: number; carbs_per_100: number;
};
export type LibraryRecipe = {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  protein_type: string | null;
  category: string | null;
  cook_time_min: number | null;
  portions: number;
  ingredients: Ing[];
  steps: string[];
  image_url: string | null;
  image_emoji: string | null;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  is_public?: boolean;
  user_id?: string | null;
};

const CATEGORIES = [
  { key: "Alla", icon: "✨" },
  { key: "Frukost", icon: "🌅" },
  { key: "Lunch", icon: "🥗" },
  { key: "Middag", icon: "🍽️" },
  { key: "Mellanmål", icon: "🍎" },
  { key: "High Protein", icon: "💪" },
  { key: "Vegetarisk", icon: "🥬" },
];
const MEALS = ["Frukost", "Lunch", "Middag", "Mellanmål"];

const LOCAL_RECIPE_IMAGES = {
  breakfastVegetarian: breakfastVegetarianImage,
  lunchChicken: lunchChickenImage,
  dinnerFish: dinnerFishImage,
  dinnerBeef: dinnerBeefImage,
  lunchVegetarian: lunchVegetarianImage,
  snack: snackImage,
} as const;

/** Visar rätt matbild direkt med lokal fallback baserad på måltid + proteinkälla. */
export function recipeImageUrl(r: { id: string; image_url: string | null; protein_type: string | null; meal_type: string | null; }) {
  if (r.image_url) return r.image_url;

  const protein = (r.protein_type ?? "").toLowerCase().trim();
  const meal = (r.meal_type ?? "").toLowerCase().trim();

  if (meal === "frukost") return LOCAL_RECIPE_IMAGES.breakfastVegetarian;
  if (meal === "mellanmål") return LOCAL_RECIPE_IMAGES.snack;
  if (protein.includes("fisk") || protein.includes("lax") || protein.includes("torsk") || protein.includes("tonfisk")) {
    return LOCAL_RECIPE_IMAGES.dinnerFish;
  }
  if (protein.includes("kyckling") || protein.includes("kalkon")) return LOCAL_RECIPE_IMAGES.lunchChicken;
  if (protein.includes("kött") || protein.includes("nöt") || protein.includes("biff") || protein.includes("fläsk") || protein.includes("lamm")) {
    return LOCAL_RECIPE_IMAGES.dinnerBeef;
  }
  if (protein.includes("veget") || protein.includes("vegan") || protein.includes("tofu") || protein.includes("balj")) {
    return LOCAL_RECIPE_IMAGES.lunchVegetarian;
  }
  if (meal === "lunch") return LOCAL_RECIPE_IMAGES.lunchChicken;
  if (meal === "middag") return LOCAL_RECIPE_IMAGES.dinnerBeef;

  return LOCAL_RECIPE_IMAGES.lunchVegetarian;
}

function totalsPerPortion(r: LibraryRecipe) {
  if (r.kcal != null) {
    return {
      kcal: r.kcal ?? 0,
      protein: r.protein_g ?? 0,
      fat: r.fat_g ?? 0,
      carbs: r.carbs_g ?? 0,
    };
  }
  const port = Math.max(1, r.portions);
  const sum = (r.ingredients || []).reduce(
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
  return {
    kcal: sum.kcal / port,
    protein: sum.protein / port,
    fat: sum.fat / port,
    carbs: sum.carbs / port,
  };
}

function matchCategory(r: LibraryRecipe, cat: string) {
  if (cat === "Alla") return true;
  if (cat === "High Protein") {
    const p = totalsPerPortion(r).protein;
    return r.category === "High Protein" || p >= 30;
  }
  if (cat === "Vegetarisk") {
    return r.category === "Vegetarisk" || (r.protein_type ?? "").toLowerCase() === "vegetarisk";
  }
  return r.category === cat || r.meal_type === cat;
}

export function RecipeLibrary({ mode }: { mode: "discover" | "saved" }) {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState("Alla");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ensureImg = useServerFn(ensureRecipeImage);
  const signImages = useServerFn(signRecipeImages);

  const refresh = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;

    const favQ = uid
      ? await supabase.from("recipe_favorites" as never).select("recipe_id").eq("user_id", uid)
      : { data: [] as Array<{ recipe_id: string }> };
    const favIds = new Set<string>(((favQ.data as Array<{ recipe_id: string }>) || []).map((r) => r.recipe_id));
    setFavorites(favIds);

    if (mode === "discover") {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_public", true)
        .order("name", { ascending: true });
      const list = ((data as unknown) as LibraryRecipe[]) || [];
      setRecipes(list);
      void signLoaded(list);
    } else {
      if (!favIds.size) {
        setRecipes([]);
      } else {
        const { data } = await supabase
          .from("recipes")
          .select("*")
          .in("id", Array.from(favIds));
        const list = ((data as unknown) as LibraryRecipe[]) || [];
        setRecipes(list);
        void signLoaded(list);
      }
    }
    setLoading(false);
  };

  const signLoaded = async (list: LibraryRecipe[]) => {
    const ids = list
      .filter((r) => !r.image_url && (r as unknown as { image_path?: string | null }).image_path)
      .map((r) => r.id);
    if (!ids.length) return;
    try {
      const { urls } = await signImages({ data: { recipeIds: ids } });
      setRecipes((prev) => prev.map((r) => (urls[r.id] ? { ...r, image_url: urls[r.id] } : r)));
    } catch { /* ignore */ }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [mode]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (!matchCategory(r, cat)) return false;
      if (!term) return true;
      if (r.name.toLowerCase().includes(term)) return true;
      if ((r.description ?? "").toLowerCase().includes(term)) return true;
      return (r.ingredients || []).some((i) => i.name.toLowerCase().includes(term));
    });
  }, [recipes, cat, q]);

  const toggleFav = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const isFav = favorites.has(id);
    const next = new Set(favorites);
    if (isFav) {
      next.delete(id);
      await supabase.from("recipe_favorites" as never).delete().match({ user_id: u.user.id, recipe_id: id });
      toast.success("Borttagen från sparade");
    } else {
      next.add(id);
      await supabase.from("recipe_favorites" as never).insert({ user_id: u.user.id, recipe_id: id } as never);
      toast.success("Sparad i Mina recept ❤");
    }
    setFavorites(next);
    if (mode === "saved") refresh();
  };

  const open = recipes.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 rounded-xl border bg-card px-3 transition-colors", q ? "border-accent" : "border-border")}>
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök på recept eller ingrediens..."
          className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Rensa">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={cn(
              "shrink-0 px-3 h-9 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5",
              cat === c.key
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
            )}
          >
            <span>{c.icon}</span>{c.key}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Laddar recept...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          {mode === "saved" ? (
            <>
              <BookmarkCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-2">Inga sparade recept ännu.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tryck på hjärtat i Upptäck för att spara.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Inga recept matchade din sökning.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <RecipeTile
              key={r.id}
              recipe={r}
              favorite={favorites.has(r.id)}
              onFav={() => toggleFav(r.id)}
              onOpen={() => setOpenId(r.id)}
            />
          ))}
        </div>
      )}

      {open && (
        <RecipeDetailDialog
          recipe={open}
          favorite={favorites.has(open.id)}
          onFav={() => toggleFav(open.id)}
          onClose={() => setOpenId(null)}
          onImage={(url) =>
            setRecipes((rs) => rs.map((r) => (r.id === open.id ? { ...r, image_url: url } : r)))
          }
        />
      )}
    </div>
  );
}

function RecipeTile({
  recipe, favorite, onFav, onOpen,
}: { recipe: LibraryRecipe; favorite: boolean; onFav: () => void; onOpen: () => void }) {
  const p = totalsPerPortion(recipe);
  const img = recipeImageUrl(recipe);
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/60 transition-colors"
    >
      <div className="relative h-28 bg-gradient-to-br from-accent/20 via-card to-card flex items-center justify-center">
        <img
          src={img}
          alt={recipe.name}
          loading="lazy"
          width={1024}
          height={768}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.currentTarget;
            t.onerror = null;
            t.src = LOCAL_RECIPE_IMAGES.lunchVegetarian;
          }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          className={cn(
            "absolute top-2 right-2 h-8 w-8 rounded-full backdrop-blur flex items-center justify-center transition-colors",
            favorite ? "bg-destructive/90 text-white" : "bg-black/40 text-white/90 hover:bg-black/60",
          )}
          aria-label="Spara"
        >
          <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        </button>
        {recipe.category && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/55 text-white">
            {recipe.category}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{recipe.name}</h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {recipe.cook_time_min != null && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cook_time_min} min</span>
          )}
          <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-success" />{Math.round(p.kcal)} kcal</span>
        </div>
        <div className="flex gap-2 text-[11px] font-semibold pt-0.5">
          <span className="text-primary">{Math.round(p.protein)}g P</span>
          <span className="text-warning">{Math.round(p.fat)}g F</span>
          <span className="text-streak">{Math.round(p.carbs)}g K</span>
        </div>
      </div>
    </button>
  );
}

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{Math.round(value)}g</span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function RecipeDetailDialog({
  recipe, favorite, onFav, onClose, onImage,
}: { recipe: LibraryRecipe; favorite: boolean; onFav: () => void; onClose: () => void; onImage?: (url: string) => void }) {
  const [servings, setServings] = useState(recipe.portions || 1);
  const [checked, setChecked] = useState<boolean[]>((recipe.ingredients || []).map(() => false));
  const [logOpen, setLogOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(recipe.image_url ?? recipeImageUrl(recipe));
  const [imgLoading, setImgLoading] = useState(false);
  const ensureImg = useServerFn(ensureRecipeImage);

  const generate = async (force = false) => {
    setImgLoading(true);
    try {
      const r = await ensureImg({ data: { recipeId: recipe.id, force } });
      if (r.image_url) {
        setImgUrl(r.image_url);
        onImage?.(r.image_url);
      } else if (r.error === "NO_CREDITS") toast.error("AI-krediter slut – lägg till krediter i arbetsytan.");
      else if (r.error === "RATE_LIMIT") toast.error("För många bildförfrågningar – prova snart igen.");
      else if (r.error) toast.error("Kunde inte skapa bild just nu.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("NO_CREDITS")) toast.error("AI-krediter slut – lägg till krediter i arbetsytan.");
      else if (msg.includes("RATE_LIMIT")) toast.error("För många bildförfrågningar – prova snart igen.");
      else toast.error("Kunde inte skapa bild just nu.");
    } finally {
      setImgLoading(false);
    }
  };

  const base = Math.max(1, recipe.portions || 1);
  const scale = servings / base;
  const per = totalsPerPortion(recipe);
  const total = {
    kcal: per.kcal * servings,
    protein: per.protein * servings,
    fat: per.fat * servings,
    carbs: per.carbs * servings,
  };
  // Pie chart values (grams of macros, scaled to calories for visual share)
  const pPCal = total.protein * 4;
  const fCal = total.fat * 9;
  const cCal = total.carbs * 4;
  const sumCal = Math.max(1, pPCal + fCal + cCal);
  const seg = {
    p: (pPCal / sumCal) * 100,
    f: (fCal / sumCal) * 100,
    c: (cCal / sumCal) * 100,
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-border bg-card max-h-[92vh] overflow-y-auto">
        <div className="relative h-44 bg-gradient-to-br from-accent/30 via-primary/20 to-card flex items-center justify-center">
          {imgUrl ? (
            <img src={imgUrl} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl">{recipe.image_emoji ?? "🍽️"}</span>
          )}
          {imgLoading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-semibold">Skapar bild av rätten...</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {imgUrl && !imgLoading && (
            <button
              onClick={() => generate(true)}
              className="absolute bottom-3 right-3 h-8 px-3 rounded-full bg-black/55 backdrop-blur text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-black/75"
              aria-label="Generera om bild"
            >
              <Sparkles className="h-3 w-3" /> Generera om
            </button>
          )}
          <button
            onClick={onFav}
            className={cn(
              "absolute top-3 right-3 h-9 w-9 rounded-full backdrop-blur flex items-center justify-center transition-colors",
              favorite ? "bg-destructive/90 text-white" : "bg-black/40 text-white/90 hover:bg-black/60",
            )}
            aria-label="Spara recept"
          >
            <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
          </button>
          <button
            onClick={onClose}
            className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60"
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 -mt-6 relative space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl leading-tight">{recipe.name}</DialogTitle>
            {recipe.description && (
              <p className="text-xs text-muted-foreground">{recipe.description}</p>
            )}
          </DialogHeader>

          <div className="flex items-center gap-3 text-xs">
            {recipe.cook_time_min != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border">
                <Clock className="h-3 w-3" />{recipe.cook_time_min} min
              </span>
            )}
            {recipe.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">
                <ChefHat className="h-3 w-3" />{recipe.category}
              </span>
            )}
          </div>

          {/* Servings selector */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3">
            <div>
              <div className="text-sm font-semibold">Portioner</div>
              <div className="text-[11px] text-muted-foreground">Skalar mängderna automatiskt</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center"
              ><Minus className="h-3.5 w-3.5" /></button>
              <span className="font-bold text-lg w-6 text-center">{servings}</span>
              <button
                onClick={() => setServings(servings + 1)}
                className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
              ><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Macro overview with pie + bars */}
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-4">
              <div
                className="h-20 w-20 rounded-full flex-shrink-0"
                style={{
                  background: `conic-gradient(var(--primary) 0 ${seg.p}%, var(--warning) ${seg.p}% ${seg.p + seg.f}%, var(--streak) ${seg.p + seg.f}% 100%)`,
                }}
              >
                <div className="h-full w-full rounded-full bg-card flex flex-col items-center justify-center scale-[0.72]">
                  <span className="text-base font-bold text-success leading-none">{Math.round(total.kcal)}</span>
                  <span className="text-[9px] text-muted-foreground">kcal</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <MacroBar label="Protein" value={total.protein} max={Math.max(50, total.protein)} color="bg-primary" />
                <MacroBar label="Fett" value={total.fat} max={Math.max(50, total.fat)} color="bg-warning" />
                <MacroBar label="Kolhydrater" value={total.carbs} max={Math.max(100, total.carbs)} color="bg-streak" />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 text-right">
              Totalt för {servings} port. ({Math.round(per.kcal)} kcal / port)
            </div>
          </div>

          {/* Log to meal tracker */}
          {!logOpen ? (
            <Button
              onClick={() => setLogOpen(true)}
              className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
            >
              <Plus className="h-4 w-4" />Logga i kostdagbok
            </Button>
          ) : (
            <LogMealPicker
              recipe={recipe}
              servings={servings}
              total={total}
              onDone={() => { setLogOpen(false); }}
              onCancel={() => setLogOpen(false)}
            />
          )}

          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-2">Ingredienser</h4>
              <div className="space-y-1">
                {recipe.ingredients.map((i, idx) => {
                  const g = Math.round((i.grams || 0) * scale);
                  return (
                    <button
                      key={idx}
                      onClick={() => { const n = [...checked]; n[idx] = !n[idx]; setChecked(n); }}
                      className="w-full flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2 text-left"
                    >
                      <span className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
                        checked[idx] ? "bg-accent border-accent" : "border-border",
                      )}>
                        {checked[idx] && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
                      </span>
                      <span className={cn("flex-1 text-sm", checked[idx] && "line-through text-muted-foreground")}>
                        {i.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">{g}g</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Steps */}
          {recipe.steps?.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-2">Gör så här</h4>
              <ol className="space-y-2">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm rounded-lg border border-border bg-card/40 px-3 py-2">
                    <span className="h-6 w-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="text-xs leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogMealPicker({
  recipe, servings, total, onDone, onCancel,
}: {
  recipe: LibraryRecipe;
  servings: number;
  total: { kcal: number; protein: number; fat: number; carbs: number };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [meal, setMeal] = useState<string>(recipe.meal_type || "Lunch");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("meal_log_entries" as never).insert({
      user_id: u.user.id,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      meal_type: meal,
      servings,
      kcal: Math.round(total.kcal),
      protein_g: Math.round(total.protein),
      fat_g: Math.round(total.fat),
      carbs_g: Math.round(total.carbs),
    } as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(`Loggat som ${meal.toLowerCase()}`); onDone(); }
  };

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 space-y-3">
      <div>
        <div className="text-xs font-semibold mb-2">Logga som måltid</div>
        <div className="grid grid-cols-4 gap-1.5">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={cn(
                "text-[11px] font-semibold py-2 rounded-lg border transition-colors",
                meal === m
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >{m}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1 rounded-xl">Avbryt</Button>
        <Button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Logga
        </Button>
      </div>
    </div>
  );
}
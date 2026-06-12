# Nutrition & Coaching-modul (MacroFactor-inspirerad)

Bygger en ny modul som ersätter dagens enkla `kaloridagbok` med ett komplett, adherence-neutralt coaching-system. Webb-baserad (TanStack Start) men designad mobile-first med PWA-känsla (bottom sheets, swipe-to-delete, mjuka transitions).

## 1. Databas (Lovable Cloud)

Nya tabeller (alla med RLS scopade till `auth.uid()`):

- **`mf_nutrition_profile`** — en rad per user. Mål (`bulk` | `cut` | `maintain`), goal_rate_pct_per_week, program_mode (`coached` | `collaborative` | `manual`), diet_style (`balanced` | `low_carb` | `keto` | `high_carb`), aktuella targets (kcal, p, c, f), `expenditure_estimate`, `last_checkin_at`, starting/goal weight.
- **`mf_day_targets`** — per-dag override (custom days, t.ex. högre kolhydrater på träningsdagar).
- **`mf_weight_entries`** — `date`, `weight_kg`, beräknad `trend_kg` (EMA), source.
- **`mf_foods`** — verifierad mat (10+ seed-items): namn, brand, serving, kcal + makros + nyckel-mikros (fiber, socker, mättat fett, natrium, kalcium, järn, C/D-vitamin).
- **`mf_food_log`** — `date`, `meal` (breakfast/lunch/dinner/snack), `food_id` (nullable), `servings`, snapshot av kcal/makros/mikros, `is_quick_add`, `source`.
- **`mf_recipes`** + **`mf_recipe_items`** — recept-builder.
- **`mf_checkins`** — veckovisa coachning-justeringar: estimerad TDEE, ny target, anledning.

Återanvänder befintliga `profiles.current_weight_kg/height_cm/birth_date/gender`.

## 2. Algoritmer (`src/lib/macrofactor/`)

- `weightTrend.ts` — EMA-smoothing (alpha ~0.10). Returnerar `trend_kg[]` per dag.
- `expenditure.ts` — Dynamisk TDEE:
  `kcalOut = kcalIn - (Δstored_kg × 7700)` över rullande 14-dagars fönster, viktat mot data-täthet. Fallback till Mifflin-St Jeor vid <7 dagars data.
- `goalEta.ts` — räknar dagar till mål givet trend och target-deficit/surplus.
- `coaching.ts` — veckovis check-in: jämför trend-rate vs mål-rate, justerar kcal-target ±50–250 kcal. Adherence-neutral (använder faktisk intake, inga "straff").
- `macroDistribution.ts` — fördelar makros utifrån diet_style + protein-floor (1.8 g/kg).

## 3. Server functions (`src/lib/macrofactor.functions.ts`)

`getNutritionState`, `upsertProfile`, `logWeight`, `logFood`, `deleteFoodEntry`, `quickAdd`, `copyDay`, `searchFoods`, `runWeeklyCheckin`, `getAnalytics` (returnerar trend-arrays för charts).

## 4. Rutter & UI

Lägger till bottom-tab "Nutrition" (ersätter inte befintliga tabs — lägger som ny). Submodulen har egna sektioner:

- `/_authenticated/nutrition` — **Dashboard**: dagens makro-ringar, kvar att äta, meal-timeline, swipe-to-delete entries, quick add-FAB.
- `/_authenticated/nutrition/log` — **Logger**: sticky search, smart history, kategorier, recept-tab, placeholder-knappar för Foto-AI / Barcode / URL-import, bottom sheet för servings/meal.
- `/_authenticated/nutrition/analytics` — **Insights**: Expenditure-graf (Recharts), True Weight-graf (scatter + linje), makro/mikro-breakdowns, Top Contributors.
- `/_authenticated/nutrition/coaching` — **Strategy**: mål, rate-slider, ETA, program mode, diet style, custom days, veckovis check-in CTA + historik.
- `/_authenticated/nutrition/onboarding` — guidad setup (5 steg).

Komponenter (`src/components/nutrition/`): `MacroRing`, `MealSection`, `FoodRow` (med swipe), `QuickAddSheet`, `WeightTrendChart`, `ExpenditureChart`, `MacroBars`, `MicroGrid`, `TopContributors`, `CheckinCard`, `GoalRateSlider`.

## 5. Design

- Dark-mode-först premium-look som matchar nuvarande FitFlows-tokens.
- Lägger till tokens i `src/styles.css` för makrofärger (protein/carbs/fat/kcal) + `--gradient-coach`.
- Framer-motion på: makro-ring fill, swipe-delete, check-in-firande, bottom-sheets.
- Inga sociala feeds, inga ads.

## 6. Leveransordning (i denna agent-loop)

1. Migration för alla `mf_*`-tabeller + seed-mat (insert efter approval).
2. Algoritm-modulen + server functions.
3. Komponenter + 5 rutter + bottom-tab-uppdatering.
4. PWA-känsla: bottom sheets via shadcn `Drawer`, swipe via framer-motion `drag`.

Detta är ett stort bygge — jag kör allt i ett svep efter att migrationen godkänts.

## Tekniska detaljer

- TanStack Query för all dataläsning (`ensureQueryData` i loader, `useSuspenseQuery` i komponent).
- All server-logik via `createServerFn` + `requireSupabaseAuth`. Inga edge functions.
- Algoritmerna är pure-functions, testbara och körs både server-side (vid check-in) och client-side (live preview).
- Befintlig `kaloridagbok.tsx` behålls men länkar till nya `/nutrition`.
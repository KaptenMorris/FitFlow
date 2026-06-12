
-- 1. Extend recipes table
ALTER TABLE public.recipes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cook_time_min integer;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_emoji text;

-- Allow signed-in users to view public recipes
DROP POLICY IF EXISTS "view public recipes" ON public.recipes;
CREATE POLICY "view public recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (is_public = true);

-- 2. Favorites
CREATE TABLE IF NOT EXISTS public.recipe_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_favorites TO authenticated;
GRANT ALL ON public.recipe_favorites TO service_role;
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites all" ON public.recipe_favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Meal log entries
CREATE TABLE IF NOT EXISTS public.meal_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid,
  recipe_name text NOT NULL,
  meal_type text NOT NULL,
  logged_date date NOT NULL DEFAULT (now()::date),
  servings numeric NOT NULL DEFAULT 1,
  kcal integer,
  protein_g integer,
  fat_g integer,
  carbs_g integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meal_log_user_date_idx ON public.meal_log_entries(user_id, logged_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_log_entries TO authenticated;
GRANT ALL ON public.meal_log_entries TO service_role;
ALTER TABLE public.meal_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal log all" ON public.meal_log_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Seed curated public recipes
INSERT INTO public.recipes
  (user_id, name, description, meal_type, protein_type, portions, ingredients, steps, kcal, protein_g, fat_g, carbs_g, cook_time_min, category, is_public, image_emoji)
VALUES
  (NULL, 'Proteinfyllda havregryn med bär', 'Krämig havregrynsgröt toppad med kvarg, bär och mandel.', 'Frukost', 'Vegetarisk', 1,
   '[{"name":"Havregryn","grams":60,"kcal_per_100":370,"protein_per_100":13,"fat_per_100":7,"carbs_per_100":60},{"name":"Mjölk","grams":250,"kcal_per_100":47,"protein_per_100":3.4,"fat_per_100":1.5,"carbs_per_100":4.8},{"name":"Kvarg","grams":150,"kcal_per_100":59,"protein_per_100":11,"fat_per_100":0.2,"carbs_per_100":3.6},{"name":"Blåbär","grams":80,"kcal_per_100":57,"protein_per_100":0.7,"fat_per_100":0.3,"carbs_per_100":14},{"name":"Mandel","grams":15,"kcal_per_100":579,"protein_per_100":21,"fat_per_100":50,"carbs_per_100":22}]'::jsonb,
   '["Koka havregryn med mjölk i 4–5 min under omrörning.","Häll upp i en skål.","Toppa med kvarg, blåbär och hackad mandel.","Servera direkt."]'::jsonb,
   520, 36, 18, 58, 10, 'Frukost', true, '🥣'),

  (NULL, 'Äggröra med avokado och fullkornsbröd', 'Klassisk frukost med extra protein och bra fetter.', 'Frukost', 'Vegetarisk', 1,
   '[{"name":"Ägg","grams":150,"kcal_per_100":143,"protein_per_100":13,"fat_per_100":10,"carbs_per_100":1},{"name":"Avokado","grams":80,"kcal_per_100":160,"protein_per_100":2,"fat_per_100":15,"carbs_per_100":9},{"name":"Fullkornsbröd","grams":60,"kcal_per_100":250,"protein_per_100":10,"fat_per_100":4,"carbs_per_100":42},{"name":"Smör","grams":5,"kcal_per_100":717,"protein_per_100":0.9,"fat_per_100":81,"carbs_per_100":0.1}]'::jsonb,
   '["Smält smör i en panna på medelvärme.","Vispa äggen lätt och häll i pannan.","Rör om tills äggen är krämiga.","Rosta brödet och toppa med avokado.","Servera äggröran bredvid."]'::jsonb,
   560, 28, 35, 38, 12, 'Frukost', true, '🍳'),

  (NULL, 'Krämig proteinsmoothie', 'Snabb och proteinrik smoothie för efter passet.', 'Mellanmål', 'Vegetarisk', 1,
   '[{"name":"Banan","grams":120,"kcal_per_100":89,"protein_per_100":1.1,"fat_per_100":0.3,"carbs_per_100":23},{"name":"Vassleprotein","grams":30,"kcal_per_100":400,"protein_per_100":80,"fat_per_100":7,"carbs_per_100":8},{"name":"Mjölk","grams":300,"kcal_per_100":47,"protein_per_100":3.4,"fat_per_100":1.5,"carbs_per_100":4.8},{"name":"Jordnötssmör","grams":15,"kcal_per_100":588,"protein_per_100":25,"fat_per_100":50,"carbs_per_100":20}]'::jsonb,
   '["Häll alla ingredienser i en mixer.","Mixa i 30 sekunder tills slätt.","Häll upp i ett glas och drick direkt."]'::jsonb,
   470, 39, 13, 50, 5, 'Mellanmål', true, '🥤'),

  (NULL, 'Grillad kycklingbowl med quinoa', 'Mättande lunchbowl med saftig kyckling och färska grönsaker.', 'Lunch', 'Kyckling', 2,
   '[{"name":"Kycklingfilé","grams":300,"kcal_per_100":110,"protein_per_100":23,"fat_per_100":1.5,"carbs_per_100":0},{"name":"Quinoa kokt","grams":300,"kcal_per_100":120,"protein_per_100":4.4,"fat_per_100":1.9,"carbs_per_100":21},{"name":"Cherrytomater","grams":150,"kcal_per_100":18,"protein_per_100":0.9,"fat_per_100":0.2,"carbs_per_100":3.9},{"name":"Gurka","grams":100,"kcal_per_100":16,"protein_per_100":0.7,"fat_per_100":0.1,"carbs_per_100":3.6},{"name":"Fetaost","grams":60,"kcal_per_100":264,"protein_per_100":14,"fat_per_100":21,"carbs_per_100":4},{"name":"Olivolja","grams":15,"kcal_per_100":884,"protein_per_100":0,"fat_per_100":100,"carbs_per_100":0}]'::jsonb,
   '["Krydda kycklingen med salt, peppar och paprikapulver.","Grilla kycklingen 5–6 min per sida tills genomstekt.","Skär kyckling, gurka och tomater.","Lägg quinoa i botten av en skål.","Toppa med kyckling, grönsaker och fetaost.","Ringla över olivolja."]'::jsonb,
   620, 45, 22, 50, 25, 'Lunch', true, '🥗'),

  (NULL, 'Lax med ugnsbakad sötpotatis', 'Omega-3 rik middag med långsamma kolhydrater.', 'Middag', 'Fisk', 2,
   '[{"name":"Laxfilé","grams":300,"kcal_per_100":208,"protein_per_100":20,"fat_per_100":13,"carbs_per_100":0},{"name":"Sötpotatis","grams":400,"kcal_per_100":86,"protein_per_100":1.6,"fat_per_100":0.1,"carbs_per_100":20},{"name":"Broccoli","grams":250,"kcal_per_100":34,"protein_per_100":2.8,"fat_per_100":0.4,"carbs_per_100":7},{"name":"Olivolja","grams":20,"kcal_per_100":884,"protein_per_100":0,"fat_per_100":100,"carbs_per_100":0},{"name":"Citron","grams":30,"kcal_per_100":29,"protein_per_100":1.1,"fat_per_100":0.3,"carbs_per_100":9}]'::jsonb,
   '["Sätt ugnen på 200°C.","Skala och tärna sötpotatisen, ringla olja och rosta 25 min.","Krydda laxen och lägg in de sista 12 minuterna.","Ångkoka broccolin i 5 min.","Servera laxen med sötpotatis, broccoli och citronklyfta."]'::jsonb,
   640, 38, 28, 58, 35, 'Middag', true, '🐟'),

  (NULL, 'Köttfärspasta med tomatsås', 'Klassisk familjefavorit med extra protein.', 'Middag', 'Kött', 4,
   '[{"name":"Nötfärs","grams":500,"kcal_per_100":250,"protein_per_100":26,"fat_per_100":17,"carbs_per_100":0},{"name":"Pasta torr","grams":320,"kcal_per_100":371,"protein_per_100":13,"fat_per_100":1.5,"carbs_per_100":75},{"name":"Krossade tomater","grams":400,"kcal_per_100":32,"protein_per_100":1.6,"fat_per_100":0.3,"carbs_per_100":7},{"name":"Lök","grams":150,"kcal_per_100":40,"protein_per_100":1.1,"fat_per_100":0.1,"carbs_per_100":9},{"name":"Vitlök","grams":15,"kcal_per_100":149,"protein_per_100":6.4,"fat_per_100":0.5,"carbs_per_100":33},{"name":"Olivolja","grams":20,"kcal_per_100":884,"protein_per_100":0,"fat_per_100":100,"carbs_per_100":0}]'::jsonb,
   '["Hacka lök och vitlök, fräs i olja.","Tillsätt nötfärsen och stek tills genomstekt.","Häll i krossade tomater och låt sjuda 10 min.","Koka pastan al dente.","Smaka av såsen med salt, peppar och oregano.","Servera pastan med såsen ovanpå."]'::jsonb,
   680, 38, 22, 78, 30, 'Middag', true, '🍝'),

  (NULL, 'Vegetarisk linsgryta', 'Mättande och proteinrik utan kött.', 'Middag', 'Vegetarisk', 3,
   '[{"name":"Röda linser","grams":300,"kcal_per_100":352,"protein_per_100":24,"fat_per_100":1,"carbs_per_100":63},{"name":"Krossade tomater","grams":400,"kcal_per_100":32,"protein_per_100":1.6,"fat_per_100":0.3,"carbs_per_100":7},{"name":"Kokosmjölk","grams":200,"kcal_per_100":230,"protein_per_100":2.3,"fat_per_100":24,"carbs_per_100":3},{"name":"Lök","grams":150,"kcal_per_100":40,"protein_per_100":1.1,"fat_per_100":0.1,"carbs_per_100":9},{"name":"Vitlök","grams":10,"kcal_per_100":149,"protein_per_100":6.4,"fat_per_100":0.5,"carbs_per_100":33},{"name":"Spenat","grams":150,"kcal_per_100":23,"protein_per_100":2.9,"fat_per_100":0.4,"carbs_per_100":3.6}]'::jsonb,
   '["Fräs hackad lök och vitlök i olja.","Tillsätt curry och tomater, koka upp.","Häll i sköljda linser och kokosmjölk.","Låt sjuda 15 min tills linserna är mjuka.","Rör ner spenaten precis innan servering.","Servera med ris eller naan."]'::jsonb,
   480, 26, 16, 60, 25, 'Middag', true, '🍲'),

  (NULL, 'Tonfiskwrap med yoghurtdressing', 'Snabb högproteinlunch på 10 minuter.', 'Lunch', 'Fisk', 1,
   '[{"name":"Tonfisk i vatten","grams":120,"kcal_per_100":116,"protein_per_100":26,"fat_per_100":1,"carbs_per_100":0},{"name":"Tortillabröd","grams":60,"kcal_per_100":300,"protein_per_100":8,"fat_per_100":7,"carbs_per_100":50},{"name":"Grekisk yoghurt","grams":50,"kcal_per_100":59,"protein_per_100":10,"fat_per_100":0.4,"carbs_per_100":3.6},{"name":"Gurka","grams":60,"kcal_per_100":16,"protein_per_100":0.7,"fat_per_100":0.1,"carbs_per_100":3.6},{"name":"Sallad","grams":40,"kcal_per_100":15,"protein_per_100":1.4,"fat_per_100":0.2,"carbs_per_100":2.9}]'::jsonb,
   '["Blanda tonfisk med grekisk yoghurt.","Lägg sallad på tortillabrödet.","Toppa med tonfiskröran och gurka.","Rulla ihop och skär på mitten."]'::jsonb,
   400, 38, 8, 45, 10, 'Lunch', true, '🌯'),

  (NULL, 'Kyckling med ris och grönsaker', 'Bodybuilder-klassiker — enkel, billig, effektiv.', 'Middag', 'Kyckling', 2,
   '[{"name":"Kycklingfilé","grams":320,"kcal_per_100":110,"protein_per_100":23,"fat_per_100":1.5,"carbs_per_100":0},{"name":"Ris kokt","grams":400,"kcal_per_100":130,"protein_per_100":2.7,"fat_per_100":0.3,"carbs_per_100":28},{"name":"Broccoli","grams":250,"kcal_per_100":34,"protein_per_100":2.8,"fat_per_100":0.4,"carbs_per_100":7},{"name":"Olivolja","grams":15,"kcal_per_100":884,"protein_per_100":0,"fat_per_100":100,"carbs_per_100":0},{"name":"Soja","grams":15,"kcal_per_100":53,"protein_per_100":8,"fat_per_100":0.6,"carbs_per_100":4.9}]'::jsonb,
   '["Skär kycklingen i bitar och krydda.","Stek kycklingen i olja tills genomstekt.","Koka riset enligt anvisning.","Ångkoka broccolin 5 min.","Blanda allt och ringla över soja."]'::jsonb,
   580, 48, 14, 65, 25, 'High Protein', true, '🍗'),

  (NULL, 'Proteinpannkakor', 'Sött mellanmål med över 30g protein.', 'Mellanmål', 'Vegetarisk', 1,
   '[{"name":"Ägg","grams":100,"kcal_per_100":143,"protein_per_100":13,"fat_per_100":10,"carbs_per_100":1},{"name":"Kvarg","grams":150,"kcal_per_100":59,"protein_per_100":11,"fat_per_100":0.2,"carbs_per_100":3.6},{"name":"Havregryn","grams":50,"kcal_per_100":370,"protein_per_100":13,"fat_per_100":7,"carbs_per_100":60},{"name":"Banan","grams":80,"kcal_per_100":89,"protein_per_100":1.1,"fat_per_100":0.3,"carbs_per_100":23}]'::jsonb,
   '["Mixa alla ingredienser till en smet.","Stek små pannkakor i smörad panna.","Vänd när bubblor bildas.","Servera med bär eller honung."]'::jsonb,
   430, 33, 12, 50, 15, 'High Protein', true, '🥞'),

  (NULL, 'Halloumi-quinoasallad', 'Mättande vegetarisk lunch med mycket smak.', 'Lunch', 'Vegetarisk', 2,
   '[{"name":"Halloumi","grams":200,"kcal_per_100":316,"protein_per_100":21,"fat_per_100":25,"carbs_per_100":2.2},{"name":"Quinoa kokt","grams":300,"kcal_per_100":120,"protein_per_100":4.4,"fat_per_100":1.9,"carbs_per_100":21},{"name":"Cherrytomater","grams":200,"kcal_per_100":18,"protein_per_100":0.9,"fat_per_100":0.2,"carbs_per_100":3.9},{"name":"Ruccola","grams":60,"kcal_per_100":25,"protein_per_100":2.6,"fat_per_100":0.7,"carbs_per_100":3.7},{"name":"Olivolja","grams":15,"kcal_per_100":884,"protein_per_100":0,"fat_per_100":100,"carbs_per_100":0}]'::jsonb,
   '["Skiva halloumin och stek tills gyllenbrun.","Halvera cherrytomaterna.","Lägg quinoa, ruccola och tomater i en skål.","Toppa med halloumi och ringla över olivolja."]'::jsonb,
   520, 26, 28, 38, 20, 'Vegetarisk', true, '🧀'),

  (NULL, 'Grekisk yoghurt med honung och valnötter', 'Snabbt högproteinmellis.', 'Mellanmål', 'Vegetarisk', 1,
   '[{"name":"Grekisk yoghurt","grams":200,"kcal_per_100":59,"protein_per_100":10,"fat_per_100":0.4,"carbs_per_100":3.6},{"name":"Honung","grams":15,"kcal_per_100":304,"protein_per_100":0.3,"fat_per_100":0,"carbs_per_100":82},{"name":"Valnötter","grams":20,"kcal_per_100":654,"protein_per_100":15,"fat_per_100":65,"carbs_per_100":14}]'::jsonb,
   '["Häll upp yoghurten i en skål.","Ringla över honung.","Toppa med grovhackade valnötter."]'::jsonb,
   300, 23, 15, 22, 5, 'Mellanmål', true, '🍯');

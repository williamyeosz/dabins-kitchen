-- Enable RLS on all tables
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;

-- Public read/write for all tables (no auth required)
CREATE POLICY "Public access" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON recipe_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON recipe_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON ingredient_nutrition FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON meal_plan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON shopping_list_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON fridge_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON household_profiles FOR ALL USING (true) WITH CHECK (true);

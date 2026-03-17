-- Meal planning tables
CREATE TABLE meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  meal_slot TEXT CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner')) NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  is_external_suggestion BOOLEAN DEFAULT FALSE,
  external_recipe_data JSONB,
  servings_override INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_week DATE NOT NULL,
  ingredient_name TEXT NOT NULL,
  total_quantity NUMERIC,
  unit TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fridge_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at DATE
);

-- Indexes
CREATE INDEX idx_meal_plan_week ON meal_plan(week_start_date);
CREATE INDEX idx_shopping_list_week ON shopping_list_items(meal_plan_week);

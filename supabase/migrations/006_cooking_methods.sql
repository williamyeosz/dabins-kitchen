-- Cooking method variations: allows a recipe to have multiple step sets
-- (e.g. "Stovetop", "Instant Pot", "Slow Cooker")

CREATE TABLE cooking_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cook_time_minutes INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cooking_methods_recipe ON cooking_methods(recipe_id);

-- Steps with NULL cooking_method_id = default method (backward compatible)
ALTER TABLE steps ADD COLUMN cooking_method_id UUID REFERENCES cooking_methods(id) ON DELETE CASCADE;
CREATE INDEX idx_steps_method ON steps(cooking_method_id);

-- RLS: public access (matches existing pattern)
ALTER TABLE cooking_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON cooking_methods FOR ALL USING (true) WITH CHECK (true);

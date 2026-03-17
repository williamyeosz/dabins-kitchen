-- V2: Household profiles (scaffold only, no UI in v1)
CREATE TABLE household_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  meal_pattern JSONB DEFAULT '{}',
  macro_goals JSONB DEFAULT '{}',
  preferences TEXT,
  diet_intentions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

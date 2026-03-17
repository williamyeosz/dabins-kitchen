-- Optional steps: mark certain steps as optional
ALTER TABLE steps ADD COLUMN is_optional BOOLEAN DEFAULT FALSE;

-- Default cooking method: which method to show first on the detail page
-- NULL means the original "Default" steps are shown
ALTER TABLE recipes ADD COLUMN default_cooking_method_id UUID REFERENCES cooking_methods(id) ON DELETE SET NULL;

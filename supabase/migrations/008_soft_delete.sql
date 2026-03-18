-- Soft-delete: add deleted_at timestamp to recipes
ALTER TABLE recipes ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_recipes_deleted_at ON recipes(deleted_at);

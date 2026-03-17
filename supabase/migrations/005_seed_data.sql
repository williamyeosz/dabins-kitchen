-- Seed data: 3 recipes with full ingredients, steps, tags, and notes
DO $$
DECLARE
  -- Recipe IDs
  r1_id UUID;
  r2_id UUID;
  r3_id UUID;

  -- Nutrition IDs
  n_doenjang UUID;
  n_tofu UUID;
  n_zucchini UUID;
  n_potato UUID;
  n_onion UUID;
  n_green_chili UUID;
  n_garlic UUID;
  n_anchovy UUID;
  n_sea_bass UUID;
  n_ginger UUID;
  n_scallion UUID;
  n_soy_sauce UUID;
  n_sesame_oil UUID;
  n_chicken_thigh UUID;
  n_rice UUID;
  n_butter UUID;
  n_chicken_broth UUID;

  -- Tag IDs
  t_korean UUID;
  t_cantonese UUID;
  t_western UUID;
  t_dinner UUID;
  t_weeknight UUID;
  t_high_protein UUID;
BEGIN
  -- ============================================================
  -- Ingredient Nutrition Data
  -- ============================================================
  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Doenjang (soybean paste)', 199, 12.8, 16.2, 8.6, 5.4, 3728) RETURNING id INTO n_doenjang;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Tofu (firm)', 76, 8.1, 1.9, 4.8, 0.3, 7) RETURNING id INTO n_tofu;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Zucchini', 17, 1.2, 3.1, 0.3, 1.0, 8) RETURNING id INTO n_zucchini;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Potato', 77, 2.0, 17.5, 0.1, 2.2, 6) RETURNING id INTO n_potato;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Onion', 40, 1.1, 9.3, 0.1, 1.7, 4) RETURNING id INTO n_onion;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Green chili', 40, 1.9, 8.8, 0.4, 1.5, 3) RETURNING id INTO n_green_chili;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Garlic', 149, 6.4, 33.1, 0.5, 2.1, 17) RETURNING id INTO n_garlic;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Anchovy (dried)', 304, 56.4, 0, 7.7, 0, 3668) RETURNING id INTO n_anchovy;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Sea bass (whole)', 97, 18.4, 0, 2.0, 0, 68) RETURNING id INTO n_sea_bass;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Ginger', 80, 1.8, 17.8, 0.8, 2.0, 13) RETURNING id INTO n_ginger;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Scallion', 32, 1.8, 7.3, 0.2, 2.6, 16) RETURNING id INTO n_scallion;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Soy sauce', 53, 8.1, 4.9, 0.6, 0.8, 5493) RETURNING id INTO n_soy_sauce;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Sesame oil', 884, 0, 0, 100, 0, 0) RETURNING id INTO n_sesame_oil;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Chicken thigh (bone-in)', 177, 24.8, 0, 8.4, 0, 84) RETURNING id INTO n_chicken_thigh;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Rice (jasmine)', 365, 7.1, 80, 0.7, 1.3, 5) RETURNING id INTO n_rice;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Butter', 717, 0.9, 0.1, 81.1, 0, 11) RETURNING id INTO n_butter;

  INSERT INTO ingredient_nutrition (ingredient_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fibre_per_100g, sodium_per_100g)
  VALUES ('Chicken broth', 7, 1.1, 0.3, 0.2, 0, 343) RETURNING id INTO n_chicken_broth;

  -- ============================================================
  -- Tags
  -- ============================================================
  INSERT INTO tags (name, tag_type) VALUES ('Korean', 'cuisine') RETURNING id INTO t_korean;
  INSERT INTO tags (name, tag_type) VALUES ('Cantonese', 'cuisine') RETURNING id INTO t_cantonese;
  INSERT INTO tags (name, tag_type) VALUES ('Western', 'cuisine') RETURNING id INTO t_western;
  INSERT INTO tags (name, tag_type) VALUES ('dinner', 'category') RETURNING id INTO t_dinner;
  INSERT INTO tags (name, tag_type) VALUES ('weeknight', 'occasion') RETURNING id INTO t_weeknight;
  INSERT INTO tags (name, tag_type) VALUES ('high-protein', 'dietary') RETURNING id INTO t_high_protein;

  -- ============================================================
  -- Recipe 1: Doenjang Jjigae
  -- ============================================================
  INSERT INTO recipes (title, description, cuisine, category, base_servings, default_serving_size, cook_time_minutes, difficulty, last_cooked_at, last_cooked_rating)
  VALUES (
    'Doenjang Jjigae',
    'A deeply comforting Korean soybean paste stew with tofu and vegetables. The fermented doenjang gives an umami-rich, earthy broth.',
    'Korean', 'dinner', 4, 2, 30, 'medium',
    '2026-03-10', 4
  ) RETURNING id INTO r1_id;

  -- Ingredients for Doenjang Jjigae
  INSERT INTO ingredients (recipe_id, name, quantity, unit, canonical_quantity, canonical_unit, nutrition_id, sort_order) VALUES
    (r1_id, 'Doenjang paste', 3, 'tbsp', 54, 'g', n_doenjang, 1),
    (r1_id, 'Firm tofu', 300, 'g', 300, 'g', n_tofu, 2),
    (r1_id, 'Zucchini', 1, 'medium', 200, 'g', n_zucchini, 3),
    (r1_id, 'Potato', 1, 'medium', 150, 'g', n_potato, 4),
    (r1_id, 'Onion', 1, 'medium', 150, 'g', n_onion, 5),
    (r1_id, 'Green chili', 2, 'pieces', 30, 'g', n_green_chili, 6),
    (r1_id, 'Garlic', 4, 'cloves', 12, 'g', n_garlic, 7),
    (r1_id, 'Dried anchovies', 15, 'pieces', 30, 'g', n_anchovy, 8),
    (r1_id, 'Sesame oil', 1, 'tbsp', 15, 'ml', n_sesame_oil, 9),
    (r1_id, 'Water', 4, 'cups', 960, 'ml', NULL, 10);

  -- Steps for Doenjang Jjigae
  INSERT INTO steps (recipe_id, step_number, instruction) VALUES
    (r1_id, 1, 'Make anchovy stock: Bring 4 cups of water to a boil with the dried anchovies. Simmer for 10 minutes, then strain out the anchovies and reserve the stock.'),
    (r1_id, 2, 'Prep vegetables: Dice the potato and zucchini into bite-sized cubes. Slice the onion, mince the garlic, and slice the green chilies diagonally.'),
    (r1_id, 3, 'In a pot, heat sesame oil over medium heat. Sauté the onion and garlic until fragrant, about 2 minutes.'),
    (r1_id, 4, 'Add the doenjang paste and stir to dissolve it into the onion mixture. Cook for 1 minute.'),
    (r1_id, 5, 'Pour in the anchovy stock. Add the potato and bring to a boil, then reduce heat and simmer for 8 minutes until the potato is almost tender.'),
    (r1_id, 6, 'Add the zucchini, green chili, and tofu (cut into cubes). Simmer for another 5-7 minutes until everything is cooked through. Serve bubbling hot.');

  -- Notes for Doenjang Jjigae
  INSERT INTO recipe_notes (recipe_id, note_text, label) VALUES
    (r1_id, 'Works best in a Korean stone pot (ttukbaegi) but any small pot works', 'equipment'),
    (r1_id, 'Dabin likes it with extra tofu and less potato', 'preference');

  -- Tags for Doenjang Jjigae
  INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
    (r1_id, t_korean),
    (r1_id, t_dinner);

  -- ============================================================
  -- Recipe 2: Cantonese Steamed Fish
  -- ============================================================
  INSERT INTO recipes (title, description, cuisine, category, base_servings, default_serving_size, cook_time_minutes, difficulty, last_cooked_at, last_cooked_rating)
  VALUES (
    'Cantonese Steamed Fish',
    'A classic Cantonese preparation where the freshness of the fish is the star. Delicate, elegant, and surprisingly simple.',
    'Cantonese', 'dinner', 2, 2, 20, 'easy',
    '2026-03-05', 5
  ) RETURNING id INTO r2_id;

  -- Ingredients for Cantonese Steamed Fish
  INSERT INTO ingredients (recipe_id, name, quantity, unit, canonical_quantity, canonical_unit, nutrition_id, sort_order) VALUES
    (r2_id, 'Whole sea bass', 1, 'fish', 500, 'g', n_sea_bass, 1),
    (r2_id, 'Ginger', 30, 'g', 30, 'g', n_ginger, 2),
    (r2_id, 'Scallion', 3, 'stalks', 45, 'g', n_scallion, 3),
    (r2_id, 'Soy sauce (light)', 3, 'tbsp', 45, 'ml', n_soy_sauce, 4),
    (r2_id, 'Sesame oil', 1, 'tbsp', 15, 'ml', n_sesame_oil, 5);

  INSERT INTO ingredients (recipe_id, name, quantity, unit, canonical_quantity, canonical_unit, nutrition_id, sort_order, notes) VALUES
    (r2_id, 'Vegetable oil', 2, 'tbsp', 30, 'ml', NULL, 6, 'for the hot oil drizzle');

  -- Steps for Cantonese Steamed Fish
  INSERT INTO steps (recipe_id, step_number, instruction) VALUES
    (r2_id, 1, 'Prep the fish: Clean and pat dry the sea bass. Score the fish on both sides with diagonal cuts about 2cm apart.'),
    (r2_id, 2, 'Plate the fish on a heatproof dish. Stuff some ginger slices inside the cavity and lay the rest on top of the fish.'),
    (r2_id, 3, 'Steam the fish over high heat for 10 minutes (for a 500g fish). The fish is done when the flesh is opaque and flakes easily.'),
    (r2_id, 4, 'Remove from steamer. Discard the ginger and any liquid that accumulated. Top the fish with fresh scallion cut into fine shreds, then pour over the soy sauce and sesame oil.'),
    (r2_id, 5, 'Heat the vegetable oil in a small pan until smoking hot. Drizzle the hot oil over the scallions — it should sizzle dramatically. Serve immediately.');

  -- Notes for Cantonese Steamed Fish
  INSERT INTO recipe_notes (recipe_id, note_text, label) VALUES
    (r2_id, 'Need a steamer or wok with lid and rack', 'equipment'),
    (r2_id, 'Score the fish deeper for thicker fish — about 1cm deep cuts', 'preference');

  -- Tags for Cantonese Steamed Fish
  INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
    (r2_id, t_cantonese),
    (r2_id, t_dinner);

  -- ============================================================
  -- Recipe 3: Garlic Butter Chicken Rice
  -- ============================================================
  INSERT INTO recipes (title, description, cuisine, category, base_servings, default_serving_size, cook_time_minutes, difficulty, last_cooked_at, last_cooked_rating)
  VALUES (
    'Garlic Butter Chicken Rice',
    'A one-pot weeknight winner. Crispy-skinned chicken thighs over garlicky butter rice — the kind of meal that makes the whole kitchen smell amazing.',
    'Western', 'dinner', 4, 2, 40, 'easy',
    '2026-02-28', 4
  ) RETURNING id INTO r3_id;

  -- Ingredients for Garlic Butter Chicken Rice
  INSERT INTO ingredients (recipe_id, name, quantity, unit, canonical_quantity, canonical_unit, nutrition_id, sort_order) VALUES
    (r3_id, 'Chicken thighs (bone-in)', 4, 'pieces', 800, 'g', n_chicken_thigh, 1),
    (r3_id, 'Jasmine rice', 2, 'cups', 400, 'g', n_rice, 2),
    (r3_id, 'Garlic', 6, 'cloves', 18, 'g', n_garlic, 3),
    (r3_id, 'Butter', 3, 'tbsp', 42, 'g', n_butter, 4),
    (r3_id, 'Chicken broth', 2, 'cups', 480, 'ml', n_chicken_broth, 5),
    (r3_id, 'Onion', 1, 'medium', 150, 'g', n_onion, 6),
    (r3_id, 'Soy sauce', 1, 'tbsp', 15, 'ml', n_soy_sauce, 7);

  INSERT INTO ingredients (recipe_id, name, quantity, unit, canonical_quantity, canonical_unit, nutrition_id, sort_order, scales_linearly, notes) VALUES
    (r3_id, 'Salt', 1, 'tsp', 6, 'g', NULL, 8, FALSE, 'adjust to taste'),
    (r3_id, 'Black pepper', 0.5, 'tsp', 1.5, 'g', NULL, 9, FALSE, 'adjust to taste');

  -- Steps for Garlic Butter Chicken Rice
  INSERT INTO steps (recipe_id, step_number, instruction) VALUES
    (r3_id, 1, 'Season the chicken thighs generously with salt and pepper on both sides. Let them come to room temperature for 15 minutes if time allows.'),
    (r3_id, 2, 'Heat an oven-safe skillet over medium-high heat. Place chicken thighs skin-side down and sear without moving for 5-6 minutes until the skin is deep golden and crispy. Flip and sear for 2 more minutes. Remove and set aside.'),
    (r3_id, 3, 'Reduce heat to medium. Add butter to the same skillet. Sauté diced onion until softened, about 3 minutes. Add minced garlic and cook until fragrant, about 1 minute.'),
    (r3_id, 4, 'Add the rice to the skillet and stir to toast in the butter and aromatics for 2 minutes.'),
    (r3_id, 5, 'Pour in the chicken broth and soy sauce. Stir to combine and bring to a simmer. Nestle the chicken thighs on top, skin-side up.'),
    (r3_id, 6, 'Transfer the skillet to a preheated oven at 180°C (350°F). Bake uncovered for 20-25 minutes until the rice has absorbed the liquid and the chicken is cooked through (internal temp 75°C).');

  -- Notes for Garlic Butter Chicken Rice
  INSERT INTO recipe_notes (recipe_id, note_text, label) VALUES
    (r3_id, 'Use an oven-safe skillet or Dutch oven', 'equipment'),
    (r3_id, 'Ayi can prep this — just season and sear the chicken, she knows the rice cooker timing', 'maid'),
    (r3_id, 'Extra garlic is always welcome', 'preference');

  -- Tags for Garlic Butter Chicken Rice
  INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
    (r3_id, t_western),
    (r3_id, t_dinner),
    (r3_id, t_weeknight),
    (r3_id, t_high_protein);

END $$;

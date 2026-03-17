import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}
export async function signOut() {
  return supabase.auth.signOut()
}
export async function getSession() {
  return supabase.auth.getSession()
}

// Recipes
export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients(*, ingredient_nutrition:nutrition_id(*)),
      steps(*),
      cooking_methods(*),
      recipe_tags(tags(*)),
      recipe_notes(*)
    `)
    .order('created_at', { ascending: false })
    .order('sort_order', { referencedTable: 'ingredients', ascending: true })
    .order('step_number', { referencedTable: 'steps', ascending: true })
    .order('sort_order', { referencedTable: 'cooking_methods', ascending: true })
  if (error) throw error
  return data
}

export async function fetchRecipe(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients(*, ingredient_nutrition:nutrition_id(*)),
      steps(*),
      cooking_methods(*),
      recipe_tags(tags(*)),
      recipe_notes(*)
    `)
    .eq('id', id)
    .order('sort_order', { referencedTable: 'ingredients', ascending: true })
    .order('step_number', { referencedTable: 'steps', ascending: true })
    .order('sort_order', { referencedTable: 'cooking_methods', ascending: true })
    .single()
  if (error) throw error
  return data
}

export async function createRecipe(recipe) {
  const { title, description, cuisine, category, base_servings, default_serving_size, image_url, cook_time_minutes, difficulty, language_notes, default_cooking_method_id } = recipe
  const { data, error } = await supabase
    .from('recipes')
    .insert({ title, description, cuisine, category, base_servings, default_serving_size, image_url, cook_time_minutes, difficulty, language_notes, default_cooking_method_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecipe(id, updates) {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

// Mark cooked
export async function markCooked(recipeId, rating) {
  return updateRecipe(recipeId, {
    last_cooked_at: new Date().toISOString().split('T')[0],
    last_cooked_rating: rating
  })
}

// Ingredients
export async function addIngredients(ingredients) {
  const { data, error } = await supabase.from('ingredients').insert(ingredients).select()
  if (error) throw error
  return data
}

export async function updateIngredient(id, updates) {
  const { data, error } = await supabase.from('ingredients').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteIngredient(id) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw error
}

export async function deleteIngredientsByRecipe(recipeId) {
  const { error } = await supabase.from('ingredients').delete().eq('recipe_id', recipeId)
  if (error) throw error
}

// Steps
export async function addSteps(steps) {
  const { data, error } = await supabase.from('steps').insert(steps).select()
  if (error) throw error
  return data
}

export async function deleteStepsByRecipe(recipeId) {
  const { error } = await supabase.from('steps').delete().eq('recipe_id', recipeId)
  if (error) throw error
}

// Cooking Methods
export async function addCookingMethods(methods) {
  const { data, error } = await supabase.from('cooking_methods').insert(methods).select()
  if (error) throw error
  return data
}

export async function deleteCookingMethodsByRecipe(recipeId) {
  const { error } = await supabase.from('cooking_methods').delete().eq('recipe_id', recipeId)
  if (error) throw error
}

// Tags
export async function fetchTags() {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return data
}

export async function createTag(name, tag_type) {
  const { data, error } = await supabase.from('tags').insert({ name, tag_type }).select().single()
  if (error) throw error
  return data
}

export async function setRecipeTags(recipeId, tagIds) {
  // Delete existing
  await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
  if (tagIds.length > 0) {
    const rows = tagIds.map(tag_id => ({ recipe_id: recipeId, tag_id }))
    const { error } = await supabase.from('recipe_tags').insert(rows)
    if (error) throw error
  }
}

// Notes
export async function addNote(recipeId, noteText, label) {
  const { data, error } = await supabase
    .from('recipe_notes')
    .insert({ recipe_id: recipeId, note_text: noteText, label })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase.from('recipe_notes').delete().eq('id', id)
  if (error) throw error
}

export async function deleteNotesByRecipe(recipeId) {
  const { error } = await supabase.from('recipe_notes').delete().eq('recipe_id', recipeId)
  if (error) throw error
}

// Nutrition
export async function fetchNutritionByName(name) {
  const { data, error } = await supabase
    .from('ingredient_nutrition')
    .select('*')
    .ilike('ingredient_name', `%${name}%`)
  if (error) throw error
  return data
}

export async function createNutrition(nutritionData) {
  const { data, error } = await supabase
    .from('ingredient_nutrition')
    .insert(nutritionData)
    .select()
    .single()
  if (error) throw error
  return data
}

// Meal Plan
export async function fetchMealPlan(weekStart) {
  const { data, error } = await supabase
    .from('meal_plan')
    .select('*, recipes(*)')
    .eq('week_start_date', weekStart)
    .order('day_of_week')
  if (error) throw error
  return data
}

export async function upsertMealSlot(slot) {
  // If slot has id, update; else insert
  if (slot.id) {
    const { data, error } = await supabase.from('meal_plan').update(slot).eq('id', slot.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('meal_plan').insert(slot).select().single()
  if (error) throw error
  return data
}

export async function deleteMealSlot(id) {
  const { error } = await supabase.from('meal_plan').delete().eq('id', id)
  if (error) throw error
}

// Shopping List
export async function fetchShoppingList(weekDate) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('meal_plan_week', weekDate)
    .order('ingredient_name')
  if (error) throw error
  return data
}

export async function upsertShoppingItems(items) {
  const { data, error } = await supabase.from('shopping_list_items').upsert(items).select()
  if (error) throw error
  return data
}

export async function toggleShoppingItem(id, checked) {
  const { error } = await supabase.from('shopping_list_items').update({ is_checked: checked }).eq('id', id)
  if (error) throw error
}

export async function addManualShoppingItem(weekDate, name, quantity, unit) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({ meal_plan_week: weekDate, ingredient_name: name, total_quantity: quantity, unit, is_manual: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShoppingList(weekDate) {
  const { error } = await supabase.from('shopping_list_items').delete().eq('meal_plan_week', weekDate).eq('is_manual', false)
  if (error) throw error
}

// Fridge
export async function fetchFridgeIngredients() {
  const { data, error } = await supabase.from('fridge_ingredients').select('*').order('added_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addFridgeIngredient(ingredient) {
  const { data, error } = await supabase.from('fridge_ingredients').insert(ingredient).select().single()
  if (error) throw error
  return data
}

export async function updateFridgeIngredient(id, updates) {
  const { data, error } = await supabase.from('fridge_ingredients').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeFridgeIngredient(id) {
  const { error } = await supabase.from('fridge_ingredients').delete().eq('id', id)
  if (error) throw error
}

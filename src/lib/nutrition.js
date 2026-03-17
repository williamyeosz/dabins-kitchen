/**
 * Calculate nutrition for a single ingredient at given serving size
 * @param {Object} ingredient - ingredient with canonical_quantity, canonical_unit, nutrition data
 * @param {number} baseServings - recipe base servings
 * @param {number} targetServings - current serving size
 * @returns {Object|null} nutrition values or null if no data
 */
export function calculateIngredientNutrition(ingredient, baseServings, targetServings) {
  const nutrition = ingredient.ingredient_nutrition
  if (!nutrition) return null

  // Only works for weight-based (g) canonical units
  if (ingredient.canonical_unit !== 'g' || !ingredient.canonical_quantity) return null

  const scaledQty = (ingredient.canonical_quantity / baseServings) * targetServings
  const factor = scaledQty / 100 // nutrition is per 100g

  return {
    calories: (nutrition.calories_per_100g || 0) * factor,
    protein: (nutrition.protein_per_100g || 0) * factor,
    carbs: (nutrition.carbs_per_100g || 0) * factor,
    fat: (nutrition.fat_per_100g || 0) * factor,
    fibre: (nutrition.fibre_per_100g || 0) * factor,
    sodium: (nutrition.sodium_per_100g || 0) * factor,
  }
}

/**
 * Calculate total nutrition for a recipe at given serving size
 * Returns per-serving values
 */
export function calculateRecipeNutrition(ingredients, baseServings, targetServings) {
  let total = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sodium: 0 }
  let hasData = false
  let missingData = false

  for (const ing of ingredients) {
    const n = calculateIngredientNutrition(ing, baseServings, targetServings)
    if (n) {
      hasData = true
      total.calories += n.calories
      total.protein += n.protein
      total.carbs += n.carbs
      total.fat += n.fat
      total.fibre += n.fibre
      total.sodium += n.sodium
    } else if (ing.canonical_unit === 'g' && ing.canonical_quantity) {
      // Has weight data but no nutrition linked
      missingData = true
    }
  }

  if (!hasData) return null

  // Divide by target servings to get per-serving
  const perServing = {
    calories: Math.round(total.calories / targetServings),
    protein: Math.round(total.protein * 10 / targetServings) / 10,
    carbs: Math.round(total.carbs * 10 / targetServings) / 10,
    fat: Math.round(total.fat * 10 / targetServings) / 10,
    fibre: Math.round(total.fibre * 10 / targetServings) / 10,
    sodium: Math.round(total.sodium / targetServings),
    isPartial: missingData,
  }

  return perServing
}

/**
 * Format nutrition value for display
 */
export function formatNutrition(value, unit = 'g') {
  if (value == null) return '\u2014'
  if (unit === 'mg') return `${Math.round(value)}mg`
  if (unit === 'kcal') return `${Math.round(value)} kcal`
  return `${value}${unit}`
}

import { scaleQuantity } from './units'

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export function getWeekDates(weekStart) {
  const dates = []
  const start = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner']

/**
 * Aggregate ingredients from a week's meal plan into a shopping list
 * Merges duplicates and sums quantities
 */
export function aggregateShoppingList(mealPlanEntries, recipes) {
  const items = {}

  for (const entry of mealPlanEntries) {
    let ingredients = []
    const servings = entry.servings_override

    if (entry.recipe_id && entry.recipes) {
      // Book recipe
      const recipe = entry.recipes
      const recipeDetail = recipes.find(r => r.id === entry.recipe_id) || recipe
      if (recipeDetail.ingredients) {
        ingredients = recipeDetail.ingredients.map(ing => ({
          name: ing.name,
          quantity: servings
            ? scaleQuantity(ing.canonical_quantity || ing.quantity, recipeDetail.base_servings, servings)
            : ing.canonical_quantity || ing.quantity,
          unit: ing.canonical_unit || ing.unit,
        }))
      }
    } else if (entry.is_external_suggestion && entry.external_recipe_data?.ingredients) {
      // External recipe
      ingredients = entry.external_recipe_data.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }))
    }

    for (const ing of ingredients) {
      const key = `${ing.name.toLowerCase()}_${(ing.unit || '').toLowerCase()}`
      if (items[key]) {
        items[key].total_quantity += (ing.quantity || 0)
      } else {
        items[key] = {
          ingredient_name: ing.name,
          total_quantity: ing.quantity || 0,
          unit: ing.unit || '',
        }
      }
    }
  }

  return Object.values(items)
}

/**
 * Mark items as "already have" based on fridge contents
 */
export function markFridgeItems(shoppingItems, fridgeIngredients) {
  return shoppingItems.map(item => {
    const fridgeMatch = fridgeIngredients.find(f =>
      f.ingredient_name.toLowerCase() === item.ingredient_name.toLowerCase()
    )
    return {
      ...item,
      inFridge: !!fridgeMatch,
      fridgeQuantity: fridgeMatch?.quantity,
      fridgeUnit: fridgeMatch?.unit,
    }
  })
}

export function navigateWeek(currentWeekStart, direction) {
  const d = new Date(currentWeekStart)
  d.setDate(d.getDate() + (direction * 7))
  return d.toISOString().split('T')[0]
}

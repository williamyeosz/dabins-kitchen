const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function callClaude(systemPrompt, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

function parseJSON(text) {
  // Try to extract JSON from the response, handling markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim()
  return JSON.parse(jsonStr)
}

/**
 * Parse raw recipe text into structured recipe data
 */
export async function parseRecipeText(rawText) {
  const system = `You are a recipe parsing assistant. Extract structured recipe data from raw text. The text may come from a website, a message, a cookbook, or be typed casually. Be smart about interpreting quantities and units. Return a single JSON object.`

  const message = `Parse this into a structured recipe:

${rawText}

Return a single JSON object with:
- title (string)
- description (string, 1-2 sentences summarizing the dish)
- cuisine (string — your best guess)
- category (string — e.g. dinner, lunch, breakfast, dessert, snack, soup)
- cook_time_minutes (number — your best estimate if not stated)
- difficulty (string — "easy", "medium", or "hard")
- base_servings (number — how many servings the recipe makes, default 4 if unclear)
- ingredients (array of objects: {name, quantity (number), unit (string — use: g, kg, ml, L, cup, tbsp, tsp, oz, lbs, piece, pieces, clove, cloves, stalk, stalks, medium, large, small, whole)})
- steps (array of strings — clear numbered instructions)
- notes (array of objects: {note_text, label} where label is "general", "preference", or "equipment" — include any tips from the text)

Be thorough. If the text mentions tips, equipment, or preferences, capture them as notes. If quantities are vague (e.g. "a handful"), make your best numeric estimate.

Return ONLY the JSON object, no other text.`

  const response = await callClaude(system, message)
  return parseJSON(response)
}

/**
 * Fridge Matcher — suggest recipes based on available ingredients
 */
export async function suggestRecipesFromFridge(fridgeIngredients) {
  const ingredientList = fridgeIngredients
    .map(i => `${i.ingredient_name}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`)
    .join('\n')

  const system = `You are a helpful cooking assistant for a home kitchen. You suggest practical, delicious recipes based on available ingredients. The household enjoys Korean, Cantonese, Japanese, Thai, and Western cuisines. Return your response as a JSON array of exactly 5 recipe objects.`

  const message = `I have these ingredients in my fridge:
${ingredientList}

Suggest 5 recipes I could make. For each, return a JSON object with:
- title (string)
- cuisine (string)
- description (string, 1-2 sentences)
- cook_time_minutes (number)
- difficulty ("easy", "medium", or "hard")
- ingredients (array of {name, quantity, unit})
- steps (array of strings)

Return ONLY the JSON array, no other text.`

  const response = await callClaude(system, message)
  return parseJSON(response)
}

/**
 * Ingredient substitution assistant
 */
export async function suggestSubstitutions(ingredientName, recipeTitle, allIngredients) {
  const ingredientList = allIngredients.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')

  const system = `You are a cooking substitution expert. You suggest practical ingredient substitutions that work well in the context of the specific recipe. Return your response as a JSON array.`

  const message = `I'm making "${recipeTitle}" and I don't have "${ingredientName}".

The full ingredient list is: ${ingredientList}

Suggest 2-3 substitution options. For each, return a JSON object with:
- substitute (string — the substitute ingredient name)
- quantity_adjustment (string — how to adjust quantity, e.g. "use same amount" or "use 2 tbsp instead")
- note (string — brief note on how it affects the dish)

Return ONLY the JSON array, no other text.`

  const response = await callClaude(system, message)
  return parseJSON(response)
}

/**
 * AI meal slot suggestions
 */
export async function suggestMealForSlot(dayOfWeek, mealSlot, currentWeekMeals, cuisinePreferences) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const existingMeals = currentWeekMeals
    .filter(m => m.recipes?.title || m.external_recipe_data?.title)
    .map(m => `${dayNames[m.day_of_week]} ${m.meal_slot}: ${m.recipes?.title || m.external_recipe_data?.title}`)
    .join('\n')

  const system = `You are a meal planning assistant for a household that enjoys diverse cuisines including Korean, Cantonese, Japanese, Thai, and Western food. Suggest balanced, varied meals. Return your response as a JSON array.`

  const message = `I need a suggestion for ${dayNames[dayOfWeek]} ${mealSlot}.

${existingMeals ? `Already planned this week:\n${existingMeals}` : 'No meals planned yet this week.'}

${cuisinePreferences ? `Cuisine preferences: ${cuisinePreferences}` : ''}

Suggest 3 meal options. For each, return a JSON object with:
- title (string)
- cuisine (string)
- description (string, 1-2 sentences)
- cook_time_minutes (number)
- difficulty ("easy", "medium", or "hard")
- ingredients (array of {name, quantity, unit})
- steps (array of strings)
- isFromBook (boolean — set to false, these are new suggestions)

Return ONLY the JSON array, no other text.`

  const response = await callClaude(system, message)
  return parseJSON(response)
}

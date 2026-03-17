import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Refrigerator, Plus, Trash2, Search, Sparkles, ChefHat,
  AlertCircle, Calendar, X, Loader2
} from 'lucide-react'
import {
  fetchRecipes,
  fetchFridgeIngredients,
  addFridgeIngredient,
  removeFridgeIngredient,
} from '../lib/supabase'
import { suggestRecipesFromFridge } from '../lib/ai'
import AIRecipeCard from '../components/AIRecipeCard'

// Normalize ingredient name for matching
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(s|es)$/, '') // rough plural strip
}

// Score a recipe against fridge contents
function scoreRecipe(recipe, fridgeNames) {
  const ingredients = recipe.ingredients || []
  if (ingredients.length === 0) return { score: 0, matched: [], missing: [] }

  let totalWeight = 0
  let matchedWeight = 0
  const matched = []
  const missing = []

  ingredients.forEach((ing, idx) => {
    const weight = idx < 3 ? 2 : 1 // first 3 ingredients get 2x weight
    totalWeight += weight

    const ingNorm = normalize(ing.name)
    const isMatch = fridgeNames.some(fn => fn.includes(ingNorm) || ingNorm.includes(fn))

    if (isMatch) {
      matchedWeight += weight
      matched.push(ing.name)
    } else {
      missing.push(ing.name)
    }
  })

  return {
    score: totalWeight > 0 ? matchedWeight / totalWeight : 0,
    matched,
    missing,
  }
}

const COMMON_UNITS = ['', 'g', 'kg', 'ml', 'L', 'cups', 'tbsp', 'tsp', 'pcs', 'bunch', 'pack']

export default function FridgeMatcherPage() {
  const navigate = useNavigate()

  // Fridge state
  const [fridgeItems, setFridgeItems] = useState([])
  const [fridgeLoading, setFridgeLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Results state
  const [bookMatches, setBookMatches] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [searching, setSearching] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load fridge contents
  useEffect(() => {
    fetchFridgeIngredients()
      .then(setFridgeItems)
      .catch(console.error)
      .finally(() => setFridgeLoading(false))
  }, [])

  // Add ingredient to fridge
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingItem(true)
    try {
      const item = await addFridgeIngredient({
        ingredient_name: newName.trim(),
        quantity: newQty ? parseFloat(newQty) : null,
        unit: newUnit || null,
        expiry_date: newExpiry || null,
      })
      setFridgeItems(prev => [item, ...prev])
      setNewName('')
      setNewQty('')
      setNewUnit('')
      setNewExpiry('')
    } catch (err) {
      console.error(err)
    } finally {
      setAddingItem(false)
    }
  }

  // Remove ingredient from fridge
  const handleRemove = async (id) => {
    try {
      await removeFridgeIngredient(id)
      setFridgeItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // Find recipes
  const handleFindRecipes = useCallback(async () => {
    if (fridgeItems.length === 0) return
    setError(null)
    setSearching(true)
    setAiLoading(true)
    setBookMatches(null)
    setAiSuggestions(null)

    const fridgeNames = fridgeItems.map(i => normalize(i.ingredient_name))

    // Panel A: match against book recipes
    try {
      const recipes = await fetchRecipes()
      const scored = recipes
        .map(recipe => ({
          recipe,
          ...scoreRecipe(recipe, fridgeNames),
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      setBookMatches(scored)
    } catch (err) {
      console.error(err)
      setError('Failed to search your recipe book.')
    } finally {
      setSearching(false)
    }

    // Panel B: AI suggestions (runs independently)
    try {
      const suggestions = await suggestRecipesFromFridge(fridgeItems)
      setAiSuggestions(suggestions)
    } catch (err) {
      console.error(err)
      setAiSuggestions([])
    } finally {
      setAiLoading(false)
    }
  }, [fridgeItems])

  // Check if an item is expiring soon (within 3 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false
    const diff = new Date(expiryDate) - new Date()
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000
  }

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-warm-800 flex items-center gap-3">
          <Refrigerator size={32} />
          What Can I Cook?
        </h1>
        <p className="text-warm-500 mt-1">
          Add what's in your fridge and we'll find recipes you can make.
        </p>
      </div>

      {/* Fridge Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-100 p-6">
        <h2 className="text-lg font-display font-semibold text-warm-800 mb-4">
          My Fridge
        </h2>

        {/* Add ingredient form */}
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-6">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-warm-600 mb-1">Ingredient</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Chicken thighs"
              required
              className="w-full px-3 py-2.5 rounded-xl border-2 border-warm-200 focus:border-kitchen-green focus:outline-none text-sm"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-warm-600 mb-1">Qty</label>
            <input
              type="number"
              step="any"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              placeholder="500"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-warm-200 focus:border-kitchen-green focus:outline-none text-sm"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-warm-600 mb-1">Unit</label>
            <select
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-warm-200 focus:border-kitchen-green focus:outline-none text-sm bg-white"
            >
              {COMMON_UNITS.map(u => (
                <option key={u} value={u}>{u || '—'}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-warm-600 mb-1">Expiry (optional)</label>
            <input
              type="date"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-warm-200 focus:border-kitchen-green focus:outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={addingItem || !newName.trim()}
            className="kitchen-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-kitchen-green text-white font-medium text-sm hover:bg-kitchen-green/90 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </form>

        {/* Fridge contents */}
        {fridgeLoading ? (
          <div className="text-center py-8 text-warm-400">Loading fridge contents...</div>
        ) : fridgeItems.length === 0 ? (
          <div className="text-center py-8 text-warm-400">
            <Refrigerator size={40} className="mx-auto mb-2 opacity-40" />
            <p>Your fridge is empty. Add some ingredients above!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fridgeItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                  isExpired(item.expiry_date)
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : isExpiringSoon(item.expiry_date)
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-warm-50 border-warm-200 text-warm-700'
                }`}
              >
                <span className="font-medium">{item.ingredient_name}</span>
                {item.quantity && (
                  <span className="text-xs opacity-70">
                    {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                )}
                {item.expiry_date && (
                  <span className="flex items-center gap-0.5 text-xs opacity-70">
                    <Calendar size={10} />
                    {item.expiry_date}
                  </span>
                )}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="ml-1 p-0.5 rounded-full hover:bg-warm-200 transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Find Recipes button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleFindRecipes}
            disabled={fridgeItems.length === 0 || searching || aiLoading}
            className="kitchen-btn flex items-center gap-2 px-8 py-3 rounded-xl bg-kitchen-green text-white font-semibold text-base hover:bg-kitchen-green/90 transition-colors disabled:opacity-50"
          >
            {(searching || aiLoading) ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Search size={20} />
            )}
            Find Recipes
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-kitchen-red rounded-xl p-4 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Results — Two Panels */}
      {(bookMatches !== null || aiSuggestions !== null) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel A — From the Book */}
          <div className="bg-white rounded-2xl shadow-sm border border-warm-100 p-6">
            <h2 className="text-lg font-display font-semibold text-warm-800 flex items-center gap-2 mb-4">
              <ChefHat size={20} />
              From Your Book
            </h2>

            {searching ? (
              <div className="text-center py-12 text-warm-400">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                Searching your recipes...
              </div>
            ) : bookMatches && bookMatches.length === 0 ? (
              <div className="text-center py-12 text-warm-400">
                <p>No matching recipes found in your book.</p>
                <p className="text-sm mt-1">Try adding more ingredients to your fridge.</p>
              </div>
            ) : bookMatches ? (
              <div className="space-y-3">
                {bookMatches.map(({ recipe, score, matched, missing }) => (
                  <button
                    key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="w-full text-left p-4 rounded-xl border border-warm-100 hover:border-kitchen-green/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-warm-800 line-clamp-1">{recipe.title}</h3>
                        {recipe.cuisine && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-500 mt-1 inline-block">
                            {recipe.cuisine}
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-sm font-bold ${
                          score >= 0.8
                            ? 'bg-green-100 text-green-700'
                            : score >= 0.5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-warm-100 text-warm-600'
                        }`}
                      >
                        {Math.round(score * 100)}%
                      </span>
                    </div>

                    {missing.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-warm-400">Missing: </span>
                        <span className="text-xs text-kitchen-red">
                          {missing.join(', ')}
                        </span>
                      </div>
                    )}

                    {matched.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-warm-400">Have: </span>
                        <span className="text-xs text-green-600">
                          {matched.join(', ')}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Panel B — AI Suggestions */}
          <div className="bg-white rounded-2xl shadow-sm border border-warm-100 p-6">
            <h2 className="text-lg font-display font-semibold text-warm-800 flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-purple-500" />
              AI Suggestions
            </h2>

            {aiLoading ? (
              <div className="text-center py-12 text-warm-400">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                Asking Claude for ideas...
              </div>
            ) : aiSuggestions && aiSuggestions.length === 0 ? (
              <div className="text-center py-12 text-warm-400">
                <p>Couldn't generate suggestions right now.</p>
                <p className="text-sm mt-1">Please try again later.</p>
              </div>
            ) : aiSuggestions ? (
              <>
                <div className="grid gap-4">
                  {aiSuggestions.map((recipe, idx) => (
                    <AIRecipeCard key={idx} recipe={recipe} />
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs text-warm-400">
                    <Sparkles size={12} />
                    Powered by Claude
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Printer, ShoppingCart, X,
  Search, Sparkles, BookOpen, Trash2, Plus, Loader2
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getWeekStart, getWeekDates, navigateWeek, DAY_NAMES, MEAL_SLOTS } from '../lib/mealPlan'
import { fetchMealPlan, upsertMealSlot, deleteMealSlot, fetchRecipes } from '../lib/supabase'
import { suggestMealForSlot } from '../lib/ai'

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export default function MealPlannerPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [mealPlan, setMealPlan] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null) // { dayIndex, mealSlot, existing }
  const [activeTab, setActiveTab] = useState('book') // 'book' | 'ai'

  // Book tab state
  const [recipes, setRecipes] = useState([])
  const [recipesLoaded, setRecipesLoaded] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState('')

  // AI tab state
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Servings override
  const [servingsOverride, setServingsOverride] = useState('')

  const weekDates = getWeekDates(weekStart)

  const loadMealPlan = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMealPlan(weekStart)
      setMealPlan(data || [])
    } catch (err) {
      console.error('Failed to load meal plan:', err)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { loadMealPlan() }, [loadMealPlan])

  const loadRecipes = useCallback(async () => {
    if (recipesLoaded) return
    try {
      const data = await fetchRecipes()
      setRecipes(data || [])
      setRecipesLoaded(true)
    } catch (err) {
      console.error('Failed to load recipes:', err)
    }
  }, [recipesLoaded])

  function getSlotEntry(dayIndex, mealSlot) {
    return mealPlan.find(
      e => e.day_of_week === dayIndex && e.meal_slot === mealSlot
    )
  }

  function getSlotTitle(entry) {
    if (!entry) return null
    if (entry.recipes?.title) return entry.recipes.title
    if (entry.external_recipe_data?.title) return entry.external_recipe_data.title
    return 'Untitled'
  }

  function handleSlotClick(dayIndex, mealSlot) {
    if (!isAuthenticated) return
    const existing = getSlotEntry(dayIndex, mealSlot)
    setSelectedSlot({ dayIndex, mealSlot, existing })
    setServingsOverride(existing?.servings_override || '')
    setRecipeSearch('')
    setAiSuggestions([])
    setAiError(null)
    setActiveTab('book')
    setModalOpen(true)
    loadRecipes()
  }

  function handleWeekNav(direction) {
    setWeekStart(navigateWeek(weekStart, direction))
  }

  async function assignRecipe(recipe) {
    const slot = {
      ...(selectedSlot.existing?.id ? { id: selectedSlot.existing.id } : {}),
      week_start_date: weekStart,
      day_of_week: selectedSlot.dayIndex,
      meal_slot: selectedSlot.mealSlot,
      recipe_id: recipe.id,
      is_external_suggestion: false,
      external_recipe_data: null,
      servings_override: servingsOverride ? parseInt(servingsOverride, 10) : null,
    }
    try {
      await upsertMealSlot(slot)
      await loadMealPlan()
      setModalOpen(false)
    } catch (err) {
      console.error('Failed to assign recipe:', err)
    }
  }

  async function assignExternalSuggestion(suggestion) {
    const slot = {
      ...(selectedSlot.existing?.id ? { id: selectedSlot.existing.id } : {}),
      week_start_date: weekStart,
      day_of_week: selectedSlot.dayIndex,
      meal_slot: selectedSlot.mealSlot,
      recipe_id: null,
      is_external_suggestion: true,
      external_recipe_data: suggestion,
      servings_override: servingsOverride ? parseInt(servingsOverride, 10) : null,
    }
    try {
      await upsertMealSlot(slot)
      await loadMealPlan()
      setModalOpen(false)
    } catch (err) {
      console.error('Failed to assign suggestion:', err)
    }
  }

  async function handleClearSlot() {
    if (!selectedSlot.existing?.id) return
    try {
      await deleteMealSlot(selectedSlot.existing.id)
      await loadMealPlan()
      setModalOpen(false)
    } catch (err) {
      console.error('Failed to clear slot:', err)
    }
  }

  async function fetchAiSuggestions() {
    setAiLoading(true)
    setAiError(null)
    try {
      const suggestions = await suggestMealForSlot(
        selectedSlot.dayIndex,
        selectedSlot.mealSlot,
        mealPlan
      )
      setAiSuggestions(suggestions)
    } catch (err) {
      console.error('AI suggestion error:', err)
      setAiError('Failed to get suggestions. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  function handleAddToBook(suggestion) {
    navigate('/recipes/new', { state: { prefill: suggestion } })
  }

  const filteredRecipes = recipes.filter(r => {
    if (!recipeSearch.trim()) return true
    const q = recipeSearch.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.cuisine?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  })

  const weekLabel = (() => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    return `${fmt(start)} - ${fmt(end)}, ${end.getFullYear()}`
  })()

  return (
    <div className="meal-planner">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 no-print">
        <h1 className="text-3xl font-display font-bold text-warm-800">Meal Planner</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="kitchen-btn kitchen-btn-secondary flex items-center gap-1 text-sm">
            <Printer size={16} /> Print
          </button>
          <button
            onClick={() => navigate(`/shopping-list?week=${weekStart}`)}
            className="kitchen-btn kitchen-btn-primary flex items-center gap-1 text-sm"
          >
            <ShoppingCart size={16} /> Generate Shopping List
          </button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-center gap-4 mb-6 no-print">
        <button onClick={() => handleWeekNav(-1)} className="kitchen-btn p-2 rounded-full hover:bg-warm-100">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-warm-700 min-w-[220px] text-center">{weekLabel}</h2>
        <button onClick={() => handleWeekNav(1)} className="kitchen-btn p-2 rounded-full hover:bg-warm-100">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-warm-400 text-lg">Loading meal plan...</div>
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse meal-plan-table">
              <thead>
                <tr>
                  <th className="p-3 text-left text-warm-500 text-sm font-medium border-b border-warm-200 w-24"></th>
                  {DAY_NAMES.map((day, i) => (
                    <th key={day} className="p-3 text-center border-b border-warm-200">
                      <div className="text-warm-700 font-semibold">{day}</div>
                      <div className="text-warm-400 text-xs">{new Date(weekDates[i]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_SLOTS.map(slot => (
                  <tr key={slot}>
                    <td className="p-3 text-warm-500 text-sm font-medium border-b border-warm-100 capitalize">{MEAL_LABELS[slot]}</td>
                    {DAY_NAMES.map((_, dayIndex) => {
                      const entry = getSlotEntry(dayIndex, slot)
                      const title = getSlotTitle(entry)
                      return (
                        <td
                          key={dayIndex}
                          onClick={() => handleSlotClick(dayIndex, slot)}
                          className={`p-2 border-b border-warm-100 text-center align-top min-w-[120px] ${
                            isAuthenticated ? 'cursor-pointer hover:bg-warm-50' : ''
                          }`}
                        >
                          {title ? (
                            <div className="bg-white rounded-lg p-2 shadow-sm border border-warm-100">
                              <div className="text-sm font-medium text-warm-800 line-clamp-2">{title}</div>
                              {entry.is_external_suggestion && (
                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">AI</span>
                              )}
                              {entry.servings_override && (
                                <div className="text-[11px] text-warm-400 mt-1">{entry.servings_override} servings</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-warm-300 text-sm py-3">
                              {isAuthenticated ? <Plus size={16} className="mx-auto" /> : '-'}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {DAY_NAMES.map((day, dayIndex) => (
              <div key={day} className="bg-white rounded-xl shadow-sm border border-warm-100 overflow-hidden">
                <div className="bg-warm-50 px-4 py-2 border-b border-warm-100">
                  <span className="font-semibold text-warm-700">{day}</span>
                  <span className="text-warm-400 text-sm ml-2">
                    {new Date(weekDates[dayIndex]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="divide-y divide-warm-50">
                  {MEAL_SLOTS.map(slot => {
                    const entry = getSlotEntry(dayIndex, slot)
                    const title = getSlotTitle(entry)
                    return (
                      <div
                        key={slot}
                        onClick={() => handleSlotClick(dayIndex, slot)}
                        className={`px-4 py-3 flex items-center justify-between ${isAuthenticated ? 'cursor-pointer hover:bg-warm-50' : ''}`}
                      >
                        <span className="text-warm-400 text-sm capitalize w-20">{MEAL_LABELS[slot]}</span>
                        {title ? (
                          <div className="flex items-center gap-2 flex-1 ml-2">
                            <span className="text-warm-800 text-sm font-medium">{title}</span>
                            {entry.is_external_suggestion && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">AI</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-warm-300 text-sm flex-1 ml-2">{isAuthenticated ? '+ Add' : '-'}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Print view */}
          <div className="print-only">
            <h1 className="text-2xl font-bold mb-1 text-center">Weekly Meal Plan</h1>
            <p className="text-center text-sm mb-4 text-gray-500">{weekLabel}</p>
            <table className="w-full border-collapse" style={{ fontSize: '11pt' }}>
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-100 text-left"></th>
                  {DAY_NAMES.map((day, i) => (
                    <th key={day} className="border border-gray-300 p-2 bg-gray-100 text-center">
                      <div>{day}</div>
                      <div style={{ fontSize: '9pt', fontWeight: 'normal' }}>
                        {new Date(weekDates[i]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_SLOTS.map(slot => (
                  <tr key={slot}>
                    <td className="border border-gray-300 p-2 font-medium capitalize">{MEAL_LABELS[slot]}</td>
                    {DAY_NAMES.map((_, dayIndex) => {
                      const entry = getSlotEntry(dayIndex, slot)
                      const title = getSlotTitle(entry)
                      return (
                        <td key={dayIndex} className="border border-gray-300 p-2 text-center text-sm">
                          {title || ''}
                          {entry?.servings_override ? ` (${entry.servings_override})` : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Slot assignment modal */}
      {modalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-warm-100">
              <h3 className="font-display font-bold text-warm-800">
                {DAY_NAMES[selectedSlot.dayIndex]} - {MEAL_LABELS[selectedSlot.mealSlot]}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-warm-100 rounded-lg">
                <X size={20} className="text-warm-500" />
              </button>
            </div>

            {/* Servings override */}
            <div className="px-4 pt-3 flex items-center gap-3">
              <label className="text-sm text-warm-500 whitespace-nowrap">Servings:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={servingsOverride}
                onChange={e => setServingsOverride(e.target.value)}
                placeholder="Default"
                className="w-24 px-3 py-1.5 rounded-lg border border-warm-200 text-sm focus:border-kitchen-green focus:outline-none"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-warm-100 mx-4 mt-3">
              <button
                onClick={() => setActiveTab('book')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'book'
                    ? 'border-kitchen-green text-kitchen-green'
                    : 'border-transparent text-warm-400 hover:text-warm-600'
                }`}
              >
                <BookOpen size={15} /> From the Book
              </button>
              <button
                onClick={() => { setActiveTab('ai'); if (aiSuggestions.length === 0 && !aiLoading) fetchAiSuggestions() }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-warm-400 hover:text-warm-600'
                }`}
              >
                <Sparkles size={15} /> AI Suggestion
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'book' && (
                <div>
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-300" />
                    <input
                      type="text"
                      value={recipeSearch}
                      onChange={e => setRecipeSearch(e.target.value)}
                      placeholder="Search recipes..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm-200 text-sm focus:border-kitchen-green focus:outline-none"
                    />
                  </div>
                  {filteredRecipes.length === 0 ? (
                    <p className="text-warm-400 text-sm text-center py-6">No recipes found</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                      {filteredRecipes.map(recipe => (
                        <button
                          key={recipe.id}
                          onClick={() => assignRecipe(recipe)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-warm-50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <div className="text-sm font-medium text-warm-800">{recipe.title}</div>
                            <div className="text-xs text-warm-400">
                              {[recipe.cuisine, recipe.difficulty, recipe.cook_time_minutes && `${recipe.cook_time_minutes}m`]
                                .filter(Boolean).join(' \u00B7 ')}
                            </div>
                          </div>
                          <Plus size={16} className="text-warm-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div>
                  {aiLoading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 size={24} className="animate-spin text-purple-500" />
                      <p className="text-warm-400 text-sm">Generating suggestions...</p>
                    </div>
                  )}
                  {aiError && (
                    <div className="text-center py-6">
                      <p className="text-red-500 text-sm mb-3">{aiError}</p>
                      <button onClick={fetchAiSuggestions} className="kitchen-btn kitchen-btn-secondary text-sm">
                        Try Again
                      </button>
                    </div>
                  )}
                  {!aiLoading && !aiError && aiSuggestions.length > 0 && (
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion, i) => (
                        <div key={i} className="border border-warm-100 rounded-xl p-3 hover:border-purple-200 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-warm-800 text-sm">{suggestion.title}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded-full whitespace-nowrap">
                              {suggestion.cuisine}
                            </span>
                          </div>
                          <p className="text-xs text-warm-500 mb-2">{suggestion.description}</p>
                          <div className="text-xs text-warm-400 mb-3">
                            {suggestion.cook_time_minutes}min \u00B7 {suggestion.difficulty}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => assignExternalSuggestion(suggestion)}
                              className="kitchen-btn kitchen-btn-primary text-xs px-3 py-1.5"
                            >
                              Use This
                            </button>
                            <button
                              onClick={() => handleAddToBook(suggestion)}
                              className="kitchen-btn kitchen-btn-secondary text-xs px-3 py-1.5"
                            >
                              Add to Book
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={fetchAiSuggestions}
                        className="w-full text-center text-sm text-purple-500 hover:text-purple-700 py-2"
                      >
                        Regenerate suggestions
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            {selectedSlot.existing && (
              <div className="border-t border-warm-100 p-4">
                <button
                  onClick={handleClearSlot}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={14} /> Clear this slot
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .meal-planner { padding: 0; }
          @page { size: A4 landscape; margin: 1cm; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
    </div>
  )
}

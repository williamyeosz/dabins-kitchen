import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Printer, RefreshCw, Plus, Trash2, Check, ShoppingCart,
  ChevronLeft, Loader2, Package
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getWeekDates, DAY_NAMES, aggregateShoppingList, markFridgeItems } from '../lib/mealPlan'
import {
  fetchMealPlan, fetchRecipes, fetchShoppingList, upsertShoppingItems,
  toggleShoppingItem, addManualShoppingItem, deleteShoppingList, fetchFridgeIngredients
} from '../lib/supabase'

export default function ShoppingListPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const weekStart = searchParams.get('week') || ''

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Manual item form
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('')
  const [addingManual, setAddingManual] = useState(false)

  const weekLabel = useMemo(() => {
    if (!weekStart) return ''
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    return `${fmt(start)} - ${fmt(end)}, ${end.getFullYear()}`
  }, [weekStart])

  const loadExistingList = useCallback(async () => {
    if (!weekStart) return
    setLoading(true)
    try {
      const data = await fetchShoppingList(weekStart)
      setItems(data || [])
    } catch (err) {
      console.error('Failed to load shopping list:', err)
      setError('Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { loadExistingList() }, [loadExistingList])

  async function generateList() {
    setGenerating(true)
    setError(null)
    try {
      // 1. Delete existing auto-generated items
      await deleteShoppingList(weekStart)

      // 2. Fetch meal plan for the week
      const mealPlanEntries = await fetchMealPlan(weekStart)
      if (!mealPlanEntries || mealPlanEntries.length === 0) {
        setError('No meals planned for this week. Add meals to your meal plan first.')
        setGenerating(false)
        await loadExistingList()
        return
      }

      // 3. Fetch full recipe details for each recipe_id
      const recipeIds = [...new Set(mealPlanEntries.filter(e => e.recipe_id).map(e => e.recipe_id))]
      let fullRecipes = []
      if (recipeIds.length > 0) {
        const allRecipes = await fetchRecipes()
        fullRecipes = allRecipes.filter(r => recipeIds.includes(r.id))
      }

      // 4. Aggregate ingredients
      const aggregated = aggregateShoppingList(mealPlanEntries, fullRecipes)

      // 5. Cross-reference fridge
      const fridgeItems = await fetchFridgeIngredients()
      const markedItems = markFridgeItems(aggregated, fridgeItems || [])

      // 6. Save to DB
      const dbItems = markedItems.map(item => ({
        meal_plan_week: weekStart,
        ingredient_name: item.ingredient_name,
        total_quantity: item.total_quantity,
        unit: item.unit,
        in_fridge: item.inFridge,
        fridge_quantity: item.fridgeQuantity || null,
        fridge_unit: item.fridgeUnit || null,
        is_checked: false,
        is_manual: false,
      }))

      if (dbItems.length > 0) {
        await upsertShoppingItems(dbItems)
      }

      // 7. Reload
      await loadExistingList()
    } catch (err) {
      console.error('Failed to generate shopping list:', err)
      setError('Failed to generate shopping list. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleToggle(item) {
    try {
      await toggleShoppingItem(item.id, !item.is_checked)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i))
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  async function handleAddManual(e) {
    e.preventDefault()
    if (!manualName.trim()) return
    setAddingManual(true)
    try {
      const newItem = await addManualShoppingItem(
        weekStart,
        manualName.trim(),
        manualQty ? parseFloat(manualQty) : null,
        manualUnit.trim() || null
      )
      setItems(prev => [...prev, newItem])
      setManualName('')
      setManualQty('')
      setManualUnit('')
    } catch (err) {
      console.error('Failed to add manual item:', err)
    } finally {
      setAddingManual(false)
    }
  }

  // Separate items into needed and in-fridge
  const { neededItems, fridgeItems, checkedCount, totalCount } = useMemo(() => {
    const needed = items.filter(i => !i.in_fridge).sort((a, b) => {
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
      return a.ingredient_name.localeCompare(b.ingredient_name)
    })
    const fridge = items.filter(i => i.in_fridge).sort((a, b) =>
      a.ingredient_name.localeCompare(b.ingredient_name)
    )
    return {
      neededItems: needed,
      fridgeItems: fridge,
      checkedCount: items.filter(i => i.is_checked).length,
      totalCount: items.length,
    }
  }, [items])

  if (!weekStart) {
    return (
      <div className="text-center py-20">
        <ShoppingCart size={48} className="mx-auto text-warm-300 mb-4" />
        <h1 className="text-2xl font-display font-bold text-warm-700 mb-2">Shopping List</h1>
        <p className="text-warm-400 mb-4">No week selected. Go to the Meal Planner to generate a shopping list.</p>
        <Link to="/meal-planner" className="kitchen-btn kitchen-btn-primary inline-flex items-center gap-2">
          <ChevronLeft size={16} /> Go to Meal Planner
        </Link>
      </div>
    )
  }

  return (
    <div className="shopping-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 no-print">
        <div>
          <Link to="/meal-planner" className="text-sm text-warm-400 hover:text-warm-600 flex items-center gap-1 mb-1">
            <ChevronLeft size={14} /> Back to Meal Planner
          </Link>
          <h1 className="text-3xl font-display font-bold text-warm-800">Shopping List</h1>
          <p className="text-warm-500 text-sm mt-1">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateList}
            disabled={generating}
            className="kitchen-btn kitchen-btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {items.length > 0 ? 'Regenerate' : 'Generate'}
          </button>
          <button onClick={() => window.print()} className="kitchen-btn kitchen-btn-secondary flex items-center gap-1 text-sm">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm no-print">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-warm-400 text-lg">Loading shopping list...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={48} className="mx-auto text-warm-300 mb-4" />
          <p className="text-warm-400 mb-4">No shopping list generated yet for this week.</p>
          <button
            onClick={generateList}
            disabled={generating}
            className="kitchen-btn kitchen-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            Generate from Meal Plan
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-4 no-print">
            <div className="flex items-center justify-between text-sm text-warm-500 mb-1">
              <span>{checkedCount} of {totalCount} items checked</span>
              <span>{Math.round((checkedCount / totalCount) * 100)}%</span>
            </div>
            <div className="w-full bg-warm-100 rounded-full h-2">
              <div
                className="bg-kitchen-green rounded-full h-2 transition-all"
                style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Needed items */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-100 mb-4">
            <div className="px-4 py-3 border-b border-warm-100">
              <h2 className="font-semibold text-warm-700 text-sm">
                To Buy ({neededItems.length})
              </h2>
            </div>
            <ul className="divide-y divide-warm-50">
              {neededItems.map(item => (
                <li
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-warm-50 transition-colors ${
                    item.is_checked ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.is_checked
                      ? 'bg-kitchen-green border-kitchen-green'
                      : 'border-warm-300'
                  }`}>
                    {item.is_checked && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${item.is_checked ? 'line-through text-warm-400' : 'text-warm-800'}`}>
                      {item.ingredient_name}
                    </span>
                  </div>
                  <span className="text-sm text-warm-400 flex-shrink-0">
                    {item.total_quantity ? `${item.total_quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
                  </span>
                  {item.is_manual && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-warm-100 text-warm-500 rounded-full flex-shrink-0">manual</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Already have (fridge) */}
          {fridgeItems.length > 0 && (
            <div className="bg-white/60 rounded-xl shadow-sm border border-warm-100 mb-4">
              <div className="px-4 py-3 border-b border-warm-100 flex items-center gap-2">
                <Package size={15} className="text-warm-400" />
                <h2 className="font-semibold text-warm-500 text-sm">
                  Already Have ({fridgeItems.length})
                </h2>
              </div>
              <ul className="divide-y divide-warm-50">
                {fridgeItems.map(item => (
                  <li
                    key={item.id}
                    onClick={() => handleToggle(item)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-warm-50 transition-colors opacity-60"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.is_checked
                        ? 'bg-kitchen-green border-kitchen-green'
                        : 'border-warm-300'
                    }`}>
                      {item.is_checked && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${item.is_checked ? 'line-through text-warm-400' : 'text-warm-600'}`}>
                        {item.ingredient_name}
                      </span>
                      {item.fridge_quantity && (
                        <span className="text-xs text-warm-400 ml-2">
                          (have {item.fridge_quantity}{item.fridge_unit ? ` ${item.fridge_unit}` : ''})
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-warm-400 flex-shrink-0">
                      {item.total_quantity ? `${item.total_quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add manual item */}
          {isAuthenticated && (
            <form onSubmit={handleAddManual} className="bg-white rounded-xl shadow-sm border border-warm-100 p-4 mb-4 no-print">
              <h3 className="text-sm font-semibold text-warm-600 mb-3 flex items-center gap-1.5">
                <Plus size={14} /> Add Item Manually
              </h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Item name"
                  required
                  className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-warm-200 text-sm focus:border-kitchen-green focus:outline-none"
                />
                <input
                  type="number"
                  value={manualQty}
                  onChange={e => setManualQty(e.target.value)}
                  placeholder="Qty"
                  step="any"
                  className="w-20 px-3 py-2 rounded-lg border border-warm-200 text-sm focus:border-kitchen-green focus:outline-none"
                />
                <input
                  type="text"
                  value={manualUnit}
                  onChange={e => setManualUnit(e.target.value)}
                  placeholder="Unit"
                  className="w-20 px-3 py-2 rounded-lg border border-warm-200 text-sm focus:border-kitchen-green focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingManual || !manualName.trim()}
                  className="kitchen-btn kitchen-btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                  {addingManual ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Print view */}
      <div className="print-only">
        <h1 className="text-xl font-bold mb-1 text-center">Shopping List</h1>
        <p className="text-center text-sm mb-4 text-gray-500">{weekLabel}</p>
        <div style={{ columns: 2, columnGap: '2rem' }}>
          {neededItems.length > 0 && (
            <div style={{ breakInside: 'avoid' }}>
              <h2 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">To Buy</h2>
              <ul className="mb-4">
                {neededItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 py-1 text-sm" style={{ breakInside: 'avoid' }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #999', borderRadius: 2, flexShrink: 0 }} />
                    <span>{item.ingredient_name}</span>
                    {item.total_quantity && (
                      <span className="text-gray-500 ml-auto">
                        {item.total_quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fridgeItems.length > 0 && (
            <div style={{ breakInside: 'avoid' }}>
              <h2 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1 text-gray-500">Already Have</h2>
              <ul>
                {fridgeItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 py-1 text-sm text-gray-400" style={{ breakInside: 'avoid' }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #ccc', borderRadius: 2, flexShrink: 0 }} />
                    <span>{item.ingredient_name}</span>
                    {item.total_quantity && (
                      <span className="ml-auto">
                        {item.total_quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .shopping-list { padding: 0; }
          @page { size: A4; margin: 1.5cm; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
    </div>
  )
}

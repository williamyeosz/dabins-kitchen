import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Play, Shuffle, Edit, Clock, ChefHat, Scale, X, Trash2 } from 'lucide-react'
import { fetchRecipe, trashRecipe, restoreRecipe } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUnitPreference } from '../hooks/useUnitPreference'
import { toCanonical, formatQuantity } from '../lib/units'
import IngredientList from '../components/IngredientList'
import ServingScaler from '../components/ServingScaler'
import UnitToggle from '../components/UnitToggle'
import StepViewer from '../components/StepViewer'
import NutritionPanel from '../components/NutritionPanel'
import NotesList from '../components/NotesList'
import RatingWidget from '../components/RatingWidget'
import CookingMode from '../components/CookingMode'
import SubstitutionModal from '../components/SubstitutionModal'

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-700',
  hard: 'bg-red-100 text-red-700',
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { metricFirst, toggle: toggleUnits } = useUnitPreference()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [servings, setServings] = useState(null)
  const [cookingMode, setCookingMode] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)
  const [lang, setLang] = useState('en')
  const [selectedMethodId, setSelectedMethodId] = useState(null)
  const [scaleByIngredient, setScaleByIngredient] = useState(null) // { ingredientId, ingredientName, quantity, unit, ratio }
  const [scalePanel, setScalePanel] = useState(null) // { ingredient, inputQty, inputUnit } — transient panel state

  useEffect(() => {
    setLoading(true)
    fetchRecipe(id)
      .then(data => {
        setRecipe(data)
        setServings(data.default_serving_size || data.base_servings)
        setSelectedMethodId(data.default_cooking_method_id || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleRecipeUpdate = useCallback((updated) => {
    setRecipe(prev => ({ ...prev, ...updated }))
  }, [])

  const handleNotesUpdate = useCallback((notes) => {
    setRecipe(prev => ({ ...prev, recipe_notes: notes }))
  }, [])

  const handleDelete = async () => {
    if (!window.confirm(`Move "${recipe.title}" to trash? You can restore it within 30 days.`)) return
    setDeleting(true)
    try {
      await trashRecipe(id)
      navigate('/')
    } catch (err) {
      console.error(err)
      alert('Failed to move recipe to trash')
      setDeleting(false)
    }
  }

  const handleRestore = async () => {
    try {
      await restoreRecipe(id)
      setRecipe(prev => ({ ...prev, deleted_at: null }))
    } catch (err) {
      console.error(err)
      alert('Failed to restore recipe')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-warm-400">Loading recipe...</div>
  }

  if (!recipe) {
    return <div className="text-center py-20 text-warm-400">Recipe not found</div>
  }

  // Language support
  const langNotes = recipe.language_notes || {}
  const availableLangs = ['en', ...Object.keys(langNotes)]
  const showLangToggle = Object.keys(langNotes).length > 0

  // Cooking method variations
  const methods = recipe.cooking_methods || []
  const hasMultipleMethods = methods.length > 0
  const methodOptions = [
    { id: null, name: 'Default', cook_time_minutes: recipe.cook_time_minutes },
    ...methods.map(m => ({ id: m.id, name: m.name, cook_time_minutes: m.cook_time_minutes })),
  ]
  const selectedMethod = methodOptions.find(m => m.id === selectedMethodId) || methodOptions[0]
  const effectiveCookTime = selectedMethod.cook_time_minutes ?? recipe.cook_time_minutes

  const getTitle = () => {
    if (lang !== 'en' && langNotes[lang]?.title) return langNotes[lang].title
    return recipe.title
  }

  const getSteps = () => {
    if (lang !== 'en' && langNotes[lang]?.steps) {
      return langNotes[lang].steps.map((instruction, i) => ({
        id: `lang-${i}`,
        step_number: i + 1,
        instruction,
      }))
    }
    const allSteps = recipe.steps || []
    return allSteps.filter(s => (s.cooking_method_id || null) === selectedMethodId)
  }

  if (cookingMode) {
    return (
      <CookingMode
        recipe={{ ...recipe, cook_time_minutes: effectiveCookTime }}
        steps={getSteps()}
        ingredients={recipe.ingredients || []}
        baseServings={recipe.base_servings}
        currentServings={servings}
        metricFirst={metricFirst}
        onExit={() => setCookingMode(false)}
        methodName={selectedMethod.name !== 'Default' ? selectedMethod.name : null}
      />
    )
  }

  const steps = getSteps()
  const tags = recipe.recipe_tags?.map(rt => rt.tags).filter(Boolean) || []

  // Scale-by-ingredient helpers
  const handleIngredientClick = (ing) => {
    // Pre-fill with the ingredient's original unit if it has one
    const defaultUnit = ing.unit || ing.canonical_unit || ''
    setScalePanel({ ingredient: ing, inputQty: '', inputUnit: defaultUnit })
  }

  const applyScaleByIngredient = () => {
    if (!scalePanel || !scalePanel.inputQty) return
    const ing = scalePanel.ingredient
    const userQty = parseFloat(scalePanel.inputQty)
    if (!userQty || userQty <= 0) return

    const userUnit = scalePanel.inputUnit.trim()

    // Convert user input to canonical
    const userCanonical = toCanonical(userQty, userUnit)

    // Get the recipe's canonical amount for this ingredient (at base servings)
    const recipeCanonicalQty = ing.canonical_quantity

    let ratio
    if (userCanonical.quantity != null && recipeCanonicalQty) {
      // Both convertible to canonical — compare in canonical units
      ratio = userCanonical.quantity / recipeCanonicalQty
    } else if (ing.quantity) {
      // Fallback: compare raw quantities (same unit assumed)
      ratio = userQty / ing.quantity
    } else {
      return // Can't calculate ratio
    }

    setScaleByIngredient({
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: userQty,
      unit: userUnit,
      ratio,
    })
    setScalePanel(null)
  }

  const resetScaleByIngredient = () => {
    setScaleByIngredient(null)
    setScalePanel(null)
  }

  return (
    <div>
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-display font-bold">{getTitle()}</h1>
        <div className="text-sm text-gray-500 mt-1">
          {recipe.cuisine} | {recipe.cook_time_minutes} min | {recipe.difficulty} | Servings: {servings}
        </div>
      </div>

      {/* Top actions */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Link to="/" className="kitchen-btn flex items-center gap-2 text-warm-500 hover:text-warm-700">
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          {showLangToggle && (
            <div className="flex rounded-lg border-2 border-warm-200 overflow-hidden">
              {[{ code: 'en', label: 'EN' }, { code: 'zh', label: '中文' }, { code: 'ko', label: '한국어' }]
                .filter(l => l.code === 'en' || langNotes[l.code])
                .map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`px-3 py-1.5 text-sm font-medium ${
                      lang === l.code ? 'bg-kitchen-green text-white' : 'text-warm-500 hover:bg-warm-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
            </div>
          )}
          <UnitToggle metricFirst={metricFirst} onToggle={toggleUnits} />
          <button onClick={() => window.print()} className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-500">
            <Printer size={20} />
          </button>
          {isAuthenticated && (
            <>
              <Link to={`/recipes/${id}/edit`} className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-500">
                <Edit size={20} />
              </Link>
              <button
                onMouseDown={e => { e.preventDefault(); handleDelete() }}
                disabled={deleting}
                className="kitchen-btn p-2 rounded-lg hover:bg-red-50 text-warm-400 hover:text-red-500 transition-colors"
                title="Delete recipe"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trash banner */}
      {recipe.deleted_at && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between no-print">
          <span>This recipe is in the trash. It will be permanently deleted on {new Date(new Date(recipe.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.</span>
          <button
            onMouseDown={e => { e.preventDefault(); handleRestore() }}
            className="kitchen-btn ml-3 px-3 py-1.5 rounded-lg bg-kitchen-green text-white text-sm font-medium hover:bg-kitchen-green/90 shrink-0"
          >
            Restore
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="mb-8">
        {recipe.image_url && (
          <div className="rounded-2xl overflow-hidden mb-6 max-h-96">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-display font-bold text-warm-800 no-print">{getTitle()}</h1>
        {recipe.description && (
          <p className="text-warm-500 text-lg mt-2">{recipe.description}</p>
        )}

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {recipe.cuisine && (
            <span className="px-3 py-1 rounded-full bg-warm-100 text-warm-600 text-sm">{recipe.cuisine}</span>
          )}
          {recipe.difficulty && (
            <span className={`px-3 py-1 rounded-full text-sm ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
          )}
          {effectiveCookTime && (
            <span className="flex items-center gap-1 text-sm text-warm-500">
              <Clock size={16} />
              {effectiveCookTime} min
            </span>
          )}
          {tags.map(tag => (
            <span key={tag.id} className="px-2 py-0.5 rounded-full bg-warm-50 text-warm-400 text-xs">{tag.name}</span>
          ))}
        </div>
      </div>

      {/* Start Cooking button */}
      <button
        onClick={() => setCookingMode(true)}
        className="kitchen-btn w-full sm:w-auto mb-8 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-kitchen-green text-white font-semibold text-lg hover:bg-kitchen-green/90 transition-colors no-print"
      >
        <Play size={24} />
        Start Cooking
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column — ingredients + nutrition */}
        <div className="space-y-6">
          <div className="no-print">
            <ServingScaler
              baseServings={recipe.base_servings}
              currentServings={servings}
              onChange={setServings}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-warm-800">Ingredients</h2>
              {!scaleByIngredient && !scalePanel && (
                <button
                  onMouseDown={e => { e.preventDefault(); setScalePanel({ ingredient: null, inputQty: '', inputUnit: '' }) }}
                  className="kitchen-btn flex items-center gap-1.5 text-sm text-warm-500 hover:text-kitchen-green transition-colors no-print"
                  title="Scale all ingredients based on one ingredient amount"
                >
                  <Scale size={16} />
                  Scale by ingredient
                </button>
              )}
            </div>

            {/* Scale-by-ingredient indicator */}
            {scaleByIngredient && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-kitchen-green/10 border border-kitchen-green/30 no-print">
                <Scale size={16} className="text-kitchen-green shrink-0" />
                <span className="text-sm text-warm-700 flex-1">
                  Scaled to match: <strong>{formatQuantity(scaleByIngredient.quantity)} {scaleByIngredient.unit} {scaleByIngredient.ingredientName}</strong>
                </span>
                <button
                  onMouseDown={e => { e.preventDefault(); resetScaleByIngredient() }}
                  className="kitchen-btn p-1 rounded-full hover:bg-warm-200 text-warm-500 transition-colors"
                  title="Reset to serving-based scaling"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Scale-by-ingredient panel */}
            {scalePanel && (
              <div className="mb-3 p-3 rounded-xl border-2 border-kitchen-green/40 bg-warm-50 space-y-3 no-print">
                <div className="text-sm font-medium text-warm-700">
                  {scalePanel.ingredient
                    ? <>How much <strong>{scalePanel.ingredient.name}</strong> do you have?</>
                    : 'Click an ingredient below to scale by it, or pick one:'}
                </div>
                {!scalePanel.ingredient && (
                  <select
                    className="w-full px-3 py-2 rounded-lg border-2 border-warm-200 text-sm bg-white text-warm-800 focus:border-kitchen-green focus:outline-none"
                    value=""
                    onChange={e => {
                      const ing = (recipe.ingredients || []).find(i => i.id === e.target.value)
                      if (ing) handleIngredientClick(ing)
                    }}
                  >
                    <option value="" disabled>Select ingredient...</option>
                    {(recipe.ingredients || [])
                      .filter(i => i.canonical_quantity || i.quantity)
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                      .map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                  </select>
                )}
                {scalePanel.ingredient && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Amount"
                      value={scalePanel.inputQty}
                      onChange={e => setScalePanel(prev => ({ ...prev, inputQty: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border-2 border-warm-200 text-sm bg-white text-warm-800 focus:border-kitchen-green focus:outline-none"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={scalePanel.inputUnit}
                      onChange={e => setScalePanel(prev => ({ ...prev, inputUnit: e.target.value }))}
                      className="w-20 px-3 py-2 rounded-lg border-2 border-warm-200 text-sm bg-white text-warm-800 focus:border-kitchen-green focus:outline-none"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {scalePanel.ingredient && (
                    <button
                      onMouseDown={e => { e.preventDefault(); applyScaleByIngredient() }}
                      className="kitchen-btn flex-1 px-4 py-2 rounded-lg bg-kitchen-green text-white text-sm font-medium hover:bg-kitchen-green/90 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                  <button
                    onMouseDown={e => { e.preventDefault(); setScalePanel(null) }}
                    className="kitchen-btn px-4 py-2 rounded-lg border-2 border-warm-200 text-warm-500 text-sm font-medium hover:border-warm-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <IngredientList
              ingredients={recipe.ingredients || []}
              baseServings={recipe.base_servings}
              currentServings={servings}
              metricFirst={metricFirst}
              customScale={scaleByIngredient ? scaleByIngredient.ratio : null}
              anchorIngredientId={scaleByIngredient ? scaleByIngredient.ingredientId : null}
              onIngredientClick={scalePanel && !scalePanel.ingredient ? handleIngredientClick : null}
            />
          </div>

          <div className="no-print">
            <button
              onMouseDown={e => { e.preventDefault(); setShowSubstitution(true) }}
              className="kitchen-btn w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-warm-200 text-warm-600 hover:border-kitchen-green hover:text-kitchen-green transition-colors"
            >
              <Shuffle size={18} />
              Substitutions
            </button>
          </div>

          <NutritionPanel
            ingredients={recipe.ingredients || []}
            baseServings={recipe.base_servings}
            currentServings={servings}
          />
        </div>

        {/* Right column — steps + notes + rating */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-display text-xl font-semibold text-warm-800 mb-4">Steps</h2>
            {hasMultipleMethods && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {methodOptions.map(m => (
                  <button
                    key={m.id ?? 'default'}
                    onClick={() => setSelectedMethodId(m.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMethodId === m.id
                        ? 'bg-kitchen-green text-white'
                        : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                    }`}
                  >
                    {m.name}
                    {m.cook_time_minutes && m.id !== null && (
                      <span className="ml-1 opacity-70">({m.cook_time_minutes}m)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <StepViewer steps={steps} ingredients={recipe.ingredients || []} baseServings={recipe.base_servings} currentServings={servings} />
          </div>

          <NotesList
            recipeId={recipe.id}
            notes={recipe.recipe_notes || []}
            isAuthenticated={isAuthenticated}
            onUpdate={handleNotesUpdate}
          />

          {isAuthenticated && (
            <RatingWidget
              recipeId={recipe.id}
              currentRating={recipe.last_cooked_rating}
              lastCookedAt={recipe.last_cooked_at}
              onUpdate={handleRecipeUpdate}
            />
          )}
        </div>
      </div>

      {/* Substitution modal */}
      {showSubstitution && (
        <SubstitutionModal
          recipe={recipe}
          ingredients={recipe.ingredients || []}
          onClose={() => setShowSubstitution(false)}
        />
      )}
    </div>
  )
}

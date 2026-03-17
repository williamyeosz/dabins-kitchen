import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Play, Shuffle, Edit, Clock, ChefHat } from 'lucide-react'
import { fetchRecipe } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUnitPreference } from '../hooks/useUnitPreference'
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
  const { isAuthenticated } = useAuth()
  const { metricFirst, toggle: toggleUnits } = useUnitPreference()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState(null)
  const [cookingMode, setCookingMode] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)
  const [lang, setLang] = useState('en')

  useEffect(() => {
    setLoading(true)
    fetchRecipe(id)
      .then(data => {
        setRecipe(data)
        setServings(data.default_serving_size || data.base_servings)
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
    return recipe.steps || []
  }

  if (cookingMode) {
    return (
      <CookingMode
        recipe={recipe}
        steps={getSteps()}
        ingredients={recipe.ingredients || []}
        baseServings={recipe.base_servings}
        currentServings={servings}
        metricFirst={metricFirst}
        onExit={() => setCookingMode(false)}
      />
    )
  }

  const steps = getSteps()
  const tags = recipe.recipe_tags?.map(rt => rt.tags).filter(Boolean) || []

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
            <Link to={`/recipes/${id}/edit`} className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-500">
              <Edit size={20} />
            </Link>
          )}
        </div>
      </div>

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
          {recipe.cook_time_minutes && (
            <span className="flex items-center gap-1 text-sm text-warm-500">
              <Clock size={16} />
              {recipe.cook_time_minutes} min
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
            <h2 className="font-display text-xl font-semibold text-warm-800 mb-4">Ingredients</h2>
            <IngredientList
              ingredients={recipe.ingredients || []}
              baseServings={recipe.base_servings}
              currentServings={servings}
              metricFirst={metricFirst}
            />
          </div>

          <div className="no-print">
            <button
              onClick={() => setShowSubstitution(true)}
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
            <StepViewer steps={steps} />
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

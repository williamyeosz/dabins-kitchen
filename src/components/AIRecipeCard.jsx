import { Clock, ChefHat, Plus, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-700',
  hard: 'bg-red-100 text-red-700',
}

export default function AIRecipeCard({ recipe, onAddToBook }) {
  const navigate = useNavigate()

  const handleAddToBook = () => {
    // Navigate to recipe form with pre-filled data
    navigate('/recipes/new', { state: { prefill: recipe } })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
      <div className="aspect-[4/3] bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center relative">
        <ChefHat size={48} className="text-white/60" />
        <span className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5 text-xs font-medium text-purple-600">
          <Sparkles size={12} />
          AI Suggestion
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-warm-800 line-clamp-1">{recipe.title}</h3>

        {recipe.description && (
          <p className="text-sm text-warm-500 mt-1 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {recipe.cuisine && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600">{recipe.cuisine}</span>
          )}
          {recipe.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
          )}
        </div>

        {recipe.cook_time_minutes && (
          <div className="flex items-center gap-1 mt-2 text-sm text-warm-500">
            <Clock size={14} />
            <span>{recipe.cook_time_minutes} min</span>
          </div>
        )}

        <button
          onClick={handleAddToBook}
          className="kitchen-btn w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-kitchen-green text-white font-medium text-sm hover:bg-kitchen-green/90 transition-colors"
        >
          <Plus size={16} />
          Add to Book
        </button>
      </div>
    </div>
  )
}

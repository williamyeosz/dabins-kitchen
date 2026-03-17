import { Link } from 'react-router-dom'
import { Clock, Star, ChefHat } from 'lucide-react'

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-700',
  hard: 'bg-red-100 text-red-700',
}

const CUISINE_COLORS = {
  Korean: 'from-red-400 to-orange-400',
  Cantonese: 'from-amber-400 to-yellow-400',
  Japanese: 'from-pink-400 to-red-300',
  Thai: 'from-green-400 to-lime-400',
  Western: 'from-blue-400 to-indigo-400',
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return `${Math.floor(diff / 30)} months ago`
}

export default function RecipeCard({ recipe }) {
  const gradient = CUISINE_COLORS[recipe.cuisine] || 'from-warm-400 to-warm-500'
  const tags = recipe.recipe_tags?.map(rt => rt.tags?.name).filter(Boolean) || []

  return (
    <Link to={`/recipes/${recipe.id}`} className="group block">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-warm-100">
        {/* Image or gradient placeholder */}
        {recipe.image_url ? (
          <div className="aspect-[4/3] overflow-hidden">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <ChefHat size={48} className="text-white/60" />
          </div>
        )}

        <div className="p-4">
          <h3 className="font-display text-lg font-semibold text-warm-800 group-hover:text-kitchen-green transition-colors line-clamp-1">
            {recipe.title}
          </h3>

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

          <div className="flex items-center justify-between mt-3 text-sm text-warm-500">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{recipe.cook_time_minutes} min</span>
            </div>
            {recipe.last_cooked_rating && (
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-kitchen-orange text-kitchen-orange" />
                <span>{recipe.last_cooked_rating}</span>
              </div>
            )}
          </div>

          {recipe.last_cooked_at && (
            <p className="text-xs text-warm-400 mt-2">Cooked {timeAgo(recipe.last_cooked_at)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

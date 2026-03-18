import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import {
  fetchTrashedRecipes, restoreRecipe, purgeExpiredTrash,
  deleteRecipe, deleteIngredientsByRecipe, deleteStepsByRecipe,
  deleteNotesByRecipe, deleteCookingMethodsByRecipe, setRecipeTags,
} from '../lib/supabase'

export default function TrashPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    purgeExpiredTrash().catch(console.error)
    fetchTrashedRecipes()
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRestore = async (id) => {
    try {
      await restoreRecipe(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to restore recipe')
    }
  }

  const handlePermanentDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    try {
      await deleteCookingMethodsByRecipe(id)
      await Promise.all([
        deleteIngredientsByRecipe(id),
        deleteStepsByRecipe(id),
        deleteNotesByRecipe(id),
        setRecipeTags(id, []),
      ])
      await deleteRecipe(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete recipe')
    }
  }

  const daysRemaining = (deletedAt) => {
    const days = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, days)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-warm-800 mb-2 flex items-center gap-3">
          <Trash2 size={32} />
          Trash
        </h1>
        <p className="text-warm-500">Deleted recipes are kept for 30 days before being permanently removed.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-warm-400 text-lg">Loading...</div>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 text-warm-400">
          <Trash2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => (
            <div key={recipe.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-warm-200">
              {recipe.image_url ? (
                <img src={recipe.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-warm-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link to={`/recipes/${recipe.id}`} className="font-display font-semibold text-warm-800 hover:text-kitchen-green truncate block">
                  {recipe.title}
                </Link>
                <div className="text-sm text-warm-400">
                  {recipe.cuisine && <span>{recipe.cuisine} · </span>}
                  <span>{daysRemaining(recipe.deleted_at)} days remaining</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onMouseDown={e => { e.preventDefault(); handleRestore(recipe.id) }}
                  className="kitchen-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-kitchen-green text-white hover:bg-kitchen-green/90 transition-colors"
                >
                  <RotateCcw size={16} />
                  <span className="hidden sm:inline">Restore</span>
                </button>
                <button
                  onMouseDown={e => { e.preventDefault(); handlePermanentDelete(recipe.id, recipe.title) }}
                  className="kitchen-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <AlertTriangle size={16} />
                  <span className="hidden sm:inline">Delete Forever</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

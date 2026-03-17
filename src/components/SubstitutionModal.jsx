import { useState } from 'react'
import { X, Loader, Sparkles } from 'lucide-react'
import { suggestSubstitutions } from '../lib/ai'

export default function SubstitutionModal({ recipe, ingredients, onClose }) {
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [substitutions, setSubstitutions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSelect = async (ingredient) => {
    setSelectedIngredient(ingredient)
    setSubstitutions(null)
    setError(null)
    setLoading(true)
    try {
      const result = await suggestSubstitutions(
        ingredient.name,
        recipe.title,
        ingredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
      )
      setSubstitutions(result)
    } catch (e) {
      setError('Failed to get substitutions. Please try again.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-kitchen-orange" />
            <h3 className="font-display font-semibold text-warm-800">Substitutions</h3>
          </div>
          <button onClick={onClose} className="kitchen-btn p-2 hover:bg-warm-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {!selectedIngredient ? (
            <>
              <p className="text-sm text-warm-500 mb-3">Tap an ingredient you'd like to substitute:</p>
              <div className="space-y-1">
                {ingredients
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map(ing => (
                    <button
                      key={ing.id}
                      onClick={() => handleSelect(ing)}
                      className="kitchen-btn w-full text-left px-4 py-3 rounded-lg hover:bg-warm-50 text-warm-700 transition-colors"
                    >
                      {ing.name}
                      {ing.quantity && <span className="text-warm-400 ml-2 text-sm">({ing.quantity} {ing.unit})</span>}
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setSelectedIngredient(null); setSubstitutions(null); setError(null) }}
                className="text-sm text-kitchen-green hover:underline mb-3 inline-block"
              >
                &larr; Choose different ingredient
              </button>

              <p className="text-warm-600 mb-4">
                Substitutes for <span className="font-semibold">{selectedIngredient.name}</span>:
              </p>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader size={24} className="animate-spin text-kitchen-green" />
                  <span className="ml-2 text-warm-500">Thinking...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-kitchen-red rounded-lg p-3 text-sm">{error}</div>
              )}

              {substitutions && (
                <div className="space-y-3">
                  {substitutions.map((sub, i) => (
                    <div key={i} className="bg-warm-50 rounded-xl p-4">
                      <h4 className="font-semibold text-warm-800">{sub.substitute}</h4>
                      <p className="text-sm text-kitchen-green font-medium mt-1">{sub.quantity_adjustment}</p>
                      <p className="text-sm text-warm-500 mt-1">{sub.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-warm-100 text-xs text-warm-300 text-center shrink-0">
          Powered by Claude
        </div>
      </div>
    </div>
  )
}

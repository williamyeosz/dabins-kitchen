import { useState } from 'react'
import { Star, Check } from 'lucide-react'
import { markCooked } from '../lib/supabase'

export default function RatingWidget({ recipeId, currentRating, lastCookedAt, onUpdate }) {
  const [hoveredStar, setHoveredStar] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleRate = async (rating) => {
    setSaving(true)
    try {
      const updated = await markCooked(recipeId, rating)
      onUpdate?.(updated)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (e) {
      console.error('Failed to save rating:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <h3 className="font-display font-semibold text-warm-800 mb-2">Cook & Rate</h3>

      {lastCookedAt && (
        <p className="text-sm text-warm-500 mb-3">
          Last cooked: {new Date(lastCookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleRate(star)}
            disabled={saving}
            className="kitchen-btn p-1 transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`transition-colors ${
                star <= (hoveredStar || currentRating || 0)
                  ? 'fill-kitchen-orange text-kitchen-orange'
                  : 'text-warm-300'
              }`}
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-warm-400">
        Tap a star to mark as cooked today with that rating
      </p>

      {showSuccess && (
        <div className="flex items-center gap-2 mt-2 text-sm text-kitchen-green">
          <Check size={16} />
          <span>Saved!</span>
        </div>
      )}
    </div>
  )
}

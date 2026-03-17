import { Minus, Plus } from 'lucide-react'

export default function ServingScaler({ baseServings, currentServings, onChange }) {
  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="text-sm text-warm-500 mb-2">
        Original recipe: {baseServings} servings
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-warm-700">Showing:</span>
        <button
          onClick={() => onChange(Math.max(1, currentServings - 1))}
          className="kitchen-btn w-12 h-12 rounded-full bg-white border-2 border-warm-200 flex items-center justify-center hover:border-kitchen-green hover:text-kitchen-green transition-colors text-warm-600"
        >
          <Minus size={20} />
        </button>
        <input
          type="number"
          min="1"
          max="50"
          value={currentServings}
          onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 h-12 text-center text-xl font-bold border-2 border-warm-200 rounded-xl bg-white text-warm-800 focus:border-kitchen-green focus:outline-none"
        />
        <button
          onClick={() => onChange(Math.min(50, currentServings + 1))}
          className="kitchen-btn w-12 h-12 rounded-full bg-white border-2 border-warm-200 flex items-center justify-center hover:border-kitchen-green hover:text-kitchen-green transition-colors text-warm-600"
        >
          <Plus size={20} />
        </button>
        <span className="text-sm font-medium text-warm-700">servings</span>
      </div>
    </div>
  )
}

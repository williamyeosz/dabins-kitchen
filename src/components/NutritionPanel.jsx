import { calculateRecipeNutrition } from '../lib/nutrition'
import { AlertTriangle, Info } from 'lucide-react'

export default function NutritionPanel({ ingredients, baseServings, currentServings }) {
  const nutrition = calculateRecipeNutrition(ingredients, baseServings, currentServings)

  if (!nutrition) {
    return (
      <div className="bg-warm-50 rounded-xl p-4 text-sm text-warm-400">
        <p>No nutrition data available for this recipe.</p>
      </div>
    )
  }

  const items = [
    { label: 'Calories', value: nutrition.calories, unit: 'kcal', color: 'text-kitchen-orange' },
    { label: 'Protein', value: nutrition.protein, unit: 'g', color: 'text-kitchen-green' },
    { label: 'Carbs', value: nutrition.carbs, unit: 'g', color: 'text-blue-500' },
    { label: 'Fat', value: nutrition.fat, unit: 'g', color: 'text-yellow-600' },
    { label: 'Fibre', value: nutrition.fibre, unit: 'g', color: 'text-green-600' },
    { label: 'Sodium', value: nutrition.sodium, unit: 'mg', color: 'text-warm-500' },
  ]

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display font-semibold text-warm-800">Nutrition</h3>
        <span className="text-xs text-warm-400">per serving</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, unit, color }) => (
          <div key={label} className="text-center">
            <div className={`text-lg font-bold ${color}`}>
              {value}{unit === 'kcal' ? '' : unit}
            </div>
            <div className="text-xs text-warm-400">{label}{unit === 'kcal' ? ' kcal' : ''}</div>
          </div>
        ))}
      </div>

      {nutrition.isPartial && (
        <div className="flex items-center gap-2 mt-3 text-xs text-kitchen-orange">
          <AlertTriangle size={14} />
          <span>Partial data — some ingredients don't have nutrition info linked</span>
        </div>
      )}

      <div className="flex items-center gap-1 mt-3 text-xs text-warm-300">
        <Info size={12} />
        <span>Nutrition data from USDA FoodData Central</span>
      </div>
    </div>
  )
}

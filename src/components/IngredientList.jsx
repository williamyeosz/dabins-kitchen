import { AlertTriangle } from 'lucide-react'
import { scaleQuantity, displayDual, formatQuantity } from '../lib/units'

export default function IngredientList({
  ingredients, baseServings, currentServings, metricFirst = true,
  customScale = null, anchorIngredientId = null, onIngredientClick = null,
}) {
  return (
    <ul className="space-y-2">
      {ingredients
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(ing => {
          let scaledCanonical, scaledOriginal

          if (customScale != null) {
            // Scale by custom multiplier (from "scale by ingredient")
            scaledCanonical = ing.canonical_quantity
              ? ing.canonical_quantity * customScale
              : null
            scaledOriginal = ing.quantity
              ? ing.quantity * customScale
              : null
          } else {
            scaledCanonical = ing.canonical_quantity
              ? scaleQuantity(ing.canonical_quantity, baseServings, currentServings)
              : null
            scaledOriginal = ing.quantity
              ? scaleQuantity(ing.quantity, baseServings, currentServings)
              : null
          }

          const dual = scaledCanonical && ing.canonical_unit
            ? displayDual(scaledCanonical, ing.canonical_unit, metricFirst)
            : null

          const isAnchor = anchorIngredientId === ing.id
          const isClickable = onIngredientClick && (ing.canonical_quantity || ing.quantity)

          return (
            <li key={ing.id} className={`flex items-start gap-2 py-1 border-b border-warm-100 last:border-0 ${isAnchor ? 'bg-kitchen-green/10 -mx-2 px-2 rounded-lg' : ''}`}>
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isAnchor ? 'bg-kitchen-orange' : 'bg-kitchen-green'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isClickable ? (
                    <button
                      onMouseDown={e => { e.preventDefault(); onIngredientClick(ing) }}
                      className="font-medium text-warm-800 hover:text-kitchen-green hover:underline cursor-pointer text-left"
                    >
                      {ing.name}
                    </button>
                  ) : (
                    <span className="font-medium text-warm-800">{ing.name}</span>
                  )}
                  {isAnchor && (
                    <span className="text-xs text-kitchen-orange font-medium">(anchor)</span>
                  )}
                  {!ing.scales_linearly && (
                    <span className="inline-flex items-center gap-1 text-kitchen-orange" title={ing.notes || 'Adjust to taste — does not scale linearly'}>
                      <AlertTriangle size={14} />
                    </span>
                  )}
                </div>
                <div className="text-sm mt-0.5">
                  {dual ? (
                    <span>
                      <span className="text-warm-700 font-medium">{dual.primary}</span>
                      <span className="text-warm-400 ml-1.5">/ {dual.secondary}</span>
                    </span>
                  ) : scaledOriginal != null ? (
                    <span className="text-warm-700">{formatQuantity(scaledOriginal)} {ing.unit}</span>
                  ) : (
                    <span className="text-warm-400">{ing.unit || ''}</span>
                  )}
                </div>
                {ing.notes && (
                  <p className="text-xs text-warm-400 mt-0.5 italic">{ing.notes}</p>
                )}
              </div>
            </li>
          )
        })}
    </ul>
  )
}

import { convertTemperatures, scaleQuantity, formatQuantity } from '../lib/units'

export default function StepViewer({ steps, ingredients, baseServings, currentServings }) {
  if (!steps?.length) return null

  // Enrich step text with scaled ingredient quantities
  function enrichInstruction(text) {
    let result = convertTemperatures(text)
    if (!ingredients?.length) return result
    for (const ing of ingredients) {
      if (!ing.name || !ing.quantity) continue
      const regex = new RegExp(`\\b(${ing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
      const scaled = currentServings && baseServings
        ? scaleQuantity(ing.quantity, baseServings, currentServings)
        : ing.quantity
      const qtyStr = formatQuantity(scaled)
      result = result.replace(regex, `${qtyStr} ${ing.unit} $1`)
    }
    return result
  }

  return (
    <ol className="space-y-4">
      {steps
        .sort((a, b) => a.step_number - b.step_number)
        .map((step) => (
          <li key={step.id} className="flex gap-4">
            {step.is_optional ? (
              <span className="shrink-0 w-8 h-8 rounded-full border-2 border-dashed border-warm-300 text-warm-400 flex items-center justify-center text-sm font-bold">
                {step.step_number}
              </span>
            ) : (
              <span className="shrink-0 w-8 h-8 rounded-full bg-kitchen-green text-white flex items-center justify-center text-sm font-bold">
                {step.step_number}
              </span>
            )}
            <div className={`pt-1 ${step.is_optional ? 'border-l-2 border-dashed border-warm-300 pl-3' : ''}`}>
              {step.is_optional && (
                <span className="inline-block text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded mb-1">
                  (Optional)
                </span>
              )}
              <p className={`leading-relaxed ${step.is_optional ? 'text-warm-400' : 'text-warm-700'}`}>
                {enrichInstruction(step.instruction)}
              </p>
            </div>
          </li>
        ))}
    </ol>
  )
}

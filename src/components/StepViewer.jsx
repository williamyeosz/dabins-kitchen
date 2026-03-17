import { convertTemperatures } from '../lib/units'

export default function StepViewer({ steps }) {
  if (!steps?.length) return null

  return (
    <ol className="space-y-4">
      {steps
        .sort((a, b) => a.step_number - b.step_number)
        .map((step, i) => (
          <li key={step.id} className="flex gap-4">
            <span className="shrink-0 w-8 h-8 rounded-full bg-kitchen-green text-white flex items-center justify-center text-sm font-bold">
              {step.step_number}
            </span>
            <p className="text-warm-700 leading-relaxed pt-1">
              {convertTemperatures(step.instruction)}
            </p>
          </li>
        ))}
    </ol>
  )
}

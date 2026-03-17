import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Shuffle } from 'lucide-react'
import IngredientList from './IngredientList'
import SubstitutionModal from './SubstitutionModal'
import { convertTemperatures } from '../lib/units'

export default function CookingMode({ recipe, steps, ingredients, baseServings, currentServings, metricFirst, onExit }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)
  const [wakeLock, setWakeLock] = useState(null)

  // Request wake lock
  useEffect(() => {
    let lock = null
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen')
          setWakeLock(lock)
        }
      } catch (e) {
        console.log('Wake Lock not available:', e)
      }
    }
    requestWakeLock()

    // Re-acquire on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      lock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setCurrentStep(s => Math.min(s + 1, steps.length - 1))
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentStep(s => Math.max(s - 1, 0))
      }
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [steps.length, onExit])

  const step = steps[currentStep]
  const processedInstruction = convertTemperatures(step?.instruction || '')

  return (
    <div className="cooking-mode flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 shrink-0">
        <div>
          <h2 className="font-display text-lg font-bold text-warm-800">{recipe.title}</h2>
          <p className="text-sm text-warm-400">Step {currentStep + 1} of {steps.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubstitution(true)}
            className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-600"
            title="Ingredient substitutions"
          >
            <Shuffle size={20} />
          </button>
          <button
            onClick={onExit}
            className="kitchen-btn p-2 rounded-lg hover:bg-red-50 text-kitchen-red"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-warm-100 shrink-0">
        <div
          className="h-full bg-kitchen-green transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step content - takes remaining space */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed text-warm-800 text-center max-w-3xl font-display">
          {processedInstruction}
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 px-4 pb-4 shrink-0">
        <button
          onClick={() => setCurrentStep(s => Math.max(s - 1, 0))}
          disabled={currentStep === 0}
          className="kitchen-btn flex-1 py-5 rounded-2xl bg-warm-100 text-warm-600 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-30 active:bg-warm-200 transition-colors"
        >
          <ChevronLeft size={24} />
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(s => Math.min(s + 1, steps.length - 1))}
          disabled={currentStep === steps.length - 1}
          className="kitchen-btn flex-1 py-5 rounded-2xl bg-kitchen-green text-white font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-30 active:bg-kitchen-green/80 transition-colors"
        >
          Next
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Ingredient drawer toggle */}
      <button
        onClick={() => setShowIngredients(!showIngredients)}
        className="kitchen-btn flex items-center justify-center gap-2 py-3 bg-warm-50 border-t border-warm-200 text-warm-600 font-medium shrink-0"
      >
        {showIngredients ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        Ingredients
      </button>

      {/* Slide-up ingredient drawer */}
      {showIngredients && (
        <div className="border-t border-warm-200 bg-white px-4 py-4 max-h-[50vh] overflow-y-auto shrink-0">
          <IngredientList
            ingredients={ingredients}
            baseServings={baseServings}
            currentServings={currentServings}
            metricFirst={metricFirst}
          />
        </div>
      )}

      {/* Substitution modal */}
      {showSubstitution && (
        <SubstitutionModal
          recipe={recipe}
          ingredients={ingredients}
          onClose={() => setShowSubstitution(false)}
        />
      )}
    </div>
  )
}

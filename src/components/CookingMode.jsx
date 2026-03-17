import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Shuffle, Timer, SkipForward } from 'lucide-react'
import IngredientList from './IngredientList'
import SubstitutionModal from './SubstitutionModal'
import { convertTemperatures, scaleQuantity, formatQuantity } from '../lib/units'

// Detect time mentions in step text: "5 minutes", "30 seconds", "2 min", "10 mins"
function extractTime(text) {
  const match = text.match(/(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)/i)
  if (!match) return null
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  if (unit.startsWith('h')) return value * 3600
  if (unit.startsWith('s')) return value
  return value * 60 // minutes
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CookingMode({ recipe, steps, ingredients, baseServings, currentServings, metricFirst, onExit, methodName }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)
  const [wakeLock, setWakeLock] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)

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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      lock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false)
            clearInterval(timerRef.current)
            // Vibrate if available
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200])
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

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
  const stepTime = step ? extractTime(step.instruction) : null

  // Enrich step text with scaled ingredient quantities
  const enrichInstruction = (text) => {
    let result = convertTemperatures(text)
    if (!ingredients?.length) return result
    for (const ing of ingredients) {
      if (!ing.name || !ing.quantity) continue
      const regex = new RegExp(`\\b(${ing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
      const scaled = scaleQuantity(ing.quantity, baseServings, currentServings)
      const qtyStr = formatQuantity(scaled)
      result = result.replace(regex, `${qtyStr} ${ing.unit} $1`)
    }
    return result
  }

  const processedInstruction = enrichInstruction(step?.instruction || '')

  const startTimer = () => {
    if (stepTime) {
      setTimerSeconds(stepTime)
      setTimerRunning(true)
    }
  }

  const stopTimer = () => {
    setTimerRunning(false)
    setTimerSeconds(null)
    clearInterval(timerRef.current)
  }

  return (
    <div className="cooking-mode flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 shrink-0">
        <div>
          <h2 className="font-display text-lg font-bold text-warm-800">
            {recipe.title}
            {methodName && <span className="text-sm font-normal text-warm-400 ml-2">({methodName})</span>}
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-sm text-warm-400">Step {currentStep + 1} of {steps.length}</p>
            {timerSeconds !== null && (
              <span className={`text-sm font-mono font-bold ${timerSeconds === 0 ? 'text-kitchen-red animate-pulse' : 'text-kitchen-green'}`}>
                {timerSeconds === 0 ? 'Done!' : formatTimer(timerSeconds)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stepTime && timerSeconds === null && (
            <button
              onMouseDown={(e) => { e.preventDefault(); startTimer() }}
              className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-600"
              title="Start timer"
            >
              <Timer size={20} />
            </button>
          )}
          {timerSeconds !== null && (
            <button
              onMouseDown={(e) => { e.preventDefault(); stopTimer() }}
              className="kitchen-btn p-2 rounded-lg hover:bg-red-50 text-kitchen-red text-xs font-bold"
              title="Stop timer"
            >
              <X size={16} />
            </button>
          )}
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowSubstitution(true) }}
            className="kitchen-btn p-2 rounded-lg hover:bg-warm-100 text-warm-600"
            title="Ingredient substitutions"
          >
            <Shuffle size={20} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onExit() }}
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

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {step?.is_optional && (
          <span className="mb-4 text-sm font-medium text-warm-400 bg-warm-100 px-3 py-1 rounded-full">Optional Step</span>
        )}
        <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed text-warm-800 text-center max-w-3xl font-display">
          {processedInstruction}
        </p>
      </div>

      {/* Step dots timeline */}
      <div className="flex items-center justify-center gap-1.5 px-4 pb-3 shrink-0 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={s.id || i}
            onMouseDown={(e) => { e.preventDefault(); setCurrentStep(i) }}
            className={`rounded-full transition-all ${
              i === currentStep
                ? 'w-8 h-3 bg-kitchen-green'
                : s.is_optional
                  ? 'w-3 h-3 border-2 border-dashed border-warm-300'
                  : i < currentStep
                    ? 'w-3 h-3 bg-kitchen-green/40'
                    : 'w-3 h-3 bg-warm-200'
            }`}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 px-4 pb-4 shrink-0">
        <button
          onMouseDown={(e) => { e.preventDefault(); setCurrentStep(s => Math.max(s - 1, 0)) }}
          disabled={currentStep === 0}
          className="kitchen-btn flex-1 py-5 rounded-2xl bg-warm-100 text-warm-600 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-30 active:bg-warm-200 transition-colors"
        >
          <ChevronLeft size={24} />
          Previous
        </button>
        {step?.is_optional && currentStep < steps.length - 1 && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setCurrentStep(s => Math.min(s + 1, steps.length - 1)) }}
            className="kitchen-btn py-5 px-6 rounded-2xl bg-warm-200 text-warm-600 font-semibold text-lg flex items-center justify-center gap-2 active:bg-warm-300 transition-colors"
          >
            <SkipForward size={20} />
            Skip
          </button>
        )}
        <button
          onMouseDown={(e) => { e.preventDefault(); setCurrentStep(s => Math.min(s + 1, steps.length - 1)) }}
          disabled={currentStep === steps.length - 1}
          className="kitchen-btn flex-1 py-5 rounded-2xl bg-kitchen-green text-white font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-30 active:bg-kitchen-green/80 transition-colors"
        >
          Next
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Ingredient drawer toggle */}
      <button
        onMouseDown={(e) => { e.preventDefault(); setShowIngredients(!showIngredients) }}
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

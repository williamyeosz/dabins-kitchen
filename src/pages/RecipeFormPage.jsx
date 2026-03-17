import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, X, GripVertical, ChevronUp, ChevronDown, Loader2, Sparkles, AlertTriangle, ClipboardPaste, Check, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { toCanonical } from '../lib/units'
import { parseRecipeText } from '../lib/ai'
import {
  fetchRecipe, fetchTags, createRecipe, updateRecipe,
  addIngredients, deleteIngredientsByRecipe,
  addSteps, deleteStepsByRecipe,
  setRecipeTags, createTag,
  deleteNotesByRecipe,
  addCookingMethods, deleteCookingMethodsByRecipe,
} from '../lib/supabase'
import { supabase } from '../lib/supabase'

const genId = () =>
  typeof crypto.randomUUID === 'function'
    ? genId()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const UNIT_OPTIONS = [
  'g', 'kg', 'ml', 'L', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lbs',
  'piece', 'pieces', 'clove', 'cloves', 'stalk', 'stalks',
  'medium', 'large', 'small', 'whole', 'fish', '\u65A4',
]

const NOTE_LABELS = ['general', 'preference', 'equipment', 'maid']

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard']

const emptyIngredient = () => ({
  _key: genId(),
  name: '',
  quantity: '',
  unit: 'g',
  scales_linearly: true,
  notes: '',
})

const emptyStep = () => ({
  _key: genId(),
  instruction: '',
  is_optional: false,
})

const emptyNote = () => ({
  _key: genId(),
  note_text: '',
  label: 'general',
})

// --- Step form row with optional toggle and ingredient auto-fill ---
function StepFormRow({ step, idx, totalSteps, ingredients, onMove, onRemove, onUpdate, onToggleOptional }) {
  const textareaRef = useRef(null)
  const [suggestion, setSuggestion] = useState(null)
  const dismissTimer = useRef(null)

  const checkForIngredientMatch = useCallback((text, cursorPos) => {
    if (!text || !ingredients?.length) { setSuggestion(null); return }

    // Get the text up to cursor
    const textBeforeCursor = text.slice(0, cursorPos).toLowerCase()

    // Check each ingredient for a match at or near the cursor
    const validIngredients = ingredients.filter(i => i.name.trim() && (i.quantity || i.quantity === 0))
    let bestMatch = null

    for (const ing of validIngredients) {
      const ingName = ing.name.trim().toLowerCase()
      const words = ingName.split(/\s+/)

      // Try matching the full ingredient name first
      const fullIdx = textBeforeCursor.lastIndexOf(ingName)
      if (fullIdx !== -1 && fullIdx + ingName.length >= cursorPos - 2) {
        // Check if the text already has a quantity before this ingredient name
        const beforeMatch = text.slice(Math.max(0, fullIdx - 15), fullIdx).trim()
        if (/\d+\s*(g|kg|ml|L|cup|cups|tbsp|tsp|oz|lbs|piece|pieces|clove|cloves|stalk|stalks|medium|large|small|whole|斤)\s*$/i.test(beforeMatch)) continue
        if (!bestMatch || ingName.length > bestMatch.matchLength) {
          bestMatch = { ing, matchStart: fullIdx, matchEnd: fullIdx + ingName.length, matchLength: ingName.length, matchText: ingName }
        }
        continue
      }

      // Try partial word match (at least 3 chars)
      for (const word of words) {
        if (word.length < 3) continue
        const wordIdx = textBeforeCursor.lastIndexOf(word)
        if (wordIdx !== -1 && wordIdx + word.length >= cursorPos - 2) {
          const beforeMatch = text.slice(Math.max(0, wordIdx - 15), wordIdx).trim()
          if (/\d+\s*(g|kg|ml|L|cup|cups|tbsp|tsp|oz|lbs|piece|pieces|clove|cloves|stalk|stalks|medium|large|small|whole|斤)\s*$/i.test(beforeMatch)) continue
          if (!bestMatch || ingName.length > bestMatch.matchLength) {
            bestMatch = { ing, matchStart: wordIdx, matchEnd: wordIdx + word.length, matchLength: ingName.length, matchText: word }
          }
        }
      }
    }

    if (bestMatch) {
      const { ing } = bestMatch
      const qty = ing.quantity
      const unit = ing.unit || ''
      const displayText = `${qty} ${unit} ${ing.name.trim()}`.trim()
      setSuggestion({ ...bestMatch, displayText, fullName: ing.name.trim(), qty, unit })

      // Auto-dismiss after 3 seconds
      clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setSuggestion(null), 3000)
    } else {
      setSuggestion(null)
    }
  }, [ingredients])

  const applySuggestion = useCallback(() => {
    if (!suggestion || !textareaRef.current) return
    const text = step.instruction
    // Find the ingredient name occurrence in the text and replace with "qty unit name"
    const before = text.slice(0, suggestion.matchStart)
    const after = text.slice(suggestion.matchEnd)
    const replacement = suggestion.displayText
    onUpdate(idx, before + replacement + after)
    setSuggestion(null)
  }, [suggestion, step.instruction, idx, onUpdate])

  useEffect(() => {
    return () => clearTimeout(dismissTimer.current)
  }, [])

  return (
    <div key={step._key} className={`rounded-lg p-3 ${step.is_optional ? 'bg-warm-50/60 border border-dashed border-warm-300' : 'bg-warm-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-warm-400">Step {idx + 1}</span>
          <button
            onMouseDown={(e) => { e.preventDefault(); onMove(idx, -1) }}
            disabled={idx === 0}
            className="text-warm-400 hover:text-warm-600 disabled:opacity-30 p-1"
            aria-label="Move step up"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onMove(idx, 1) }}
            disabled={idx === totalSteps - 1}
            className="text-warm-400 hover:text-warm-600 disabled:opacity-30 p-1"
            aria-label="Move step down"
          >
            <ChevronDown size={18} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onToggleOptional(idx) }}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              step.is_optional
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-warm-100 text-warm-400 hover:bg-warm-200 hover:text-warm-600'
            }`}
            title={step.is_optional ? 'Mark as required' : 'Mark as optional'}
          >
            {step.is_optional ? 'Optional' : 'Optional?'}
          </button>
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); onRemove(idx) }}
          disabled={totalSteps <= 1}
          className="text-warm-300 hover:text-kitchen-red disabled:opacity-30 p-2"
          aria-label="Remove step"
        >
          <X size={20} />
        </button>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={step.instruction}
          onChange={e => {
            onUpdate(idx, e.target.value)
            checkForIngredientMatch(e.target.value, e.target.selectionStart)
          }}
          onKeyUp={e => {
            if (e.key === ' ' || e.key === 'Backspace') {
              checkForIngredientMatch(step.instruction, e.target.selectionStart)
            }
          }}
          onBlur={() => { setTimeout(() => setSuggestion(null), 200) }}
          placeholder={`Step ${idx + 1} instructions...`}
          rows={2}
          className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green resize-none"
        />
        {suggestion && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-warm-200 rounded-lg shadow-lg p-2 flex items-center gap-2">
            <span className="text-xs text-warm-500">Add quantity?</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); applySuggestion() }}
              className="text-sm font-medium text-kitchen-green hover:underline"
            >
              &rarr; {suggestion.displayText}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Cross-check: find ingredients not mentioned in steps and vice versa ---
function crossCheckIngredientsSteps(ingredients, steps) {
  const warnings = []
  const validIngredients = ingredients.filter(i => i.name.trim())
  const allStepText = steps
    .map(s => s.instruction)
    .join(' ')
    .toLowerCase()

  // Check each ingredient appears in at least one step
  for (const ing of validIngredients) {
    const name = ing.name.trim().toLowerCase()
    // Try the full name and also just the last word (e.g. "soy sauce" → "sauce", "sesame oil" → "oil" is too generic, so try full name first)
    // Use a simple word-boundary-ish check
    const nameWords = name.split(/\s+/)
    const found = allStepText.includes(name) ||
      (nameWords.length > 1 && nameWords.some(w => w.length > 3 && allStepText.includes(w)))
    if (!found) {
      warnings.push({ type: 'ingredient_unused', name: ing.name.trim() })
    }
  }

  return warnings
}

export default function RecipeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const isEdit = Boolean(id)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [baseServings, setBaseServings] = useState(4)
  const [defaultServingSize, setDefaultServingSize] = useState(4)
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [steps, setSteps] = useState([emptyStep()])
  const [notes, setNotes] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [allTags, setAllTags] = useState([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  const [pageLoading, setPageLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // AI import state
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)

  // Cooking method variations
  const [cookingMethods, setCookingMethods] = useState([])
  // null = editing default steps, number = index into cookingMethods
  const [selectedFormMethod, setSelectedFormMethod] = useState(null)
  // Default cooking method id (null = Default method is default)
  const [defaultMethodId, setDefaultMethodId] = useState(null)

  // Reset selectedFormMethod if it's out of bounds
  useEffect(() => {
    if (selectedFormMethod !== null && selectedFormMethod >= cookingMethods.length) {
      setSelectedFormMethod(null)
    }
  }, [cookingMethods.length, selectedFormMethod])

  // Ingredient autocomplete state
  const [knownIngredients, setKnownIngredients] = useState([])
  const [activeAutocomplete, setActiveAutocomplete] = useState(-1)

  // Load tags + known ingredient names
  useEffect(() => {
    fetchTags().then(setAllTags).catch(console.error)
    supabase.from('ingredient_nutrition').select('ingredient_name').then(({ data }) => {
      if (data) setKnownIngredients(data.map(d => d.ingredient_name))
    })
  }, [])

  // Load existing recipe for edit
  useEffect(() => {
    if (!isEdit) return
    setPageLoading(true)
    fetchRecipe(id)
      .then(recipe => {
        setTitle(recipe.title || '')
        setDescription(recipe.description || '')
        setCuisine(recipe.cuisine || '')
        setCategory(recipe.category || '')
        setImageUrl(recipe.image_url || '')
        setCookTime(recipe.cook_time_minutes ?? '')
        setDifficulty(recipe.difficulty || 'medium')
        setBaseServings(recipe.base_servings || 4)
        setDefaultServingSize(recipe.default_serving_size || 4)

        if (recipe.ingredients?.length) {
          setIngredients(recipe.ingredients.map(i => ({
            _key: genId(),
            name: i.name,
            quantity: i.quantity ?? '',
            unit: i.unit || 'g',
            scales_linearly: i.scales_linearly ?? true,
            notes: i.notes || '',
          })))
        }

        if (recipe.default_cooking_method_id) {
          setDefaultMethodId(recipe.default_cooking_method_id)
        }

        if (recipe.cooking_methods?.length) {
          const allSteps = recipe.steps || []
          setCookingMethods(recipe.cooking_methods.map(m => ({
            _key: genId(),
            name: m.name,
            cook_time_minutes: m.cook_time_minutes ?? '',
            _savedId: m.id,
            steps: allSteps
              .filter(s => s.cooking_method_id === m.id)
              .sort((a, b) => a.step_number - b.step_number)
              .map(s => ({ _key: genId(), instruction: s.instruction, is_optional: s.is_optional || false })),
          })))
          // Default steps = steps with no method
          if (recipe.steps?.length) {
            setSteps(
              recipe.steps
                .filter(s => !s.cooking_method_id)
                .sort((a, b) => a.step_number - b.step_number)
                .map(s => ({ _key: genId(), instruction: s.instruction, is_optional: s.is_optional || false }))
            )
          }
        } else if (recipe.steps?.length) {
          setSteps(recipe.steps.map(s => ({
            _key: genId(),
            instruction: s.instruction,
            is_optional: s.is_optional || false,
          })))
        }

        if (recipe.recipe_notes?.length) {
          setNotes(recipe.recipe_notes.map(n => ({
            _key: genId(),
            note_text: n.note_text,
            label: n.label || 'general',
          })))
        }

        if (recipe.recipe_tags?.length) {
          setSelectedTagIds(recipe.recipe_tags.map(rt => rt.tags?.id || rt.tag_id).filter(Boolean))
        }
      })
      .catch(err => {
        console.error('Failed to load recipe:', err)
        navigate('/recipes')
      })
      .finally(() => setPageLoading(false))
  }, [id, isEdit, navigate])

  // Pre-fill from AI suggestion or import
  const applyPrefill = useCallback((prefill) => {
    if (!prefill) return
    setTitle(prefill.title || '')
    setDescription(prefill.description || '')
    setCuisine(prefill.cuisine || '')
    setCategory(prefill.category || '')
    setImageUrl(prefill.image_url || '')
    setCookTime(prefill.cook_time_minutes ?? '')
    setDifficulty(prefill.difficulty || 'medium')
    setBaseServings(prefill.base_servings || 4)
    setDefaultServingSize(prefill.default_serving_size || prefill.base_servings || 4)

    if (prefill.ingredients?.length) {
      setIngredients(prefill.ingredients.map(i => ({
        _key: genId(),
        name: i.name || '',
        quantity: i.quantity ?? '',
        unit: i.unit || 'g',
        scales_linearly: i.scales_linearly ?? true,
        notes: i.notes || '',
      })))
    }

    if (prefill.steps?.length) {
      setSteps(prefill.steps.map(s => ({
        _key: genId(),
        instruction: typeof s === 'string' ? s : s.instruction || '',
        is_optional: typeof s === 'string' ? false : s.is_optional || false,
      })))
    }

    if (prefill.notes?.length) {
      setNotes(prefill.notes.map(n => ({
        _key: genId(),
        note_text: typeof n === 'string' ? n : n.note_text || '',
        label: typeof n === 'string' ? 'general' : n.label || 'general',
      })))
    }
  }, [])

  useEffect(() => {
    if (!isEdit && location.state?.prefill) applyPrefill(location.state.prefill)
  }, [location.state, isEdit, applyPrefill])

  // --- AI Import handler ---
  const handleImport = async () => {
    if (!importText.trim()) return
    setImporting(true)
    setImportError(null)
    try {
      const parsed = await parseRecipeText(importText.trim())
      applyPrefill(parsed)
      setShowImport(false)
      setImportText('')
    } catch (e) {
      console.error('Import failed:', e)
      setImportError(e.message || 'Failed to parse recipe. Try pasting more complete text.')
    } finally {
      setImporting(false)
    }
  }

  // Ingredient helpers
  const updateIngredient = (index, field, value) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
    if (field === 'name') setActiveAutocomplete(index)
  }

  const addIngredientRow = () => setIngredients(prev => [...prev, emptyIngredient()])

  const removeIngredient = (index) => {
    if (ingredients.length <= 1) return
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const moveIngredient = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= ingredients.length) return
    setIngredients(prev => {
      const arr = [...prev]
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }

  // Autocomplete suggestions for current ingredient
  const getAutocompleteSuggestions = (index) => {
    if (activeAutocomplete !== index) return []
    const query = ingredients[index]?.name?.toLowerCase().trim()
    if (!query || query.length < 2) return []
    return knownIngredients
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 5)
  }

  // Step helpers — operate on the currently selected method's steps
  const getActiveSteps = () => {
    if (selectedFormMethod === null) return steps
    return cookingMethods[selectedFormMethod]?.steps || []
  }

  const setActiveSteps = (updater) => {
    if (selectedFormMethod === null) {
      setSteps(updater)
    } else {
      setCookingMethods(prev => prev.map((m, i) =>
        i === selectedFormMethod
          ? { ...m, steps: typeof updater === 'function' ? updater(m.steps) : updater }
          : m
      ))
    }
  }

  const updateStep = (index, value) => {
    setActiveSteps(prev => prev.map((s, i) => i === index ? { ...s, instruction: value } : s))
  }

  const toggleStepOptional = (index) => {
    setActiveSteps(prev => prev.map((s, i) => i === index ? { ...s, is_optional: !s.is_optional } : s))
  }

  const addStepRow = () => setActiveSteps(prev => [...prev, emptyStep()])

  const removeStep = (index) => {
    const active = getActiveSteps()
    if (active.length <= 1) return
    setActiveSteps(prev => prev.filter((_, i) => i !== index))
  }

  const moveStep = (index, direction) => {
    const active = getActiveSteps()
    const target = index + direction
    if (target < 0 || target >= active.length) return
    setActiveSteps(prev => {
      const arr = [...prev]
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }

  // Cooking method helpers
  const addMethod = () => {
    // Copy default steps so the user only needs to edit what's different
    const copiedSteps = steps
      .filter(s => s.instruction.trim())
      .map(s => ({ _key: genId(), instruction: s.instruction }))
    setCookingMethods(prev => [...prev, {
      _key: genId(),
      name: '',
      cook_time_minutes: '',
      steps: copiedSteps.length > 0 ? copiedSteps : [emptyStep()],
    }])
    setSelectedFormMethod(cookingMethods.length)
  }

  const removeMethod = (index) => {
    setCookingMethods(prev => prev.filter((_, i) => i !== index))
    setSelectedFormMethod(null)
  }

  const updateMethodField = (index, field, value) => {
    setCookingMethods(prev => prev.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    ))
  }

  // Note helpers
  const updateNote = (index, field, value) => {
    setNotes(prev => prev.map((n, i) => i === index ? { ...n, [field]: value } : n))
  }

  const addNoteRow = () => setNotes(prev => [...prev, emptyNote()])

  const removeNote = (index) => {
    setNotes(prev => prev.filter((_, i) => i !== index))
  }

  // Tag helpers
  const toggleTag = (tagId) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const handleCreateTag = async () => {
    const name = tagSearch.trim()
    if (!name) return
    try {
      const tag = await createTag(name, 'custom')
      setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedTagIds(prev => [...prev, tag.id])
      setTagSearch('')
    } catch (e) {
      console.error('Failed to create tag:', e)
    }
  }

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTagIds.includes(t.id)
  )

  // Cross-check warnings (computed live) — include all method steps too
  const crossCheckWarnings = useMemo(() => {
    const allSteps = [
      ...steps,
      ...cookingMethods.flatMap(m => m.steps),
    ]
    return crossCheckIngredientsSteps(ingredients, allSteps)
  }, [ingredients, steps, cookingMethods])

  // Validation
  const validate = useCallback(() => {
    const errs = {}
    if (!title.trim()) errs.title = 'Title is required'
    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length === 0) errs.ingredients = 'At least one ingredient is required'
    const validSteps = steps.filter(s => s.instruction.trim())
    if (validSteps.length === 0) errs.steps = 'At least one step is required for the default method'
    cookingMethods.forEach((m, i) => {
      if (!m.name.trim()) errs[`method_${i}_name`] = `Method ${i + 1} needs a name`
      if (!m.steps.some(s => s.instruction.trim())) errs[`method_${i}_steps`] = `${m.name || `Method ${i + 1}`} needs at least one step`
    })
    return errs
  }, [title, ingredients, steps, cookingMethods])

  // Save
  const handleSave = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const recipeData = {
        title: title.trim(),
        description: description.trim() || null,
        cuisine: cuisine.trim() || null,
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        difficulty: difficulty || null,
        base_servings: parseInt(baseServings) || 4,
        default_serving_size: parseInt(defaultServingSize) || 4,
        default_cooking_method_id: null, // will be set after methods are saved
      }

      let recipeId
      if (isEdit) {
        await updateRecipe(id, recipeData)
        recipeId = id
        // Delete cooking methods first (cascade deletes their steps)
        await deleteCookingMethodsByRecipe(recipeId)
        await Promise.all([
          deleteIngredientsByRecipe(recipeId),
          deleteStepsByRecipe(recipeId),
          deleteNotesByRecipe(recipeId),
        ])
      } else {
        const created = await createRecipe(recipeData)
        recipeId = created.id
      }

      // Insert ingredients with canonical conversion
      const validIngredients = ingredients.filter(i => i.name.trim())
      if (validIngredients.length > 0) {
        const ingRows = validIngredients.map((ing, idx) => {
          const qty = parseFloat(ing.quantity)
          const hasQty = !isNaN(qty) && qty > 0
          const canonical = hasQty ? toCanonical(qty, ing.unit) : { quantity: null, unit: null }
          return {
            recipe_id: recipeId,
            name: ing.name.trim(),
            quantity: hasQty ? qty : null,
            unit: ing.unit || null,
            canonical_quantity: canonical.quantity,
            canonical_unit: canonical.unit,
            scales_linearly: ing.scales_linearly,
            notes: ing.notes.trim() || null,
            sort_order: idx,
          }
        })
        await addIngredients(ingRows)
      }

      // Insert steps
      const validSteps = steps.filter(s => s.instruction.trim())
      if (validSteps.length > 0) {
        const stepRows = validSteps.map((s, idx) => ({
          recipe_id: recipeId,
          step_number: idx + 1,
          instruction: s.instruction.trim(),
          is_optional: s.is_optional || false,
        }))
        await addSteps(stepRows)
      }

      // Insert notes
      const validNotes = notes.filter(n => n.note_text.trim())
      if (validNotes.length > 0) {
        const noteRows = validNotes.map(n => ({
          recipe_id: recipeId,
          note_text: n.note_text.trim(),
          label: n.label,
        }))
        const { error } = await supabase.from('recipe_notes').insert(noteRows)
        if (error) throw error
      }

      // Insert cooking methods and their steps
      if (cookingMethods.length > 0) {
        const methodRows = cookingMethods.map((m, idx) => ({
          recipe_id: recipeId,
          name: m.name.trim() || `Method ${idx + 1}`,
          cook_time_minutes: m.cook_time_minutes ? parseInt(m.cook_time_minutes) : null,
          sort_order: idx,
        }))
        const savedMethods = await addCookingMethods(methodRows)

        const methodStepRows = []
        savedMethods.forEach((savedMethod, idx) => {
          const methodSteps = cookingMethods[idx].steps.filter(s => s.instruction.trim())
          methodSteps.forEach((s, stepIdx) => {
            methodStepRows.push({
              recipe_id: recipeId,
              cooking_method_id: savedMethod.id,
              step_number: stepIdx + 1,
              instruction: s.instruction.trim(),
              is_optional: s.is_optional || false,
            })
          })
        })
        if (methodStepRows.length > 0) {
          await addSteps(methodStepRows)
        }

        // Set default_cooking_method_id if one was chosen
        if (defaultMethodId) {
          let newDefaultId = null
          // Check if it's an existing method ID
          cookingMethods.forEach((m, idx) => {
            if (m._savedId && m._savedId === defaultMethodId) {
              newDefaultId = savedMethods[idx].id
            }
            // Check if it's a new method placeholder
            if (defaultMethodId === `_new_${idx}`) {
              newDefaultId = savedMethods[idx].id
            }
          })
          if (newDefaultId) {
            await updateRecipe(recipeId, { default_cooking_method_id: newDefaultId })
          }
        }
      }

      // Set tags
      await setRecipeTags(recipeId, selectedTagIds)

      navigate(`/recipes/${recipeId}`)
    } catch (err) {
      console.error('Failed to save recipe:', err)
      setErrors({ save: err.message || 'Failed to save recipe. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-warm-400" size={32} />
        <span className="ml-3 text-warm-400">Loading recipe...</span>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-warm-800">
          {isEdit ? 'Edit Recipe' : 'New Recipe'}
        </h1>
        {!isEdit && (
          <button
            onClick={() => setShowImport(!showImport)}
            className="kitchen-btn flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-purple-200 text-purple-600 hover:bg-purple-50 font-medium text-sm transition-colors"
          >
            <ClipboardPaste size={16} />
            Paste & Import
          </button>
        )}
      </div>

      {/* AI Import panel */}
      {showImport && (
        <section className="bg-purple-50 rounded-2xl p-6 border border-purple-200 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-500" />
            <h2 className="text-lg font-display font-semibold text-purple-800">Import from Text</h2>
          </div>
          <p className="text-sm text-purple-600 mb-3">
            Paste a recipe from anywhere — a website, a message, a cookbook photo transcription, or even rough notes. AI will parse it into a structured recipe for you to review.
          </p>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={"Paste your recipe here...\n\nExample:\nGarlic fried rice - cook rice day before. 3 cups cold rice, 4 cloves garlic minced, 2 eggs, 2 tbsp soy sauce, sesame oil. Fry garlic in oil, push aside, scramble eggs, add rice and soy sauce, toss everything together. Finish with sesame oil."}
            rows={8}
            className="w-full rounded-lg border border-purple-200 px-4 py-3 text-sm text-warm-800 focus:outline-none focus:border-purple-400 resize-none bg-white"
          />
          {importError && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">{importError}</div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="kitchen-btn flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {importing ? 'Parsing...' : 'Import Recipe'}
            </button>
            <button
              onClick={() => { setShowImport(false); setImportText(''); setImportError(null) }}
              className="text-sm text-purple-500 hover:text-purple-700"
            >
              Cancel
            </button>
            <span className="text-xs text-purple-400 ml-auto">Powered by Claude</span>
          </div>
        </section>
      )}

      {errors.save && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.save}</div>
      )}

      {/* Cross-check warnings */}
      {crossCheckWarnings.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Heads up</span>
          </div>
          <ul className="space-y-1">
            {crossCheckWarnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700">
                {w.type === 'ingredient_unused' && (
                  <><span className="font-medium">{w.name}</span> is listed as an ingredient but isn't mentioned in any step</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-6">
        <h2 className="text-lg font-display font-semibold text-warm-700 mb-4">Basic Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warm-600 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Recipe title"
              className={`w-full rounded-lg border px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green ${errors.title ? 'border-red-300' : 'border-warm-200'}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the recipe"
              rows={2}
              className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Cuisine</label>
              <input
                type="text"
                value={cuisine}
                onChange={e => setCuisine(e.target.value)}
                placeholder="e.g. Chinese, Italian"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Main, Soup, Dessert"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-600 mb-1">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Cook Time (min)</label>
              <input
                type="number"
                value={cookTime}
                onChange={e => setCookTime(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              >
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Base Servings</label>
              <input
                type="number"
                value={baseServings}
                onChange={e => setBaseServings(e.target.value)}
                min="1"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-1">Default Serving</label>
              <input
                type="number"
                value={defaultServingSize}
                onChange={e => setDefaultServingSize(e.target.value)}
                min="1"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-warm-800 focus:outline-none focus:border-kitchen-green"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-warm-700">Ingredients *</h2>
          <button onClick={addIngredientRow} className="flex items-center gap-1 text-sm text-kitchen-green hover:text-kitchen-green/80 font-medium">
            <Plus size={16} /> Add
          </button>
        </div>
        {errors.ingredients && <p className="text-red-500 text-xs mb-3">{errors.ingredients}</p>}

        <div className="space-y-3">
          {ingredients.map((ing, idx) => {
            const suggestions = getAutocompleteSuggestions(idx)
            return (
              <div key={ing._key} className="flex items-start gap-2 bg-warm-50 rounded-lg p-3">
                {/* Reorder controls */}
                <div className="flex flex-col items-center gap-0.5 pt-1">
                  <button
                    onClick={() => moveIngredient(idx, -1)}
                    disabled={idx === 0}
                    className="text-warm-400 hover:text-warm-600 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <GripVertical size={14} className="text-warm-300" />
                  <button
                    onClick={() => moveIngredient(idx, 1)}
                    disabled={idx === ingredients.length - 1}
                    className="text-warm-400 hover:text-warm-600 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4 relative">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={e => updateIngredient(idx, 'name', e.target.value)}
                      onFocus={() => setActiveAutocomplete(idx)}
                      onBlur={() => setTimeout(() => setActiveAutocomplete(-1), 150)}
                      placeholder="Ingredient name"
                      className="w-full rounded-lg border border-warm-200 px-2 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-warm-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                        {suggestions.map(name => (
                          <button
                            key={name}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              updateIngredient(idx, 'name', name)
                              setActiveAutocomplete(-1)
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm text-warm-700 hover:bg-warm-50"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    value={ing.quantity}
                    onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    step="any"
                    min="0"
                    className="sm:col-span-2 rounded-lg border border-warm-200 px-2 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                    className="sm:col-span-2 rounded-lg border border-warm-200 px-2 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={ing.notes}
                    onChange={e => updateIngredient(idx, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="sm:col-span-3 rounded-lg border border-warm-200 px-2 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
                  />
                  <div className="sm:col-span-1 flex items-center justify-center">
                    <label className="flex items-center gap-1 text-xs text-warm-500 cursor-pointer" title="Scales with servings">
                      <input
                        type="checkbox"
                        checked={ing.scales_linearly}
                        onChange={e => updateIngredient(idx, 'scales_linearly', e.target.checked)}
                        className="rounded border-warm-300 text-kitchen-green focus:ring-kitchen-green"
                      />
                      Scale
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => removeIngredient(idx)}
                  disabled={ingredients.length <= 1}
                  className="text-warm-300 hover:text-kitchen-red disabled:opacity-30 pt-1"
                  aria-label="Remove ingredient"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-warm-700">Steps *</h2>
          <button onClick={addStepRow} className="flex items-center gap-1 text-sm text-kitchen-green hover:text-kitchen-green/80 font-medium">
            <Plus size={16} /> Add Step
          </button>
        </div>

        {/* Method tabs */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); setSelectedFormMethod(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              selectedFormMethod === null
                ? 'bg-kitchen-green text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            Default
            {defaultMethodId === null && cookingMethods.length > 0 && (
              <Star size={14} className="fill-current" />
            )}
          </button>
          {cookingMethods.map((m, i) => (
            <button
              key={m._key}
              onMouseDown={(e) => { e.preventDefault(); setSelectedFormMethod(i) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedFormMethod === i
                  ? 'bg-kitchen-green text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {m.name || `Method ${i + 1}`}
              {defaultMethodId && defaultMethodId === m._savedId && (
                <Star size={14} className="fill-current" />
              )}
              <span
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeMethod(i) }}
                className="ml-2 p-1 hover:text-kitchen-red cursor-pointer"
              >
                <X size={16} />
              </span>
            </button>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); addMethod() }}
            className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-dashed border-warm-300 text-warm-500 hover:border-kitchen-green hover:text-kitchen-green transition-colors"
          >
            + Add Method
          </button>
        </div>

        {/* Method name & cook time (only for non-default methods) */}
        {selectedFormMethod !== null && cookingMethods[selectedFormMethod] && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-600 mb-1">Method Name *</label>
                <input
                  type="text"
                  value={cookingMethods[selectedFormMethod].name}
                  onChange={e => updateMethodField(selectedFormMethod, 'name', e.target.value)}
                  placeholder="e.g. Instant Pot, Slow Cooker"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green ${
                    errors[`method_${selectedFormMethod}_name`] ? 'border-red-300' : 'border-warm-200'
                  }`}
                />
                {errors[`method_${selectedFormMethod}_name`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`method_${selectedFormMethod}_name`]}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-600 mb-1">Cook Time (min)</label>
                <input
                  type="number"
                  value={cookingMethods[selectedFormMethod].cook_time_minutes}
                  onChange={e => updateMethodField(selectedFormMethod, 'cook_time_minutes', e.target.value)}
                  placeholder="Override cook time"
                  min="0"
                  className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
                />
              </div>
            </div>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                const m = cookingMethods[selectedFormMethod]
                setDefaultMethodId(defaultMethodId === m._savedId ? null : m._savedId || `_new_${selectedFormMethod}`)
              }}
              className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors ${
                defaultMethodId && (defaultMethodId === cookingMethods[selectedFormMethod]._savedId || defaultMethodId === `_new_${selectedFormMethod}`)
                  ? 'text-kitchen-orange'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              <Star size={14} className={defaultMethodId && (defaultMethodId === cookingMethods[selectedFormMethod]._savedId || defaultMethodId === `_new_${selectedFormMethod}`) ? 'fill-current' : ''} />
              {defaultMethodId && (defaultMethodId === cookingMethods[selectedFormMethod]._savedId || defaultMethodId === `_new_${selectedFormMethod}`)
                ? 'Default method'
                : 'Set as default'}
            </button>
          </div>
        )}

        {/* Set Default as default (when Default tab is selected and there are methods) */}
        {selectedFormMethod === null && cookingMethods.length > 0 && (
          <div className="mb-4">
            <button
              onMouseDown={(e) => { e.preventDefault(); setDefaultMethodId(null) }}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                defaultMethodId === null
                  ? 'text-kitchen-orange'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              <Star size={14} className={defaultMethodId === null ? 'fill-current' : ''} />
              {defaultMethodId === null ? 'Default method' : 'Set as default'}
            </button>
          </div>
        )}

        {errors.steps && selectedFormMethod === null && <p className="text-red-500 text-xs mb-3">{errors.steps}</p>}
        {selectedFormMethod !== null && errors[`method_${selectedFormMethod}_steps`] && (
          <p className="text-red-500 text-xs mb-3">{errors[`method_${selectedFormMethod}_steps`]}</p>
        )}

        <div className="space-y-3">
          {getActiveSteps().map((step, idx) => (
            <StepFormRow
              key={step._key}
              step={step}
              idx={idx}
              totalSteps={getActiveSteps().length}
              ingredients={ingredients}
              onMove={moveStep}
              onRemove={removeStep}
              onUpdate={updateStep}
              onToggleOptional={toggleStepOptional}
            />
          ))}
        </div>
      </section>

      {/* Kitchen Notes */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-warm-700">Kitchen Notes</h2>
          <button onClick={addNoteRow} className="flex items-center gap-1 text-sm text-kitchen-green hover:text-kitchen-green/80 font-medium">
            <Plus size={16} /> Add
          </button>
        </div>

        {notes.length === 0 && (
          <p className="text-warm-400 text-sm">No notes yet. Add tips, equipment needs, or preferences.</p>
        )}

        <div className="space-y-3">
          {notes.map((note, idx) => (
            <div key={note._key} className="flex items-start gap-2 bg-warm-50 rounded-lg p-3">
              <select
                value={note.label}
                onChange={e => updateNote(idx, 'label', e.target.value)}
                className="rounded-lg border border-warm-200 px-2 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
              >
                {NOTE_LABELS.map(l => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
              <textarea
                value={note.note_text}
                onChange={e => updateNote(idx, 'note_text', e.target.value)}
                placeholder="Note text..."
                rows={2}
                className="flex-1 rounded-lg border border-warm-200 px-3 py-1.5 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green resize-none"
              />
              <button onClick={() => removeNote(idx)} className="text-warm-300 hover:text-kitchen-red pt-1" aria-label="Remove note">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Tags */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-6 relative">
        <h2 className="text-lg font-display font-semibold text-warm-700 mb-4">Tags</h2>

        {/* Selected tags as chips */}
        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTagIds.map(tagId => {
              const tag = allTags.find(t => t.id === tagId)
              if (!tag) return null
              return (
                <span key={tagId} className="inline-flex items-center gap-1 px-3 py-1 bg-kitchen-green/10 text-kitchen-green rounded-full text-sm font-medium">
                  {tag.name}
                  <button onClick={() => toggleTag(tagId)} className="hover:text-kitchen-red" aria-label={`Remove tag ${tag.name}`}>
                    <X size={14} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Tag search */}
        <div className="relative">
          <input
            type="text"
            value={tagSearch}
            onChange={e => { setTagSearch(e.target.value); setShowTagDropdown(true) }}
            onFocus={() => setShowTagDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
            placeholder="Search or create tags..."
            className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 focus:outline-none focus:border-kitchen-green"
          />
          {showTagDropdown && (tagSearch || filteredTags.length > 0) && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-warm-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => { toggleTag(tag.id); setTagSearch(''); setShowTagDropdown(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
                >
                  {tag.name}
                </button>
              ))}
              {tagSearch.trim() && !allTags.some(t => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                <button
                  onClick={() => { handleCreateTag(); setShowTagDropdown(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-kitchen-green hover:bg-kitchen-green/5 font-medium"
                >
                  + Create "{tagSearch.trim()}"
                </button>
              )}
              {filteredTags.length === 0 && !tagSearch.trim() && (
                <p className="px-3 py-2 text-sm text-warm-400">No tags available</p>
              )}
            </div>
          )}
        </div>

      </section>

      {/* Actions */}
      <div className="flex items-center justify-between pb-8">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-kitchen-green text-white font-medium hover:bg-kitchen-green/90 disabled:opacity-50"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? 'Saving...' : isEdit ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </div>
    </div>
  )
}

// Unit conversion constants
const ML_PER_CUP = 236.588
const ML_PER_TBSP = 14.787
const ML_PER_TSP = 4.929
const G_PER_OZ = 28.3495
const G_PER_LB = 453.592
const G_PER_KG = 1000
const ML_PER_L = 1000
const G_PER_CATTY = 500 // 斤

// Map of units to their canonical form and conversion factor
const UNIT_MAP = {
  // Volume → ml
  cup: { canonical: 'ml', factor: ML_PER_CUP },
  cups: { canonical: 'ml', factor: ML_PER_CUP },
  tbsp: { canonical: 'ml', factor: ML_PER_TBSP },
  tablespoon: { canonical: 'ml', factor: ML_PER_TBSP },
  tablespoons: { canonical: 'ml', factor: ML_PER_TBSP },
  tsp: { canonical: 'ml', factor: ML_PER_TSP },
  teaspoon: { canonical: 'ml', factor: ML_PER_TSP },
  teaspoons: { canonical: 'ml', factor: ML_PER_TSP },
  ml: { canonical: 'ml', factor: 1 },
  l: { canonical: 'ml', factor: ML_PER_L },
  liter: { canonical: 'ml', factor: ML_PER_L },
  liters: { canonical: 'ml', factor: ML_PER_L },
  litre: { canonical: 'ml', factor: ML_PER_L },
  litres: { canonical: 'ml', factor: ML_PER_L },

  // Weight → g
  g: { canonical: 'g', factor: 1 },
  gram: { canonical: 'g', factor: 1 },
  grams: { canonical: 'g', factor: 1 },
  kg: { canonical: 'g', factor: G_PER_KG },
  kilogram: { canonical: 'g', factor: G_PER_KG },
  oz: { canonical: 'g', factor: G_PER_OZ },
  ounce: { canonical: 'g', factor: G_PER_OZ },
  ounces: { canonical: 'g', factor: G_PER_OZ },
  lb: { canonical: 'g', factor: G_PER_LB },
  lbs: { canonical: 'g', factor: G_PER_LB },
  pound: { canonical: 'g', factor: G_PER_LB },
  pounds: { canonical: 'g', factor: G_PER_LB },
  '斤': { canonical: 'g', factor: G_PER_CATTY },
  catty: { canonical: 'g', factor: G_PER_CATTY },

  // Unitless (pieces, etc.)
  piece: { canonical: null, factor: 1 },
  pieces: { canonical: null, factor: 1 },
  clove: { canonical: null, factor: 1 },
  cloves: { canonical: null, factor: 1 },
  medium: { canonical: null, factor: 1 },
  large: { canonical: null, factor: 1 },
  small: { canonical: null, factor: 1 },
  whole: { canonical: null, factor: 1 },
  stalk: { canonical: null, factor: 1 },
  stalks: { canonical: null, factor: 1 },
  fish: { canonical: null, factor: 1 },
}

export function toCanonical(quantity, unit) {
  const u = UNIT_MAP[unit?.toLowerCase()]
  if (!u || !u.canonical) return { quantity: null, unit: null }
  return { quantity: quantity * u.factor, unit: u.canonical }
}

export function fromCanonical(canonicalQty, canonicalUnit) {
  // Given a canonical amount, find best display units
  if (canonicalUnit === 'g') {
    if (canonicalQty >= 1000) return { quantity: canonicalQty / G_PER_KG, unit: 'kg' }
    return { quantity: canonicalQty, unit: 'g' }
  }
  if (canonicalUnit === 'ml') {
    if (canonicalQty >= 1000) return { quantity: canonicalQty / ML_PER_L, unit: 'L' }
    return { quantity: canonicalQty, unit: 'ml' }
  }
  return { quantity: canonicalQty, unit: canonicalUnit }
}

export function toImperial(canonicalQty, canonicalUnit) {
  if (canonicalUnit === 'g') {
    if (canonicalQty >= G_PER_LB) return { quantity: canonicalQty / G_PER_LB, unit: 'lbs' }
    return { quantity: canonicalQty / G_PER_OZ, unit: 'oz' }
  }
  if (canonicalUnit === 'ml') {
    if (canonicalQty >= ML_PER_CUP * 0.8) return { quantity: canonicalQty / ML_PER_CUP, unit: 'cups' }
    if (canonicalQty >= ML_PER_TBSP * 0.8) return { quantity: canonicalQty / ML_PER_TBSP, unit: 'tbsp' }
    return { quantity: canonicalQty / ML_PER_TSP, unit: 'tsp' }
  }
  return { quantity: canonicalQty, unit: canonicalUnit }
}

export function scaleQuantity(quantity, baseServings, targetServings) {
  if (!quantity || !baseServings) return quantity
  return (quantity / baseServings) * targetServings
}

export function formatQuantity(qty) {
  if (qty == null) return ''
  // Common fractions
  const rounded = Math.round(qty * 4) / 4
  if (rounded === 0.25) return '\u00BC'
  if (rounded === 0.5) return '\u00BD'
  if (rounded === 0.75) return '\u00BE'
  if (rounded === 0.33) return '\u2153'
  if (rounded === 0.67) return '\u2154'
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  if (frac === 0) return String(whole)
  if (whole === 0) return formatQuantity(frac) // handle just fraction
  const fracStr = frac === 0.25 ? '\u00BC' : frac === 0.5 ? '\u00BD' : frac === 0.75 ? '\u00BE' : ''
  if (fracStr) return `${whole} ${fracStr}`
  return Number(qty.toFixed(1)).toString()
}

export function displayDual(canonicalQty, canonicalUnit, metricFirst = true) {
  if (!canonicalUnit || canonicalQty == null) return null
  const metric = fromCanonical(canonicalQty, canonicalUnit)
  const imperial = toImperial(canonicalQty, canonicalUnit)

  const metricStr = `${formatQuantity(metric.quantity)} ${metric.unit}`
  const imperialStr = `${formatQuantity(imperial.quantity)} ${imperial.unit}`

  if (metricFirst) {
    return { primary: metricStr, secondary: imperialStr }
  }
  return { primary: imperialStr, secondary: metricStr }
}

// Temperature conversion for step text
export function convertTemperatures(text) {
  // Match °F patterns and add °C
  let result = text.replace(/(\d+)\s*°F/g, (match, temp) => {
    const f = parseInt(temp)
    const c = Math.round((f - 32) * 5 / 9)
    return `${f}\u00B0F / ${c}\u00B0C`
  })
  // Match °C patterns and add °F (only if not already converted)
  result = result.replace(/(?<!\/ )(\d+)\s*°C(?! )/g, (match, temp) => {
    const c = parseInt(temp)
    const f = Math.round(c * 9 / 5 + 32)
    return `${c}\u00B0C / ${f}\u00B0F`
  })
  return result
}

export function getCanonicalUnit(unit) {
  const u = UNIT_MAP[unit?.toLowerCase()]
  return u?.canonical || null
}

export function getConversionFactor(unit) {
  const u = UNIT_MAP[unit?.toLowerCase()]
  return u?.factor || 1
}

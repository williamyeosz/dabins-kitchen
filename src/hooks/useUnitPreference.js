import { useState } from 'react'

export function useUnitPreference() {
  const [metricFirst, setMetricFirst] = useState(() => {
    const stored = localStorage.getItem('dabins-kitchen-metric-first')
    return stored !== null ? JSON.parse(stored) : true
  })

  const toggle = () => {
    setMetricFirst(prev => {
      const next = !prev
      localStorage.setItem('dabins-kitchen-metric-first', JSON.stringify(next))
      return next
    })
  }

  return { metricFirst, toggle }
}

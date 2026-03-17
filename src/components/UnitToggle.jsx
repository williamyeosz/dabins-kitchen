export default function UnitToggle({ metricFirst, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="kitchen-btn flex items-center gap-2 px-4 py-2 rounded-full border-2 border-warm-200 bg-white hover:border-kitchen-green transition-colors text-sm font-medium"
    >
      <span className={metricFirst ? 'text-warm-800 font-bold' : 'text-warm-400'}>Metric</span>
      <span className="text-warm-300">/</span>
      <span className={!metricFirst ? 'text-warm-800 font-bold' : 'text-warm-400'}>Imperial</span>
    </button>
  )
}

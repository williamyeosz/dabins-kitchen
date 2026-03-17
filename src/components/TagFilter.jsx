import { useState, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import { fetchTags } from '../lib/supabase'

export default function TagFilter({ selectedTags, onTagsChange, selectedDifficulty, onDifficultyChange, sortBy, onSortChange }) {
  const [tags, setTags] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchTags().then(setTags).catch(console.error)
  }, [])

  const tagsByType = tags.reduce((acc, tag) => {
    const type = tag.tag_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(tag)
    return acc
  }, {})

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(t => t !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
    }
  }

  const hasFilters = selectedTags.length > 0 || selectedDifficulty

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOpen(!open)}
          className={`kitchen-btn flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${
            hasFilters ? 'border-kitchen-green bg-kitchen-green-light text-kitchen-green' : 'border-warm-200 text-warm-600 hover:border-warm-300'
          }`}
        >
          <Filter size={16} />
          Filters {hasFilters && `(${selectedTags.length + (selectedDifficulty ? 1 : 0)})`}
        </button>

        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="kitchen-btn px-4 py-2 rounded-full border-2 border-warm-200 text-sm text-warm-600 bg-white focus:outline-none focus:border-kitchen-green"
        >
          <option value="recent_cooked">Recently Cooked</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="recently_added">Recently Added</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { onTagsChange([]); onDifficultyChange(null) }}
            className="flex items-center gap-1 text-sm text-kitchen-red hover:underline"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-warm-200 p-4 space-y-4">
          {/* Difficulty */}
          <div>
            <h4 className="text-sm font-medium text-warm-600 mb-2">Difficulty</h4>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  onClick={() => onDifficultyChange(selectedDifficulty === d ? null : d)}
                  className={`kitchen-btn px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                    selectedDifficulty === d ? 'bg-kitchen-green text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Tag types */}
          {['cuisine', 'category', 'occasion', 'dietary'].map(type => (
            tagsByType[type]?.length > 0 && (
              <div key={type}>
                <h4 className="text-sm font-medium text-warm-600 mb-2 capitalize">{type}</h4>
                <div className="flex flex-wrap gap-2">
                  {tagsByType[type].map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`kitchen-btn px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag.id) ? 'bg-kitchen-green text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

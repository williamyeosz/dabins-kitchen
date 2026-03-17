import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { fetchRecipes } from '../lib/supabase'
import RecipeCard from '../components/RecipeCard'
import TagFilter from '../components/TagFilter'

export default function HomePage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedDifficulty, setSelectedDifficulty] = useState(null)
  const [sortBy, setSortBy] = useState('recent_cooked')

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = recipes

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.cuisine?.toLowerCase().includes(q) ||
        r.ingredients?.some(i => i.name.toLowerCase().includes(q))
      )
    }

    // Difficulty filter
    if (selectedDifficulty) {
      result = result.filter(r => r.difficulty === selectedDifficulty)
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter(r =>
        r.recipe_tags?.some(rt => selectedTags.includes(rt.tag_id || rt.tags?.id))
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'recent_cooked':
          return (b.last_cooked_at || '').localeCompare(a.last_cooked_at || '')
        case 'highest_rated':
          return (b.last_cooked_rating || 0) - (a.last_cooked_rating || 0)
        case 'recently_added':
          return (b.created_at || '').localeCompare(a.created_at || '')
        default:
          return 0
      }
    })

    return result
  }, [recipes, search, selectedTags, selectedDifficulty, sortBy])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-warm-800 mb-2">
          Welcome to Dabin's Kitchen
        </h1>
        <p className="text-warm-500 text-lg">What shall we cook today?</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search recipes, ingredients, cuisines..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-warm-200 bg-white text-warm-800 placeholder:text-warm-300 focus:border-kitchen-green focus:outline-none text-lg"
        />
      </div>

      {/* Filters */}
      <TagFilter
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={setSelectedDifficulty}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Recipe grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-warm-400 text-lg">Loading recipes...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-warm-400">
          <p className="text-lg">No recipes found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}

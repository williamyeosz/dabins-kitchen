import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen, CalendarDays, Refrigerator, Plus, Menu, X, Trash2 } from 'lucide-react'

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location])

  const navLinks = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/recipes', icon: BookOpen, label: 'Recipes' },
    // { to: '/meal-planner', icon: CalendarDays, label: 'Meal Plan' },
    { to: '/fridge', icon: Refrigerator, label: 'Fridge' },
    { to: '/trash', icon: Trash2, label: 'Trash' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-kitchen-cream">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-warm-200 sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <h1 className="text-xl font-display font-bold text-warm-800">Dabin's Kitchen</h1>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-warm-100 text-warm-800'
                    : 'text-warm-600 hover:bg-warm-50 hover:text-warm-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <Link
              to="/recipes/new"
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-kitchen-green text-white hover:bg-kitchen-green/90 ml-2"
            >
              <Plus size={16} />
              Add Recipe
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden kitchen-btn p-2">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden border-t border-warm-200 bg-white px-4 py-3 space-y-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${
                  isActive(to) ? 'bg-warm-100 text-warm-800' : 'text-warm-600'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
            <Link to="/recipes/new" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium bg-kitchen-green text-white">
              <Plus size={20} />
              Add Recipe
            </Link>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

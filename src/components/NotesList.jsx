import { useState } from 'react'
import { Plus, X, MessageSquare, Wrench, User, FileText } from 'lucide-react'
import { addNote, deleteNote } from '../lib/supabase'

const LABEL_CONFIG = {
  preference: { icon: User, color: 'bg-purple-100 text-purple-700', label: 'Preference' },
  equipment: { icon: Wrench, color: 'bg-blue-100 text-blue-700', label: 'Equipment' },
  maid: { icon: FileText, color: 'bg-green-100 text-green-700', label: 'Maid' },
  general: { icon: MessageSquare, color: 'bg-warm-100 text-warm-700', label: 'General' },
}

export default function NotesList({ recipeId, notes, isAuthenticated, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newLabel, setNewLabel] = useState('general')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      const note = await addNote(recipeId, newNote.trim(), newLabel)
      onUpdate?.([...notes, note])
      setNewNote('')
      setAdding(false)
    } catch (e) {
      console.error('Failed to add note:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteNote(id)
      onUpdate?.(notes.filter(n => n.id !== id))
    } catch (e) {
      console.error('Failed to delete note:', e)
    }
  }

  if (!notes?.length && !isAuthenticated) return null

  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-warm-800">Kitchen Notes</h3>
        {isAuthenticated && !adding && (
          <button onClick={() => setAdding(true)} className="kitchen-btn p-1 text-kitchen-green hover:bg-kitchen-green-light rounded-lg">
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notes?.map(note => {
          const config = LABEL_CONFIG[note.label] || LABEL_CONFIG.general
          const Icon = config.icon
          return (
            <div key={note.id} className="flex items-start gap-2 bg-white rounded-lg p-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs shrink-0 ${config.color}`}>
                <Icon size={12} />
                {config.label}
              </span>
              <p className="text-sm text-warm-700 flex-1">{note.note_text}</p>
              {isAuthenticated && (
                <button onClick={() => handleDelete(note.id)} className="text-warm-300 hover:text-kitchen-red shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="mt-3 space-y-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a kitchen note..."
            className="w-full rounded-lg border border-warm-200 p-3 text-sm focus:border-kitchen-green focus:outline-none resize-none"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <select
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="rounded-lg border border-warm-200 px-3 py-2 text-sm focus:border-kitchen-green focus:outline-none"
            >
              <option value="general">General</option>
              <option value="preference">Preference</option>
              <option value="equipment">Equipment</option>
              <option value="maid">Maid</option>
            </select>
            <button onClick={handleAdd} disabled={saving} className="kitchen-btn px-4 py-2 bg-kitchen-green text-white rounded-lg text-sm hover:bg-kitchen-green/90">
              {saving ? 'Saving...' : 'Add Note'}
            </button>
            <button onClick={() => setAdding(false)} className="kitchen-btn px-4 py-2 text-warm-500 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

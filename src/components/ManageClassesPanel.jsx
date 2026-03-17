import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ManageClassesPanel({ classes, onClose, onChanged }) {
  const [name, setName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('classes').insert({
      name: name.trim(),
      teacher_name: teacherName.trim() || null,
    })
    if (error) {
      setError('שגיאה בהוספה, נסה שוב')
    } else {
      setName('')
      setTeacherName('')
      onChanged()
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק כיתה זו? כל השיעורים שלה יימחקו גם כן.')) return
    await supabase.from('classes').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-bold">🏫 ניהול כיתות</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <div className="p-5">
          <form onSubmit={handleAdd} className="mb-5">
            <div className="flex flex-col gap-2 mb-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="שם הכיתה (לדוגמה ה' מרום)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="שם המחנך/ת (אופציונלי)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-2 text-right">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 text-white py-2 rounded-lg font-semibold hover:bg-indigo-600 disabled:opacity-50 transition"
            >
              {loading ? 'מוסיף...' : '+ הוסף כיתה'}
            </button>
          </form>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {classes.length === 0 && (
              <p className="text-gray-400 text-right py-4">אין כיתות עדיין</p>
            )}
            {classes.map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                <div className="text-right">
                  <div className="font-semibold">{cls.name}</div>
                  {cls.teacher_name && (
                    <div className="text-sm text-gray-500">מחנך/ת: {cls.teacher_name}</div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="text-gray-300 hover:text-red-500 transition text-lg"
                  title="מחק כיתה"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

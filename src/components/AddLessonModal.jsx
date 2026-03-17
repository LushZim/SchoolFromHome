import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AddLessonModal({ classId, date, lesson, onClose, onSaved }) {
  const [form, setForm] = useState({
    start_time: '',
    subject: '',
    teacher_name: '',
    join_link: '',
    group_name: '',
    summary: '',
    homework: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lesson) {
      setForm({
        start_time: lesson.start_time?.slice(0, 5) || '',
        subject: lesson.subject || '',
        teacher_name: lesson.teacher_name || '',
        join_link: lesson.join_link || '',
        group_name: lesson.group_name || '',
        summary: lesson.summary || '',
        homework: lesson.homework || '',
        notes: lesson.notes || '',
      })
    }
  }, [lesson])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = {
      class_id: classId,
      date,
      start_time: form.start_time,
      subject: form.subject,
      teacher_name: form.teacher_name,
      join_link: form.join_link || null,
      group_name: form.group_name || null,
      summary: form.summary || null,
      homework: form.homework || null,
      notes: form.notes || null,
    }

    const result = lesson
      ? await supabase.from('lessons').update(data).eq('id', lesson.id)
      : await supabase.from('lessons').insert(data)

    if (result.error) {
      setError('שגיאה בשמירה, נסה שוב')
    } else {
      onSaved()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold">{lesson ? 'עריכת שיעור' : 'הוספת שיעור חדש'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מקצוע *</label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                placeholder="מתמטיקה, אנגלית"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שעת התחלה *</label>
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם המורה *</label>
            <input
              type="text"
              name="teacher_name"
              value={form.teacher_name}
              onChange={handleChange}
              required
              placeholder="שם המורה"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">לינק להצטרפות</label>
            <input
              type="url"
              name="join_link"
              value={form.join_link}
              onChange={handleChange}
              placeholder="https://zoom.us/j/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">קבוצה (אופציונלי)</label>
            <input
              type="text"
              name="group_name"
              value={form.group_name}
              onChange={handleChange}
              placeholder="קבוצה א, קבוצה ב"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">סיכום שיעור (אופציונלי)</label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              placeholder="מה למדנו היום"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שיעורי בית (אופציונלי)</label>
            <textarea
              name="homework"
              value={form.homework}
              onChange={handleChange}
              placeholder="לקרוא עמודים X-Y, לפתור תרגיל"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">הערות (אופציונלי)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="הכנות לשיעור, ציוד נדרש"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-right">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'שומר...' : (lesson ? 'שמור שיעור' : 'הוסף שיעור')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddLessonModal from '../components/AddLessonModal'
import ManageClassesPanel from '../components/ManageClassesPanel'
import CodeEntryModal from '../components/CodeEntryModal'

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function formatTime(t) {
  return t?.slice(0, 5) || ''
}

function dateLabel(dateStr) {
  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))
  if (dateStr === today) return 'היום'
  if (dateStr === tomorrow) return 'מחר'
  return dateStr
}

function groupByTime(lessons) {
  const groups = {}
  lessons.forEach(l => {
    const key = l.start_time
    if (!groups[key]) groups[key] = []
    groups[key].push(l)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export default function TeacherDashboard({ accessLevel, verifyCode, clearAccess }) {
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(
    () => localStorage.getItem('teacher_class_id') || ''
  )
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = toDateStr(new Date())
    const stored = localStorage.getItem('teacher_date')
    // If no stored date, or stored date is from a previous day → use today
    return (stored && stored >= today) ? stored : today
  })
  const [lessons, setLessons] = useState([])
  const [daySummary, setDaySummary] = useState(null)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [showManage, setShowManage] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
  const [showAdminCodeModal, setShowAdminCodeModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadClasses()
  }, [])

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*').order('name')
    setClasses(data || [])
  }

  useEffect(() => {
    localStorage.setItem('teacher_class_id', selectedClassId)
    localStorage.setItem('teacher_date', selectedDate)
  }, [selectedClassId, selectedDate])

  useEffect(() => {
    if (!selectedClassId) {
      setLessons([])
      setDaySummary(null)
      return
    }
    loadLessons()
    loadDaySummary()
  }, [selectedClassId, selectedDate])

  async function loadLessons() {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('date', selectedDate)
      .order('start_time')
    setLessons(data || [])
  }

  async function loadDaySummary() {
    const { data } = await supabase
      .from('day_summaries')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('date', selectedDate)
      .maybeSingle()
    setDaySummary(data || null)
    setSummaryText(data?.content || '')
  }

  async function handleDeleteLesson(id) {
    if (!window.confirm('למחוק שיעור זה?')) return
    await supabase.from('lessons').delete().eq('id', id)
    loadLessons()
  }

  async function handleSaveSummary() {
    const payload = { class_id: selectedClassId, date: selectedDate, content: summaryText }
    await supabase.from('day_summaries').upsert(payload, { onConflict: 'class_id,date' })
    setEditingSummary(false)
    loadDaySummary()
  }

  function handleSystemAdminClick() {
    if (accessLevel === 'admin') {
      navigate('/system-admin')
    } else {
      setShowAdminCodeModal(true)
    }
  }

  async function handleAdminCodeSuccess(code) {
    await verifyCode(code)
    setShowAdminCodeModal(false)
    navigate('/system-admin')
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const lessonGroups = groupByTime(lessons)

  function buildWhatsAppText() {
    const dateObj = new Date(selectedDate + 'T00:00:00')
    const dateFormatted = dateObj.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
    const lines = []
    lines.push(`📚 מערכת שעות – כיתה ${selectedClass?.name}`)
    lines.push(`📅 ${dateFormatted}`)
    lines.push('')
    lessonGroups.forEach(([, group]) => {
      group.forEach(lesson => {
        const time = formatTime(lesson.start_time)
        const group_tag = lesson.group_name ? ` (${lesson.group_name})` : ''
        lines.push(`🕐 ${time} – ${lesson.subject}${group_tag} | ${lesson.teacher_name}`)
        if (lesson.join_link) lines.push(`   🔗 ${lesson.join_link}`)
        if (lesson.summary) lines.push(`   📝 סיכום: ${lesson.summary}`)
        if (lesson.homework) lines.push(`   📖 שיעורי בית: ${lesson.homework}`)
      })
    })
    if (daySummary?.content) {
      lines.push('')
      lines.push(`📋 סיכום יום: ${daySummary.content}`)
    }
    return lines.join('\n')
  }

  async function handleCopySchedule() {
    const text = buildWhatsAppText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">🎓 מערכת שעות – עדכון מורים</h1>
            <p className="text-sm text-gray-500">עדכנו את השיעורים לכל כיתה</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManage(true)}
              className="flex items-center gap-1.5 text-sm border border-gray-300 rounded-xl px-3 py-2 hover:bg-gray-50 transition"
            >
              <span>⚙️</span>
              <span>ניהול כיתות</span>
            </button>
            <button
              onClick={handleSystemAdminClick}
              className="text-xs text-gray-400 hover:text-purple-500 transition border border-gray-200 rounded-lg px-3 py-1.5"
            >
              ניהול מערכת
            </button>
            <Link
              to="/"
              className="text-xs text-gray-400 hover:text-blue-500 transition border border-gray-200 rounded-lg px-3 py-1.5"
            >
              ← תלמידים
            </Link>
            <button
              onClick={clearAccess}
              className="text-xs text-gray-400 hover:text-red-500 transition border border-gray-200 rounded-lg px-3 py-1.5"
            >
              התנתקות
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Filters + Add button */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">בחר כיתה</label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">בחר כיתה</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="absolute top-1/2 right-2.5 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▾</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תאריך</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {selectedClass && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setEditingLesson(null); setShowAddLesson(true) }}
                className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition"
              >
                + הוסף שיעור לכיתה {selectedClass.name} – {dateLabel(selectedDate)}
              </button>
              {lessons.length > 0 && (
                <button
                  onClick={handleCopySchedule}
                  className={`w-full rounded-xl py-2.5 font-semibold transition border ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {copied ? '✓ הועתק ללוח!' : '📋 העתק מערכת לטקסט'}
                </button>
              )}
            </div>
          )}
        </div>

        {selectedClassId && (
          <>
            {/* Day Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                {editingSummary ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingSummary(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleSaveSummary}
                      className="text-sm text-amber-700 font-semibold hover:underline"
                    >
                      שמור
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingSummary(true)}
                    className="text-sm text-amber-600 hover:underline"
                  >
                    ערוך
                  </button>
                )}
                <h3 className="font-bold text-amber-800">📋 סיכום יום</h3>
              </div>

              {editingSummary ? (
                <textarea
                  value={summaryText}
                  onChange={e => setSummaryText(e.target.value)}
                  rows={3}
                  placeholder="הוסף סיכום יום לכיתה"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none text-sm"
                />
              ) : (
                <p className="text-amber-700 text-sm">
                  {daySummary?.content || <span className="text-amber-400 italic">אין סיכום יום עדיין. לחץ ערוך להוספה.</span>}
                </p>
              )}
            </div>

            {/* Lessons */}
            {lessons.length === 0 ? (
              <p className="text-gray-400 text-center py-16 bg-white rounded-2xl border border-gray-100">
                אין שיעורים ביום זה. לחץ על &quot;הוסף שיעור&quot; למעלה.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {lessonGroups.map(([time, group]) => (
                  <div
                    key={time}
                    className={`grid gap-3 ${group.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {group.map(lesson => (
                      <div key={lesson.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="text-gray-300 hover:text-red-500 transition"
                              title="מחק שיעור"
                            >
                              🗑️
                            </button>
                            <button
                              onClick={() => { setEditingLesson(lesson); setShowAddLesson(true) }}
                              className="text-gray-300 hover:text-indigo-500 transition"
                              title="ערוך שיעור"
                            >
                              ✏️
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                              {lesson.group_name || 'כל הכיתה'}
                            </span>
                            <span className="text-blue-600 font-bold">{formatTime(lesson.start_time)}</span>
                            <span className="text-base">🕐</span>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-right mb-1">{lesson.subject}</h3>
                        <p className="text-gray-500 text-sm text-right mb-3 flex items-center gap-1 justify-end">
                          <span>{lesson.teacher_name}</span>
                          <span>👤</span>
                        </p>

                        {lesson.join_link && (
                          <a
                            href={lesson.join_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white rounded-xl py-2 font-semibold hover:bg-blue-600 transition mb-2 text-sm"
                          >
                            <span>↗</span>
                            <span>הצטרף לשיעור</span>
                          </a>
                        )}

                        {lesson.summary && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 mt-2 text-sm text-green-800 text-right">
                            סיכום: {lesson.summary}
                          </div>
                        )}

                        {lesson.homework && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2 text-sm text-amber-800 text-right">
                            שיעורי בית: {lesson.homework}
                          </div>
                        )}

                        {lesson.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mt-2 text-sm text-blue-800 text-right">
                            הערות: {lesson.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showManage && (
        <ManageClassesPanel
          classes={classes}
          onClose={() => setShowManage(false)}
          onChanged={() => { loadClasses(); setShowManage(false) }}
        />
      )}

      {showAddLesson && (
        <AddLessonModal
          classId={selectedClassId}
          date={selectedDate}
          lesson={editingLesson}
          onClose={() => { setShowAddLesson(false); setEditingLesson(null) }}
          onSaved={() => { setShowAddLesson(false); setEditingLesson(null); loadLessons() }}
        />
      )}

      {showAdminCodeModal && (
        <CodeEntryModal
          roleLabel="ניהול מערכת"
          onSuccess={handleAdminCodeSuccess}
          onCancel={() => setShowAdminCodeModal(false)}
        />
      )}
    </div>
  )
}

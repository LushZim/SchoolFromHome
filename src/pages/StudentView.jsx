import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function formatTime(t) {
  return t?.slice(0, 5) || ''
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

function LessonCard({ lesson }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
          {lesson.group_name || 'כל הכיתה'}
        </span>
        <div className="flex items-center gap-1 text-blue-600 font-bold text-lg">
          <span>{formatTime(lesson.start_time)}</span>
          <span className="text-base">🕐</span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">{lesson.subject}</h3>
      <p className="text-gray-500 text-sm mb-3 flex items-center gap-1 justify-end">
        <span>{lesson.teacher_name}</span>
        <span>👤</span>
      </p>

      {lesson.join_link && (
        <a
          href={lesson.join_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white text-center rounded-xl py-2.5 font-semibold hover:bg-blue-600 active:bg-blue-700 transition mb-3"
        >
          <span>↗</span>
          <span>הצטרף לשיעור</span>
        </a>
      )}

      {lesson.summary && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 mt-2 text-sm text-green-800">
          סיכום: {lesson.summary}
        </div>
      )}

      {lesson.homework && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2 text-sm text-amber-800">
          שיעורי בית: {lesson.homework}
        </div>
      )}

      {lesson.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mt-2 text-sm text-blue-800">
          הערות: {lesson.notes}
        </div>
      )}
    </div>
  )
}

function LessonsSection({ title, lessonGroups }) {
  return (
    <div className="mb-8">
      <h2 className="text-right font-semibold text-gray-600 mb-3">{title}</h2>
      <div className="flex flex-col gap-3">
        {lessonGroups.map(([time, group]) => (
          <div
            key={time}
            className={`grid gap-3 ${group.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            {group.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StudentView({ accessLevel, clearAccess }) {
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(
    () => localStorage.getItem('student_class_id') || ''
  )
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = toDateStr(new Date())
    const stored = localStorage.getItem('student_date')
    // If no stored date, or stored date is from a previous day → use today
    return (stored && stored >= today) ? stored : today
  })
  const [todayLessons, setTodayLessons] = useState([])
  const [tomorrowLessons, setTomorrowLessons] = useState([])
  const [daySummary, setDaySummary] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      setClasses(data || [])
    })
  }, [])

  useEffect(() => {
    if (!selectedClassId) {
      setTodayLessons([])
      setTomorrowLessons([])
      setDaySummary(null)
      return
    }
    localStorage.setItem('student_class_id', selectedClassId)
    localStorage.setItem('student_date', selectedDate)
    setLoading(true)

    const tomorrow = new Date(selectedDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toDateStr(tomorrow)

    Promise.all([
      supabase.from('lessons').select('*').eq('class_id', selectedClassId).eq('date', selectedDate).order('start_time'),
      supabase.from('lessons').select('*').eq('class_id', selectedClassId).eq('date', tomorrowStr).order('start_time'),
      supabase.from('day_summaries').select('*').eq('class_id', selectedClassId).eq('date', selectedDate).maybeSingle(),
    ]).then(([today, tmrw, summary]) => {
      setTodayLessons(today.data || [])
      setTomorrowLessons(tmrw.data || [])
      setDaySummary(summary.data || null)
      setLoading(false)
    })
  }, [selectedClassId, selectedDate])

  const todayGroups = groupByTime(todayLessons)
  const tomorrowGroups = groupByTime(tomorrowLessons)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">📚 השיעורים שלי</h1>
            <p className="text-sm text-gray-500">בחר כיתה ותאריך כדי לראות את השיעורים</p>
          </div>
          <div className="flex items-center gap-2">
            {(accessLevel === 'teacher' || accessLevel === 'admin') && (
              <Link
                to="/teacher"
                className="text-xs text-gray-400 hover:text-indigo-500 transition border border-gray-200 rounded-lg px-3 py-1.5 shrink-0"
              >
                כניסת מורה ←
              </Link>
            )}
            <button
              onClick={clearAccess}
              className="text-xs text-gray-400 hover:text-red-500 transition border border-gray-200 rounded-lg px-3 py-1.5 shrink-0"
            >
              התנתקות
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">הכיתה שלי</label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!selectedClassId && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-7xl mb-4">📖</div>
            <p className="text-lg">בחר כיתה כדי לראות את השיעורים</p>
          </div>
        )}

        {/* Loading */}
        {selectedClassId && loading && (
          <div className="text-center py-24 text-gray-400">טוען שיעורים...</div>
        )}

        {/* Content */}
        {selectedClassId && !loading && (
          <>
            {/* Day summary */}
            {daySummary && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <h3 className="font-bold text-amber-800">📋 סיכום יום</h3>
                  <span className="text-amber-500">↗</span>
                </div>
                <p className="text-amber-700 text-sm">{daySummary.content}</p>
              </div>
            )}

            {/* Today */}
            {todayLessons.length === 0 ? (
              <p className="text-gray-400 text-center py-12 bg-white rounded-2xl border border-gray-100">
                אין שיעורים ביום זה
              </p>
            ) : (
              <LessonsSection
                title={`שיעורים להיום – ${todayLessons.length} שיעורים`}
                lessonGroups={todayGroups}
              />
            )}

            {/* Tomorrow */}
            {tomorrowLessons.length > 0 && (
              <LessonsSection
                title={`שיעורים למחר – ${tomorrowLessons.length} שיעורים`}
                lessonGroups={tomorrowGroups}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

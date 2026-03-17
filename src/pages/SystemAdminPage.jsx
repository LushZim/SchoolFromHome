import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function SettingRow({ label, value, onSave, type = 'text', description }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(value) }, [value])

  async function handleSave() {
    setLoading(true)
    try {
      await onSave(draft)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err.message || 'שגיאה בשמירה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-right">{label}</span>
        {saved && <span className="text-green-500 text-sm">✓ נשמר</span>}
      </div>
      {description && (
        <p className="text-gray-400 text-sm text-right">{description}</p>
      )}
      <div className="flex gap-2 items-center">
        {editing ? (
          <>
            <input
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              dir="auto"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'שומר...' : 'שמור'}
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(value) }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              ביטול
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg transition-colors"
            >
              עריכה
            </button>
            <span className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-right text-sm text-gray-700 font-mono">
              {'•'.repeat(Math.min(draft?.length || 0, 10))}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onSave, description }) {
  const [loading, setLoading] = useState(false)
  const isOn = value === 'true'

  async function handleToggle() {
    setLoading(true)
    try {
      await onSave(isOn ? 'false' : 'true')
    } catch (err) {
      alert(err.message || 'שגיאה בשמירה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-right">{label}</span>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
            isOn ? 'bg-blue-600' : 'bg-gray-300'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            isOn ? 'translate-x-0.5' : 'translate-x-6'
          }`} />
        </button>
      </div>
      {description && (
        <p className="text-gray-400 text-sm text-right">{description}</p>
      )}
      <p className="text-sm text-right font-medium" style={{ color: isOn ? '#2563eb' : '#6b7280' }}>
        {isOn ? 'קוד נדרש' : 'גישה חופשית (ללא קוד)'}
      </p>
    </div>
  )
}

export default function SystemAdminPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    student_code: '',
    teacher_code: '',
    admin_code: '',
    student_code_required: 'true',
    teacher_code_required: 'true',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    // Load code_required flags via public RPC
    const { data: pub } = await supabase.rpc('get_public_settings')
    if (pub) {
      setSettings(prev => ({
        ...prev,
        student_code_required: pub.student_code_required,
        teacher_code_required: pub.teacher_code_required,
      }))
    }
    setLoading(false)
  }

  async function saveSetting(key, value) {
    const { error } = await supabase.rpc('admin_update_setting', {
      admin_code_input: '',  // caller already has admin access level
      setting_key: key,
      new_value: value,
    })
    if (error) throw new Error(error.message)
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-lg">טוען...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-800">⚙️ ניהול מערכת</h1>
            <p className="text-sm text-gray-500">הגדרות גישה וקודים</p>
          </div>
          <button
            onClick={() => navigate('/teacher')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            ← חזור
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Access Codes Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 text-right mb-4">🔑 קודי גישה</h2>
          <div className="flex flex-col gap-3">
            <SettingRow
              label="קוד תלמידים"
              value={settings.student_code}
              description="הקוד שתלמידים מכניסים כדי לצפות במערכת"
              onSave={(v) => saveSetting('student_code', v)}
            />
            <SettingRow
              label="קוד מורים"
              value={settings.teacher_code}
              description="הקוד שמורים מכניסים כדי לגשת לניהול השיעורים"
              onSave={(v) => saveSetting('teacher_code', v)}
            />
            <SettingRow
              label="קוד ניהול מערכת"
              value={settings.admin_code}
              description="הקוד לגישה לעמוד ניהול מערכת זה"
              onSave={(v) => saveSetting('admin_code', v)}
            />
          </div>
        </section>

        {/* Code Required Toggles */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 text-right mb-4">🔒 הגדרות גישה</h2>
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="קוד נדרש לתלמידים"
              value={settings.student_code_required}
              description="כאשר מופעל, תלמידים חייבים להכניס קוד לפני הכניסה"
              onSave={(v) => saveSetting('student_code_required', v)}
            />
            <ToggleRow
              label="קוד נדרש למורים"
              value={settings.teacher_code_required}
              description="כאשר מופעל, מורים חייבים להכניס קוד לפני הכניסה"
              onSave={(v) => saveSetting('teacher_code_required', v)}
            />
          </div>
        </section>

        <p className="text-xs text-gray-400 text-right">
          שינויים בקודים ייכנסו לתוקף מיידית. משתמשים שכבר נכנסו לא יושפעו.
        </p>
      </div>
    </div>
  )
}

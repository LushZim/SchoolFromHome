import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeEntryModal from '../components/CodeEntryModal'

export default function LandingPage({ verifyCode, requestFreeAccess, publicSettings }) {
  const navigate = useNavigate()
  const [pendingRole, setPendingRole] = useState(null) // 'student' | 'teacher'
  const [freeAccessLoading, setFreeAccessLoading] = useState(false)

  async function handleRoleSelect(role) {
    const codeRequired = role === 'student'
      ? publicSettings?.student_code_required !== 'false'
      : publicSettings?.teacher_code_required !== 'false'

    if (!codeRequired) {
      // No code needed — grant access via backend then navigate
      setFreeAccessLoading(true)
      try {
        await requestFreeAccess(role)
        navigate(role === 'teacher' ? '/teacher' : '/')
      } catch (err) {
        console.error('Free access error:', err)
      } finally {
        setFreeAccessLoading(false)
      }
      return
    }

    setPendingRole(role)
  }

  async function handleCodeSuccess(code) {
    const newLevel = await verifyCode(code)
    setPendingRole(null)
    if (newLevel === 'teacher' || newLevel === 'admin') {
      navigate('/teacher')
    } else {
      navigate('/')
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">לימוד מהבית</h1>
        <p className="text-gray-500 text-lg">בחר את סוג הכניסה שלך</p>
      </div>

      {/* Role Cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        {/* Student Card */}
        <button
          onClick={() => handleRoleSelect('student')}
          disabled={freeAccessLoading}
          className="flex-1 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 p-8 text-center group cursor-pointer border-2 border-transparent hover:border-blue-300 disabled:opacity-60"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">
            👩‍🎓
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">אני תלמיד/ה</h2>
          <p className="text-gray-500 text-sm">צפייה במערכת השעות והשיעורים</p>
        </button>

        {/* Teacher Card */}
        <button
          onClick={() => handleRoleSelect('teacher')}
          disabled={freeAccessLoading}
          className="flex-1 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 p-8 text-center group cursor-pointer border-2 border-transparent hover:border-green-300 disabled:opacity-60"
        >
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">
            👩‍🏫
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">אני מורה</h2>
          <p className="text-gray-500 text-sm">עדכון שיעורים וניהול מערכת</p>
        </button>
      </div>

      {freeAccessLoading && (
        <p className="mt-6 text-gray-400 text-sm">טוען...</p>
      )}

      {/* Code Entry Modal */}
      {pendingRole && (
        <CodeEntryModal
          roleLabel={pendingRole === 'student' ? 'תלמיד/ה' : 'מורה'}
          onSuccess={handleCodeSuccess}
          onCancel={() => setPendingRole(null)}
        />
      )}
    </div>
  )
}

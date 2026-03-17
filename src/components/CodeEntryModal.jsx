import { useState } from 'react'

export default function CodeEntryModal({ roleLabel, onSuccess, onCancel }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setLoading(true)
    try {
      await onSuccess(code.trim())
    } catch (err) {
      setError('קוד שגוי, נסה שנית')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8" dir="rtl">
        <h2 className="text-2xl font-bold text-gray-800 text-right mb-2">
          הכנס קוד גישה
        </h2>
        <p className="text-gray-500 text-right mb-6 text-sm">
          כדי להיכנס כ{roleLabel} יש להכניס את הקוד המתאים
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value); setError('') }}
            placeholder="הכנס קוד"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-right text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
            dir="auto"
          />

          {error && (
            <p className="text-red-500 text-right text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'בודק...' : 'כניסה'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
            >
              ביטול
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

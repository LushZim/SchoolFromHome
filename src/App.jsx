import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAccess } from './hooks/useAccess'
import StudentView from './pages/StudentView'
import TeacherDashboard from './pages/TeacherDashboard'
import SystemAdminPage from './pages/SystemAdminPage'
import LandingPage from './pages/LandingPage'

const LEVELS = ['student', 'teacher', 'admin']

function AccessRoute({ accessLevel, required, children, fallback }) {
  const hasAccess = accessLevel && LEVELS.indexOf(accessLevel) >= LEVELS.indexOf(required)
  if (!hasAccess) return fallback
  return children
}

export default function App() {
  const { accessLevel, loading, publicSettings, verifyCode, requestFreeAccess } = useAccess()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">טוען...</div>
      </div>
    )
  }

  const landing = <LandingPage verifyCode={verifyCode} requestFreeAccess={requestFreeAccess} publicSettings={publicSettings} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <AccessRoute accessLevel={accessLevel} required="student" fallback={landing}>
            <StudentView accessLevel={accessLevel} />
          </AccessRoute>
        } />
        <Route path="/teacher" element={
          <AccessRoute accessLevel={accessLevel} required="teacher" fallback={landing}>
            <TeacherDashboard accessLevel={accessLevel} verifyCode={verifyCode} />
          </AccessRoute>
        } />
        <Route path="/system-admin" element={
          <AccessRoute accessLevel={accessLevel} required="admin" fallback={landing}>
            <SystemAdminPage />
          </AccessRoute>
        } />
        <Route path="*" element={
          accessLevel
            ? <Navigate to={accessLevel === 'student' ? '/' : '/teacher'} replace />
            : landing
        } />
      </Routes>
    </BrowserRouter>
  )
}

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import VerifyEmail from './VerifyEmail'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, needsVerification } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF1F8]">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (needsVerification) return <VerifyEmail />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  return children
}

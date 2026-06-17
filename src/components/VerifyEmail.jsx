import { useState } from 'react'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function VerifyEmail() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const email = auth.currentUser?.email

  const resend = async () => {
    setLoading(true)
    setError('')
    try {
      await sendEmailVerification(auth.currentUser)
      setSent(true)
    } catch {
      setError('Demasiados pedidos. Aguarda uns minutos e tenta de novo.')
    } finally {
      setLoading(false)
    }
  }

  const recheck = async () => {
    setLoading(true)
    try {
      await auth.currentUser?.reload()
      // Força um token novo para o claim email_verified ficar atualizado.
      await auth.currentUser?.getIdToken(true)
    } catch { /* ignore */ }
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-[#EEF1F8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-7 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Confirma o teu email</h1>
        <p className="text-sm text-slate-500">Enviámos um link de confirmação para</p>
        <p className="text-sm font-bold text-slate-900 mb-4">{email}</p>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Abre o email e clica no link para ativares a conta. Depois volta aqui e carrega em <strong>"Já confirmei"</strong>. (Vê também o spam.)
        </p>
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        {sent && <p className="text-green-600 text-xs mb-3">Email reenviado ✓</p>}
        <button onClick={recheck} disabled={loading} className="btn-primary w-full mb-2">
          {loading ? 'A verificar...' : 'Já confirmei — entrar'}
        </button>
        <button onClick={resend} disabled={loading} className="w-full text-sm text-slate-500 hover:text-slate-900 py-2 transition-colors">
          Reenviar email
        </button>
        <button onClick={() => signOut(auth)} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
          Sair
        </button>
      </div>
    </div>
  )
}

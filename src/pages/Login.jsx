import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { setPendingName } from '../authPending'
import PrizeImg from '../components/PrizeImg'
import { PRIZES } from '../data/prizes'

const ALLOWED_DOMAIN = 'datacolab.pt'

function getErrorMsg(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou password incorretos.'
    case 'auth/email-already-in-use':
      return 'Este email já está registado. Faz login.'
    case 'auth/weak-password':
      return 'A password deve ter pelo menos 6 caracteres.'
    case 'auth/invalid-email':
      return 'Email inválido.'
    case 'auth/too-many-requests':
      return 'Demasiadas tentativas. Aguarda uns minutos e tenta de novo.'
    default:
      return 'Ocorreu um erro. Tenta novamente.'
  }
}

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => { if (user) navigate('/') }, [user, navigate])

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setResetSent(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(getErrorMsg(err.code))
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Só são aceites emails @${ALLOWED_DOMAIN}.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      setPendingName(name.trim())
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name.trim() })
      // Envia email de verificação. O perfil/apostas só ficam ativos após
      // confirmar (gate no frontend + as regras exigem email verificado).
      await sendEmailVerification(cred.user)
    } catch (err) {
      setError(getErrorMsg(err.code))
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err) {
      setError(getErrorMsg(err.code))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-gold transition-colors text-sm"

  return (
    <div className="min-h-screen bg-[#EEF1F8] flex items-center justify-center p-4">
      {/* Background glow — cores do Mundial */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-electric/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-[420px] h-[420px] bg-royal/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[460px] h-[460px] bg-pitch/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.jpg" alt="" className="w-14 h-14 rounded-full object-cover" />
            <span className="text-6xl font-black text-slate-900 tracking-tighter leading-none">26</span>
          </div>
          <div className="h-1 w-32 mx-auto rounded-full wc-stripe mb-4" />
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Data<span className="text-gold">Bets</span>
          </h1>
          <p className="text-slate-900 mt-3 text-lg font-black leading-tight">
            Faz o teu palpite.<br />Ganha o Mundial da empresa. 🏆
          </p>
          <p className="text-slate-500 mt-2 text-sm">Sem saber nada de futebol — só de arriscar bem. 🎯</p>
        </div>

        {/* Card */}
        <div className="card p-6">

          {/* LOGIN */}
          {mode === 'login' && (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-5">Entrar</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={`nome@${ALLOWED_DOMAIN}`} className={inputClass} required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className={inputClass} required
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'A entrar...' : 'Entrar'}
                </button>
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => switchMode('reset')}
                    className="text-xs text-slate-500 hover:text-slate-600 transition-colors">
                    Esqueci a password
                  </button>
                  <button type="button" onClick={() => switchMode('register')}
                    className="text-xs text-gold hover:text-gold-light transition-colors font-semibold">
                    Criar conta →
                  </button>
                </div>
              </form>
            </>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => switchMode('login')} className="text-slate-500 hover:text-slate-900 transition-colors text-lg">←</button>
                <h2 className="text-lg font-bold text-slate-900">Criar conta</h2>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Nome</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="O teu nome" className={inputClass} required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={`nome@${ALLOWED_DOMAIN}`} className={inputClass} required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className={inputClass} required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Confirmar password</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repete a password" className={inputClass} required
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'A criar conta...' : 'Criar conta'}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Só aceita emails <span className="text-slate-500">@{ALLOWED_DOMAIN}</span>
                </p>
              </form>
            </>
          )}

          {/* RESET */}
          {mode === 'reset' && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => switchMode('login')} className="text-slate-500 hover:text-slate-900 transition-colors text-lg">←</button>
                <h2 className="text-lg font-bold text-slate-900">Recuperar password</h2>
              </div>
              {resetSent ? (
                <div className="text-center py-2">
                  <div className="text-4xl mb-4">📧</div>
                  <p className="text-slate-600 text-sm mb-1">Email enviado para</p>
                  <p className="text-slate-900 font-semibold text-sm mb-4">{email}</p>
                  <p className="text-slate-500 text-xs mb-5">Clica no link do email para definir uma nova password.</p>
                  <button onClick={() => switchMode('login')} className="text-sm text-gold hover:text-gold-light transition-colors font-semibold">
                    Voltar ao login →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <p className="text-slate-500 text-sm">Vamos enviar-te um link para redefinires a tua password.</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={`nome@${ALLOWED_DOMAIN}`} className={inputClass} required
                    />
                  </div>
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'A enviar...' : 'Enviar link de recuperação'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Prizes teaser */}
        <div className="mt-6 card p-4 border-gold/20">
          <p className="text-xs text-gold text-center mb-3 font-bold uppercase tracking-widest">Prémios em jogo</p>
          <div className="grid grid-cols-3 gap-2">
            {PRIZES.map((p) => (
              <div key={p.rank} className={`rounded-xl border p-3 text-center ${p.prizeBg}`}>
                <div className="flex items-center justify-center h-16 mb-2">
                  <PrizeImg src={p.prizeImg} fallback={p.prizeIcon} size="lg" />
                </div>
                <p className={`text-xs font-black ${p.prizeColor}`}>{p.rank} lugar</p>
                <p className="text-xs text-slate-900 font-semibold mt-0.5 leading-tight">{p.prize}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

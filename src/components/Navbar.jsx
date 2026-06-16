import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-semibold transition-colors ${
        location.pathname === to
          ? 'text-gold'
          : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-40 bg-[#EEF1F8]/95 backdrop-blur border-b border-[#E2E7F2]">
      {/* Faixa multicolor — assinatura Mundial 2026 */}
      <div className="h-1 wc-stripe" />
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          <span className="font-black text-slate-900 tracking-tight">Data<span className="text-gold">Bets</span></span>
          <span className="text-[10px] font-black text-black bg-gold rounded px-1 py-0.5 leading-none tracking-tight">26</span>
        </Link>

        <div className="flex items-center gap-5">
          {navLink('/', 'Apostas')}
          {navLink('/calendario', 'Calendário')}
          {navLink('/leaderboard', 'Ranking')}
          {isAdmin && navLink('/admin', 'Admin')}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">{user?.name}</p>
            <p className="text-sm font-bold text-gold">{user?.totalPoints ?? 0} pts</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}

import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { getEmoji } from '../utils/flags'

export default function BetModal({ market, onClose }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBet = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const betId = `${user.uid}_${market.id}`
      await setDoc(doc(db, 'bets', betId), {
        userId: user.uid,
        marketId: market.id,
        optionId: selected,
        placedAt: serverTimestamp(),
      })
      onClose(true)
    } catch (err) {
      setError('Erro ao registar aposta. O mercado pode já ter fechado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E2E7F2] rounded-2xl p-6 animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-900 pr-4">{market.title}</h2>
          <button onClick={() => onClose(false)} className="text-slate-500 hover:text-slate-900 text-xl leading-none">✕</button>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
            {market.points} pts
          </span>
          <span className="text-xs text-slate-500">A aposta não pode ser alterada após confirmar</span>
        </div>

        <div className="space-y-2 mb-6">
          {market.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                selected === opt.id
                  ? 'bg-gold/10 border-gold text-slate-900 font-semibold'
                  : 'bg-[#F4F6FB] border-[#E2E7F2] text-slate-600 hover:border-[#C8D0E4] hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected === opt.id ? 'border-gold' : 'border-gray-600'
                }`}>
                  {selected === opt.id && <div className="w-2 h-2 rounded-full bg-gold" />}
                </div>
                {getEmoji(opt.label) && (
                  <span className="text-lg leading-none">{getEmoji(opt.label)}</span>
                )}
                {opt.label}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={handleBet}
          disabled={!selected || loading}
          className="btn-primary w-full text-center"
        >
          {loading ? 'A registar...' : 'Confirmar Aposta'}
        </button>
      </div>
    </div>
  )
}

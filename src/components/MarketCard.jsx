import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { getEmoji } from '../utils/flags'
import CountdownTimer from './CountdownTimer'
import OptionAvatar from './OptionAvatar'

export default function MarketCard({ market, userBet }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const closesAt = market.closesAt?.toDate?.()
  const isExpired = closesAt && now > closesAt
  const isOpen = market.status === 'open' && !isExpired
  const isResolved = market.status === 'resolved'

  const winningOption = isResolved
    ? market.options.find(o => o.id === market.winningOptionId)
    : null

  const userOption = userBet
    ? market.options.find(o => o.id === userBet.optionId)
    : null

  const userWon = isResolved && userBet && userBet.optionId === market.winningOptionId

  const handleBet = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await setDoc(doc(db, 'bets', `${user.uid}_${market.id}`), {
        userId: user.uid,
        marketId: market.id,
        optionId: selected,
        placedAt: serverTimestamp(),
      })
    } catch {
      setError('Erro ao registar. O mercado pode já ter fechado.')
      setLoading(false)
    }
  }

  const manyOptions = market.options.length > 5

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 leading-snug">{market.title}</h3>
        <span className="text-xs font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          {market.points} pts
        </span>
      </div>

      {/* Description */}
      {market.description && (
        <p className="text-xs text-slate-500 leading-relaxed -mt-1">{market.description}</p>
      )}

      {/* Status + Timer */}
      <div className="flex items-center justify-between">
        {isResolved ? (
          <span className="badge-resolved">Resolvido</span>
        ) : isOpen ? (
          <span className="badge-open">Aberto</span>
        ) : (
          <span className="badge-closed">Encerrado</span>
        )}
        {isOpen && closesAt && (
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <span>Fecha em</span>
            <CountdownTimer closesAt={market.closesAt} />
          </div>
        )}
      </div>

      {/* Options — shown when open and no bet yet */}
      {isOpen && !userBet && (
        <div className="space-y-2">
          <div className={manyOptions ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
            {market.options.map(opt => {
              const emoji = getEmoji(opt.label)
              const isSelected = selected === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(isSelected ? null : opt.id)}
                  className={`w-full text-left rounded-xl border transition-all duration-150 ${
                    manyOptions ? 'px-3 py-2.5' : 'px-3.5 py-3'
                  } ${
                    isSelected
                      ? 'bg-gold/10 border-gold text-slate-900 font-semibold'
                      : 'bg-[#F4F6FB] border-[#E2E7F2] text-slate-600 hover:border-[#B5BFD9] hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-gold' : 'border-gray-600'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold" />}
                    </div>
                    <OptionAvatar label={opt.label} />
                    <span className={manyOptions ? 'text-xs' : 'text-sm'}>{opt.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="space-y-2 pt-1">
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <button
                onClick={handleBet}
                disabled={loading}
                className="btn-primary w-full text-sm"
              >
                {loading ? 'A registar...' : 'Confirmar Aposta'}
              </button>
              <p className="text-center text-xs text-slate-400">A aposta não pode ser alterada</p>
            </div>
          )}
        </div>
      )}

      {/* Closed with no bet */}
      {!isOpen && !isResolved && !userBet && (
        <p className="text-xs text-slate-400 text-center py-1">Encerrado sem aposta</p>
      )}

      {/* User bet — locked */}
      {userBet && !isResolved && userOption && (
        <div className="bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OptionAvatar label={userOption.label} />
            <div>
              <p className="text-xs text-slate-500">A tua aposta</p>
              <p className="text-sm font-semibold text-slate-900">{userOption.label}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 bg-[#EEF2FB] px-2 py-1 rounded-full">🔒 Apostado</span>
        </div>
      )}

      {/* Resolved — show result + user outcome */}
      {isResolved && (
        <div className="space-y-2">
          {winningOption && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Resultado</p>
              <div className="flex items-center gap-2">
                <OptionAvatar label={winningOption.label} />
                <p className="text-sm font-bold text-gold">{winningOption.label}</p>
              </div>
            </div>
          )}
          {userOption && (
            <div className={`rounded-xl px-3.5 py-2.5 border flex items-center justify-between ${
              userWon
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <OptionAvatar label={userOption.label} />
                <div>
                  <p className="text-xs text-slate-500">A tua aposta</p>
                  <p className="text-sm font-semibold text-slate-900">{userOption.label}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg">{userWon ? '✅' : '❌'}</span>
                {userWon && <p className="text-xs text-green-400 font-bold">+{market.points} pts</p>}
              </div>
            </div>
          )}
          {!userBet && (
            <p className="text-xs text-slate-400 text-center py-1">Sem aposta registada</p>
          )}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import CountdownTimer from './CountdownTimer'
import OptionAvatar from './OptionAvatar'

const archivo = { fontFamily: "'Archivo', sans-serif" }

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

  const optCols =
    market.options.length === 2 ? 'grid-cols-2'
      : market.options.length === 3 ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-3'

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 style={archivo} className="text-[15px] font-extrabold text-[#0E1B33] leading-snug">{market.title}</h3>
        <span className="text-xs font-extrabold text-[#9A6B00] bg-[#FFF3D6] border border-[#F0DCA0] px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
          ⭐ {market.points} pts
        </span>
      </div>

      {/* Description */}
      {market.description && (
        <p className="text-xs text-[#8C8474] leading-relaxed -mt-1">{market.description}</p>
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
          <div className="flex items-center gap-1 text-[#8C8474] text-xs">
            <span>Fecha em</span>
            <CountdownTimer closesAt={market.closesAt} />
          </div>
        )}
      </div>

      {/* Options — shown when open and no bet yet */}
      {isOpen && !userBet && (
        <div className="space-y-3">
          <div className={`grid gap-2.5 ${optCols}`}>
            {market.options.map(opt => {
              const isSelected = selected === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(isSelected ? null : opt.id)}
                  style={isSelected
                    ? { background: '#F5453B14', border: '2px solid #F5453B' }
                    : { background: '#fff', border: '2px solid #EBE3D4' }}
                  className="relative flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-bold leading-tight text-[#0E1B33] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <OptionAvatar label={opt.label} />
                  <span className="min-w-0 flex-1">{opt.label}</span>
                  {isSelected && (
                    <span style={{ background: '#F5453B' }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white shadow">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="space-y-2 pt-1">
              {error && <p className="text-[#C8281F] text-xs font-semibold">{error}</p>}
              <button
                onClick={handleBet}
                disabled={loading}
                style={archivo}
                className="w-full rounded-2xl bg-[#0E1B33] py-3 text-sm font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? 'A registar...' : 'Confirmar Aposta 🎯'}
              </button>
              <p className="text-center text-xs text-[#A89E88]">A aposta não pode ser alterada</p>
            </div>
          )}
        </div>
      )}

      {/* Closed with no bet */}
      {!isOpen && !isResolved && !userBet && (
        <p className="text-xs text-[#A89E88] text-center py-1">Encerrado sem aposta</p>
      )}

      {/* User bet — locked */}
      {userBet && !isResolved && userOption && (
        <div className="bg-white border-2 border-[#EBE3D4] rounded-2xl px-3.5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OptionAvatar label={userOption.label} />
            <div>
              <p className="text-xs text-[#8C8474]">A tua aposta</p>
              <p className="text-sm font-bold text-[#0E1B33]">{userOption.label}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#8C8474] bg-[#F3ECDD] px-2.5 py-1 rounded-full">🔒 Apostado</span>
        </div>
      )}

      {/* Resolved — show result + user outcome */}
      {isResolved && (
        <div className="space-y-2">
          {winningOption && (
            <div className="bg-[#FFF3D6] border border-[#F0DCA0] rounded-2xl px-3.5 py-2.5">
              <p className="text-xs text-[#8C8474] mb-0.5">Resultado</p>
              <div className="flex items-center gap-2">
                <OptionAvatar label={winningOption.label} />
                <p className="text-sm font-extrabold text-[#9A6B00]">{winningOption.label}</p>
              </div>
            </div>
          )}
          {userOption && (
            <div className={`rounded-2xl px-3.5 py-2.5 border-2 flex items-center justify-between ${
              userWon
                ? 'bg-[#15A66E]/10 border-[#15A66E]/40'
                : 'bg-[#F5453B]/10 border-[#F5453B]/40'
            }`}>
              <div className="flex items-center gap-2">
                <OptionAvatar label={userOption.label} />
                <div>
                  <p className="text-xs text-[#8C8474]">A tua aposta</p>
                  <p className="text-sm font-bold text-[#0E1B33]">{userOption.label}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg">{userWon ? '✅' : '❌'}</span>
                {userWon && <p className="text-xs text-[#15A66E] font-bold">+{market.points} pts</p>}
              </div>
            </div>
          )}
          {!userBet && (
            <p className="text-xs text-[#A89E88] text-center py-1">Sem aposta registada</p>
          )}
        </div>
      )}
    </div>
  )
}

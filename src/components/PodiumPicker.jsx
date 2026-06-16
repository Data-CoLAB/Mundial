import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { TIERS, CLOSE_AT, POINTS_BY_ROUND, ROUND_LABELS, ROUNDS } from '../data/podiumTiers'
import { FLAG } from '../data/worldcupGroups'

function Flag({ team, size = 18 }) {
  const code = FLAG[team]
  if (!code) return null
  const h = Math.round(size * 0.75)
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${h * 2}.png 2x`}
      alt=""
      className="rounded-[2px] shrink-0"
      style={{ width: size, height: h }}
    />
  )
}

function useCountdown(target) {
  const [label, setLabel] = useState('')
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setLabel(''); setExpired(true); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setLabel(`${d}d ${h}h`)
      else if (h > 0) setLabel(`${h}h ${m}m ${s}s`)
      else setLabel(`${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return { label, expired }
}

export default function PodiumPicker() {
  const { user } = useAuth()
  const [picks, setPicks] = useState({ tier1: null, tier2: null, tier3: null })
  const [savedPick, setSavedPick] = useState(null)
  const [podiumConfig, setPodiumConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { label: countdown, expired: isClosed } = useCountdown(CLOSE_AT)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getDoc(doc(db, 'podiumPicks', user.uid)),
      getDoc(doc(db, 'config', 'podium')),
    ]).then(([pickDoc, configDoc]) => {
      if (pickDoc.exists()) setSavedPick(pickDoc.data())
      if (configDoc.exists()) setPodiumConfig(configDoc.data())
      setLoading(false)
    })
  }, [user])

  const select = (tierId, team) => {
    if (savedPick || isClosed) return
    setPicks(p => ({ ...p, [tierId]: team }))
  }

  const submit = async () => {
    if (!picks.tier1 || !picks.tier2 || !picks.tier3) {
      setError('Escolhe uma seleção em cada tier.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const data = {
        userId: user.uid,
        tier1: picks.tier1,
        tier2: picks.tier2,
        tier3: picks.tier3,
        placedAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'podiumPicks', user.uid), data)
      setSavedPick(data)
    } catch (err) {
      setError('Erro ao guardar: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isResolved = podiumConfig?.resolved === true
  const results = podiumConfig?.results ?? {}

  // ── RESOLVED ─────────────────────────────────────────────────────
  if (isResolved && savedPick) {
    const tierPoints = TIERS.map(t => POINTS_BY_ROUND[results[savedPick[t.id]]] ?? 0)
    const total = tierPoints.reduce((a, b) => a + b, 0)
    return (
      <div className="space-y-4">
        <div className="card p-5 bg-gradient-to-br from-gold/10 to-transparent border-gold/30">
          <p className="text-xs font-bold text-gold uppercase tracking-wider mb-1">Oracle · Resultado Final</p>
          <p className="text-4xl font-black text-gold">
            +{total} <span className="text-xl text-slate-500 font-semibold">pts</span>
          </p>
        </div>
        {TIERS.map((tier, i) => {
          const team = savedPick[tier.id]
          const round = results[team]
          const pts = tierPoints[i]
          return (
            <div key={tier.id} className="card p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{tier.emoji}</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Flag team={team} size={22} />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{team}</p>
                  <p className="text-xs text-slate-500">{ROUND_LABELS[round] ?? '—'}</p>
                </div>
              </div>
              <span className={`font-black text-lg shrink-0 ${pts > 0 ? 'text-gold' : 'text-slate-400'}`}>
                {pts > 0 ? `+${pts}` : '0'}
              </span>
            </div>
          )
        })}
        <div className="card p-4 bg-gradient-to-r from-[#EEF2FB] to-[#F4F6FB]">
          <p className="text-xs text-slate-500 mb-3">Escala de pontos por fase atingida</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {ROUNDS.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{r.label.replace(' 🏆', '')}</span>
                <span className="text-gold font-bold">{r.pts} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── LOCKED (picked, not yet resolved) ────────────────────────────
  if (savedPick) {
    return (
      <div className="space-y-4">
        <div className="card p-4 flex items-center gap-3 border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-bold text-slate-900">Oracle confirmado! 🔮</p>
            <p className="text-xs text-slate-500">Pontos distribuídos após a final · 19 Jul 2026</p>
          </div>
        </div>
        {TIERS.map(tier => (
          <div key={tier.id} className="card p-4 flex items-center gap-3">
            <span className="text-xl shrink-0">{tier.emoji}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Flag team={savedPick[tier.id]} size={22} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {tier.label} · {tier.subtitle}
                </p>
                <p className="font-bold text-slate-900 truncate">{savedPick[tier.id]}</p>
              </div>
            </div>
            <span className="text-slate-400 shrink-0 text-sm">🔒</span>
          </div>
        ))}
        <div className="card p-4 bg-gradient-to-r from-[#EEF2FB] to-[#F4F6FB]">
          <p className="text-xs text-slate-500 mb-3">Escala de pontos por fase atingida</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {ROUNDS.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{r.label.replace(' 🏆', '')}</span>
                <span className="text-gold font-bold">{r.pts} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── OPEN — picking phase ──────────────────────────────────────────
  const allPicked = picks.tier1 && picks.tier2 && picks.tier3

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card overflow-hidden bg-gradient-to-br from-electric/20 to-[#F4F6FB] relative">
        <div className="h-1 bg-gradient-to-r from-electric via-royal to-aqua" />
        <div className="p-4">
        <p className="text-sm font-bold text-slate-900 mb-1">
          🔮 Oracle — escolhe 1 seleção por tier
        </p>
        {isClosed ? (
          <p className="text-xs text-red-600 font-semibold">Apostas encerradas.</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-slate-500">Fecha 17 Jun às 18h00</p>
            {countdown && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 border border-red-500/30">
                {countdown}
              </span>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Tier pickers */}
      {TIERS.map(tier => {
        const selected = picks[tier.id]
        return (
          <div key={tier.id} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E7F2] flex items-center gap-2">
              <span className="text-lg">{tier.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-900">{tier.label}</span>
                <span className="text-sm text-slate-500"> · {tier.subtitle}</span>
              </div>
              {selected && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Flag team={selected} size={16} />
                  <span className="text-xs font-semibold text-electric-light">{selected} ✓</span>
                </div>
              )}
            </div>
            <div className="p-3 flex flex-wrap gap-1.5">
              {tier.teams.map(team => {
                const isSelected = selected === team
                return (
                  <button
                    key={team}
                    onClick={() => select(tier.id, team)}
                    disabled={isClosed}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isSelected
                        ? 'bg-electric text-white ring-2 ring-electric/40'
                        : 'bg-[#F4F6FB] border border-[#E2E7F2] text-slate-600 hover:border-electric/50 hover:text-slate-900 active:scale-95'
                    }`}
                  >
                    <Flag team={team} size={16} />
                    {team}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Summary + submit */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map(tier => {
            const team = picks[tier.id]
            return (
              <div
                key={tier.id}
                className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-colors ${
                  team ? 'border-electric/50 bg-electric/10' : 'border-[#E2E7F2]'
                }`}
              >
                <span className="text-lg">{tier.emoji}</span>
                {team ? (
                  <>
                    <div className="mt-1.5">
                      <Flag team={team} size={20} />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-900 mt-1 leading-tight line-clamp-2">{team}</p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">Por<br/>escolher</p>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button
          onClick={submit}
          disabled={!allPicked || submitting || isClosed}
          className="w-full bg-electric text-white font-bold py-3 px-6 rounded-xl hover:bg-electric-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'A confirmar...' : 'Confirmar Oracle 🔮'}
        </button>
      </div>

      {/* Points scale reference */}
      <div className="card p-4 bg-gradient-to-r from-[#EEF2FB] to-[#F4F6FB]">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Oracle · Pontos por fase atingida</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {ROUNDS.map(r => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{r.label.replace(' 🏆', '')}</span>
              <span className="text-gold font-bold">{r.pts} pts</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Máx. teórico: 450 pts (3 × campeão)</p>
      </div>
    </div>
  )
}

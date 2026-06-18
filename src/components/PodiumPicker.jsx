import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { TIERS, CLOSE_AT, POINTS_BY_ROUND, ROUND_LABELS, ROUNDS } from '../data/podiumTiers'
import Flag from './Flag'

const archivo = { fontFamily: "'Archivo', sans-serif" }
const ACCENT = '#F5453B'

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

export default function PodiumPicker({ lateBettingOpen = false }) {
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

  // Picking aberto se ainda não fechou OU se há janela de recuperação ativa (e pódio não resolvido)
  const pickingOpen = !isClosed || (lateBettingOpen && podiumConfig?.resolved !== true)

  const select = (tierId, team) => {
    if (savedPick || !pickingOpen) return
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
  const pickedCount = [picks.tier1, picks.tier2, picks.tier3].filter(Boolean).length
  const allPicked = pickedCount === 3
  // Máximo real: só há 1 campeão e 1 vice, por isso o melhor cenário com 3
  // seleções distintas é campeão + vice + 1 meias-finalista.
  const maxTheoretical = POINTS_BY_ROUND.campeao + POINTS_BY_ROUND.final + POINTS_BY_ROUND.meias
  const boxStyle = (selected) =>
    selected
      ? { background: ACCENT + '14', border: `2px solid ${ACCENT}`, color: '#0E1B33' }
      : { background: '#fff', border: '2px solid #EBE3D4', color: '#0E1B33' }

  return (
    <div className="space-y-5" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0E1B33] text-white">
        <div className="flex h-[5px]">
          {['#F5453B', '#FF8A3D', '#F2B705', '#15A66E', '#2D7FF0', '#7C5CFF'].map(c => (
            <div key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <div className="p-5">
          <p style={archivo} className="text-[17px] font-extrabold">🔮 Oracle — escolhe 1 seleção por tier</p>
          <p className="mt-1 text-[13px] text-[#C9D2E3]">Quanto mais longe cada seleção chegar, mais pontos extra ganhas no fim.</p>
          {isClosed && !pickingOpen ? (
            <span className="mt-3 inline-block rounded-full bg-[#FCE5E3] px-3 py-1 text-xs font-bold text-[#C8281F]">Apostas encerradas</span>
          ) : isClosed && pickingOpen ? (
            <span className="mt-3 inline-block rounded-full bg-[#D8F3E6] px-3 py-1 text-xs font-bold text-[#0E7A4F]">⏳ Reaberto para ti — janela de recuperação</span>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2">
              <span className="text-[12px] text-[#9FB0C9]">Fecha 17 Jun · 18h00</span>
              {countdown && (
                <span style={archivo} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-[#FFC222]">{countdown}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tier pickers */}
      {TIERS.map(tier => {
        const selected = picks[tier.id]
        return (
          <div key={tier.id}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-xl">{tier.emoji}</span>
              <span style={archivo} className="text-[15px] font-extrabold text-[#0E1B33]">{tier.label}</span>
              <span className="text-[13px] text-[#8C8474]">· {tier.subtitle}</span>
              {selected && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: ACCENT }}>
                  <Flag team={selected} size={14} /> {selected}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {tier.teams.map(team => {
                const isSel = selected === team
                return (
                  <button
                    key={team}
                    onClick={() => select(tier.id, team)}
                    disabled={!pickingOpen}
                    style={boxStyle(isSel)}
                    className="relative flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-[13.5px] font-bold leading-tight transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Flag team={team} size={22} />
                    <span className="min-w-0 flex-1">{team}</span>
                    {isSel && (
                      <span style={{ background: ACCENT }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white shadow">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {error && <p className="text-center text-sm font-semibold text-[#C8281F]">{error}</p>}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={!allPicked || submitting || !pickingOpen}
        style={archivo}
        className="w-full rounded-2xl bg-[#0E1B33] py-3.5 text-base font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'A confirmar...' : allPicked ? 'Confirmar Oracle 🔮' : `Escolhe as 3 seleções · ${pickedCount}/3`}
      </button>

      {/* Points scale reference */}
      <div className="rounded-2xl border border-[#ECE4D6] bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8C8474]">Pontos por fase atingida</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {ROUNDS.map(r => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-[#8C8474]">{r.label.replace(' 🏆', '')}</span>
              <span style={{ color: '#F2B705' }} className="font-bold">{r.pts} pts</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-[#A89E88]">Máx. teórico: {maxTheoretical} pts (campeão + vice + meias)</p>
      </div>
    </div>
  )
}

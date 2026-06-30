import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import Navbar from '../components/Navbar'
import Flag from '../components/Flag'
import Bracket from '../components/Bracket'

const STAGES = [
  { id: 'bracket', label: 'Quadro' },
  { id: 'groups', label: 'Grupos' },
  { id: 'R32', label: '16-avos' },
  { id: 'R16', label: 'Oitavos' },
  { id: 'QF', label: 'Quartos' },
  { id: 'SF', label: 'Meias' },
  { id: 'Final', label: 'Final' },
]

const STAGE_TITLE = {
  R32: '16-avos de final', R16: 'Oitavos de final', QF: 'Quartos de final',
  SF: 'Meias-finais', Final: 'Final', bracket: 'Quadro Final',
}

function computeStandings(group) {
  const seen = new Set()
  group.matches.forEach((m) => { seen.add(m.home); seen.add(m.away) })
  const teams = [...seen]
  const stats = Object.fromEntries(teams.map((t) => [t, { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }]))

  group.matches.forEach(({ home, away, homeScore, awayScore }) => {
    if (homeScore === null || homeScore === undefined) return
    const h = stats[home], a = stats[away]
    h.P++; h.GF += homeScore; h.GA += awayScore; h.GD += homeScore - awayScore
    a.P++; a.GF += awayScore; a.GA += homeScore; a.GD += awayScore - homeScore
    if (homeScore > awayScore) { h.W++; h.Pts += 3; a.L++ }
    else if (homeScore < awayScore) { a.W++; a.Pts += 3; h.L++ }
    else { h.D++; h.Pts++; a.D++; a.Pts++ }
  })

  const rows = teams.map((t) => ({ team: t, ...stats[t] }))
  // Ordem oficial (com desempate head-to-head 2026) vem do sync; fallback para Pts/DG/GM.
  if (group.order && group.order.length) {
    rows.sort((a, b) => group.order.indexOf(a.team) - group.order.indexOf(b.team))
  } else {
    rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF)
  }
  return rows
}

const LISBON = 'Europe/Lisbon'
// Dia (YYYY-MM-DD) e hora em Portugal, a partir do instante UTC do pontapé de saída.
function ptDate(match) {
  if (match.kickoff) return new Date(match.kickoff).toLocaleDateString('en-CA', { timeZone: LISBON })
  return match.date
}
function ptTime(match) {
  if (!match.kickoff) return null
  return new Date(match.kickoff).toLocaleTimeString('pt-PT', { timeZone: LISBON, hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

function matchDateLabel(dateStr) {
  if (!dateStr) return { label: 'TBD' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return { label: 'HOJE', isToday: true }
  if (d.getTime() === tomorrow.getTime()) return { label: 'AMANHÃ', isTomorrow: true }
  const parsed = new Date(dateStr + 'T12:00:00')
  return { label: parsed.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', ''), isPast: d < today }
}

function MatchRow({ match, isPortugalGroup, showVenue }) {
  const played = match.homeScore !== null && match.homeScore !== undefined
  const { label, isToday, isTomorrow } = matchDateLabel(ptDate(match))
  const time = ptTime(match)
  const isPTHome = match.home === 'Portugal'
  const isPTAway = match.away === 'Portugal'
  const homeWon = played && match.homeScore > match.awayScore
  const awayWon = played && match.awayScore > match.homeScore

  return (
    <div className={`flex items-center gap-2 py-2.5 px-3 rounded-xl ${
      played ? 'bg-surface' : isToday ? 'bg-[#E7EDFF] border border-[#B9C7F5]' : 'bg-surface/60'
    } ${isPortugalGroup && (isPTHome || isPTAway) ? 'ring-1 ring-pt/30' : ''}`}>
      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Flag team={match.home} size={20} />
        <span className={`text-sm font-semibold truncate leading-tight ${
          !match.home ? 'text-slate-400 italic' : isPTHome && isPortugalGroup ? 'text-pt' : homeWon ? 'text-slate-900' : played ? 'text-slate-500' : 'text-slate-900'
        }`}>
          {match.home || 'A definir'}
        </span>
      </div>

      {/* Center */}
      <div className="shrink-0 w-20 text-center leading-tight">
        {played ? (
          <span className="text-gold font-black text-base tracking-tight">{match.homeScore} – {match.awayScore}</span>
        ) : (
          <span className={`text-xs font-bold ${isToday ? 'text-amber-600' : isTomorrow ? 'text-gold/70' : 'text-slate-500'}`}>{label}</span>
        )}
        {time && <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">{time}</span>}
        {showVenue && match.venue && (
          <span className="block text-[9px] text-slate-400 truncate leading-tight">{match.venue}</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={`text-sm font-semibold truncate text-right leading-tight ${
          !match.away ? 'text-slate-400 italic' : isPTAway && isPortugalGroup ? 'text-pt' : awayWon ? 'text-slate-900' : played ? 'text-slate-500' : 'text-slate-900'
        }`}>
          {match.away || 'A definir'}
        </span>
        <Flag team={match.away} size={20} />
      </div>
    </div>
  )
}

function GroupView({ group }) {
  const standings = computeStandings(group)
  const jornadas = [1, 2, 3].map((j) => group.matches.filter((m) => m.jornada === j))
  const isPortugal = group.isPortugal

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classificação</h3>
          <span className="text-xs text-slate-400">J &nbsp; V &nbsp; E &nbsp; D &nbsp; DG &nbsp; Pts</span>
        </div>
        <div>
          {standings.map((row, i) => {
            const qualifies = i < 2
            const isPT = row.team === 'Portugal'
            return (
              <div key={row.team} className={`flex items-center gap-3 px-4 py-2.5 border-b border-surface-border/40 last:border-0 ${
                isPT ? 'bg-pt/10' : qualifies ? 'bg-surface/50' : ''
              }`}>
                <span className={`text-xs font-black w-4 shrink-0 ${qualifies ? 'text-gold' : 'text-slate-400'}`}>{i + 1}</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Flag team={row.team} size={18} />
                  <span className={`text-sm font-semibold truncate ${isPT ? 'text-pt' : 'text-slate-900'}`}>{row.team}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 font-mono">
                  <span className="w-4 text-center">{row.P}</span>
                  <span className="w-4 text-center">{row.W}</span>
                  <span className="w-4 text-center">{row.D}</span>
                  <span className="w-4 text-center">{row.L}</span>
                  <span className="w-6 text-center text-slate-500">{row.GD > 0 ? `+${row.GD}` : row.GD}</span>
                  <span className={`w-6 text-center font-black text-sm ${qualifies ? 'text-gold' : 'text-slate-600'}`}>{row.Pts}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-4 py-2 border-t border-surface-border flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gold inline-block" />
            Passam à fase seguinte (top 2 + melhores 3.ºs)
          </span>
        </div>
      </div>

      <div className="card overflow-hidden divide-y divide-surface-border">
        {jornadas.map((matches, ji) => (
          <div key={ji} className="px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jornada {ji + 1}</p>
            {matches.map((m, i) => <MatchRow key={i} match={m} isPortugalGroup={isPortugal} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function KnockoutList({ matches, extra }) {
  if (!matches || matches.length === 0) {
    return <div className="card p-6 text-center text-slate-400 text-sm">Ainda sem jogos definidos para esta fase.</div>
  }
  const sorted = [...matches].sort((a, b) => (a.kickoff || a.date || '').localeCompare(b.kickoff || b.date || ''))
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden divide-y divide-surface-border px-4 py-3 space-y-2">
        {sorted.map((m, i) => <MatchRow key={i} match={m} showVenue />)}
      </div>
      {extra}
    </div>
  )
}

export default function Calendar() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState('bracket')
  const [activeGroup, setActiveGroup] = useState('K')

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'calendar'), (snap) => {
      setData(snap.exists() ? snap.data() : null)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const groups = data?.groups || []
  const knockout = data?.knockout || {}
  const current = groups.find((g) => g.id === activeGroup)
  const playedCount = (g) => g.matches.filter((m) => m.homeScore !== null && m.homeScore !== undefined).length

  return (
    <div className="min-h-screen bg-surface-deep">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="card p-5 bg-gradient-to-br from-[#EEF2FB] to-[#F4F6FB]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900">Calendário ⚽</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {stage === 'groups' ? 'Fase de Grupos' : STAGE_TITLE[stage]} · Mundial 2026
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">EUA · Canadá · México</p>
              <p className="text-xs text-slate-400 mt-0.5">48 equipas</p>
            </div>
          </div>
        </div>

        {/* Stage tabs */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-1.5 min-w-max">
            {STAGES.map((s) => {
              const isActive = stage === s.id
              return (
                <button key={s.id} onClick={() => setStage(s.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-slate-500 border border-surface-border bg-surface hover:text-slate-900'
                  }`}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading && <div className="card p-8 text-center text-slate-400 text-sm">A carregar calendário…</div>}
        {!loading && !data && (
          <div className="card p-8 text-center text-slate-400 text-sm">
            Calendário ainda não disponível. (Corre <code className="text-gold">sync-fixtures.mjs</code> para popular.)
          </div>
        )}

        {!loading && data && stage === 'groups' && (
          <>
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <div className="flex gap-1.5 min-w-max">
                {groups.map((g) => {
                  const isActive = activeGroup === g.id
                  const isPT = g.isPortugal
                  const played = playedCount(g)
                  return (
                    <button key={g.id} onClick={() => setActiveGroup(g.id)}
                      className={`relative flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 min-w-[4rem] ${
                        isActive
                          ? isPT ? 'bg-pt text-white shadow-lg shadow-pt/30' : 'bg-gold text-black shadow-lg shadow-gold/20'
                          : isPT ? 'text-pt border border-pt/30 bg-pt/5 hover:bg-pt/10' : 'text-slate-500 border border-surface-border bg-surface hover:text-slate-900'
                      }`}>
                      {isPT && <span className="text-base leading-none mb-0.5">🇵🇹</span>}
                      <span>Grupo {g.id}</span>
                      {played > 0 && (
                        <span className={`text-[9px] mt-0.5 font-mono ${isActive ? (isPT ? 'text-white/70' : 'text-black/60') : 'text-slate-400'}`}>{played}/6 jogos</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            {current && (
              <div>
                <div className={`flex items-center gap-2 mb-4 ${current.isPortugal ? 'text-pt' : 'text-gold'}`}>
                  <span className="text-2xl font-black">Grupo {current.id}</span>
                  {current.isPortugal && <span className="text-xl">🇵🇹</span>}
                </div>
                <GroupView group={current} />
              </div>
            )}
          </>
        )}

        {!loading && data && stage === 'bracket' && <Bracket knockout={knockout} />}

        {!loading && data && ['R32', 'R16', 'QF', 'SF', 'Final'].includes(stage) && (
          <KnockoutList
            matches={knockout[stage]}
            extra={stage === 'Final' && knockout.Third?.length ? (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">3.º / 4.º lugar</p>
                <div className="card overflow-hidden px-4 py-3">
                  {knockout.Third.map((m, i) => <MatchRow key={i} match={m} showVenue />)}
                </div>
              </div>
            ) : null}
          />
        )}
      </div>
    </div>
  )
}

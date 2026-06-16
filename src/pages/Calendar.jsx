import { useState } from 'react'
import Navbar from '../components/Navbar'
import { groups, FLAG } from '../data/worldcupGroups'

function Flag({ team, size = 20 }) {
  const code = FLAG[team]
  const h = Math.round(size * 0.75)
  if (!code) return <span className="text-xs font-bold text-slate-500 shrink-0">{team.slice(0, 3).toUpperCase()}</span>
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${h * 2}.png 2x`}
      alt=""
      className="rounded-[2px] shrink-0 object-cover"
      style={{ width: size, height: h }}
    />
  )
}

function computeStandings(group) {
  const seen = new Set()
  group.matches.forEach(m => { seen.add(m.home); seen.add(m.away) })
  const teams = [...seen]
  const stats = Object.fromEntries(teams.map(t => [t, { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }]))

  group.matches.forEach(({ home, away, homeScore, awayScore }) => {
    if (homeScore === null) return
    const h = stats[home], a = stats[away]
    h.P++; h.GF += homeScore; h.GA += awayScore; h.GD += homeScore - awayScore
    a.P++; a.GF += awayScore; a.GA += homeScore; a.GD += awayScore - homeScore
    if (homeScore > awayScore) { h.W++; h.Pts += 3; a.L++ }
    else if (homeScore < awayScore) { a.W++; a.Pts += 3; h.L++ }
    else { h.D++; h.Pts++; a.D++; a.Pts++ }
  })

  return teams
    .map(t => ({ team: t, ...stats[t] }))
    .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF)
}

function matchDateLabel(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === today.getTime()) return { label: 'HOJE', isToday: true }
  if (d.getTime() === tomorrow.getTime()) return { label: 'AMANHÃ', isTomorrow: true }
  const parsed = new Date(dateStr + 'T12:00:00')
  return { label: parsed.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', ''), isPast: d < today }
}

function MatchRow({ match, isPortugalGroup }) {
  const played = match.homeScore !== null
  const { label, isToday, isTomorrow } = matchDateLabel(match.date)
  const isPTHome = match.home === 'Portugal'
  const isPTAway = match.away === 'Portugal'

  return (
    <div className={`flex items-center gap-2 py-2.5 px-3 rounded-xl ${
      played
        ? 'bg-surface'
        : isToday
          ? 'bg-[#E7EDFF] border border-[#B9C7F5]'
          : 'bg-surface/60'
    } ${isPortugalGroup && (isPTHome || isPTAway) ? 'ring-1 ring-pt/30' : ''}`}>

      {/* Home team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Flag team={match.home} size={20} />
        <span className={`text-sm font-semibold truncate leading-tight ${
          isPTHome && isPortugalGroup ? 'text-pt' : 'text-slate-900'
        }`}>
          {match.home}
        </span>
      </div>

      {/* Center */}
      <div className="shrink-0 w-[4.5rem] text-center">
        {played ? (
          <span className="text-gold font-black text-base tracking-tight">
            {match.homeScore} – {match.awayScore}
          </span>
        ) : (
          <span className={`text-xs font-bold ${
            isToday ? 'text-amber-600' : isTomorrow ? 'text-gold/70' : 'text-slate-500'
          }`}>
            {label}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={`text-sm font-semibold truncate text-right leading-tight ${
          isPTAway && isPortugalGroup ? 'text-pt' : 'text-slate-900'
        }`}>
          {match.away}
        </span>
        <Flag team={match.away} size={20} />
      </div>
    </div>
  )
}

function GroupView({ group }) {
  const standings = computeStandings(group)
  const jornadas = [1, 2, 3].map(j => group.matches.filter(m => m.jornada === j))
  const isPortugal = group.isPortugal

  return (
    <div className="space-y-4">
      {/* Standings */}
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
              <div
                key={row.team}
                className={`flex items-center gap-3 px-4 py-2.5 border-b border-surface-border/40 last:border-0 ${
                  isPT ? 'bg-pt/10' : qualifies ? 'bg-surface/50' : ''
                }`}
              >
                <span className={`text-xs font-black w-4 shrink-0 ${qualifies ? 'text-gold' : 'text-slate-400'}`}>
                  {i + 1}
                </span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Flag team={row.team} size={18} />
                  <span className={`text-sm font-semibold truncate ${isPT ? 'text-pt' : 'text-slate-900'}`}>
                    {row.team}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 font-mono">
                  <span className="w-4 text-center">{row.P}</span>
                  <span className="w-4 text-center">{row.W}</span>
                  <span className="w-4 text-center">{row.D}</span>
                  <span className="w-4 text-center">{row.L}</span>
                  <span className="w-6 text-center text-slate-500">{row.GD > 0 ? `+${row.GD}` : row.GD}</span>
                  <span className={`w-6 text-center font-black text-sm ${qualifies ? 'text-gold' : 'text-slate-600'}`}>
                    {row.Pts}
                  </span>
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

      {/* Matches by jornada */}
      <div className="card overflow-hidden divide-y divide-surface-border">
        {jornadas.map((matches, ji) => (
          <div key={ji} className="px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Jornada {ji + 1}
            </p>
            {matches.map((m, i) => (
              <MatchRow key={i} match={m} isPortugalGroup={isPortugal} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Calendar() {
  const [activeGroup, setActiveGroup] = useState('K')
  const current = groups.find(g => g.id === activeGroup)

  // Count played matches per group for the tab badge
  const playedCount = (g) => g.matches.filter(m => m.homeScore !== null).length

  return (
    <div className="min-h-screen bg-surface-deep">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="card p-5 bg-gradient-to-br from-[#EEF2FB] to-[#F4F6FB]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900">Calendário ⚽</h1>
              <p className="text-slate-500 text-sm mt-0.5">Fase de Grupos · Mundial 2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">11 Jun – 27 Jun</p>
              <p className="text-xs text-slate-400 mt-0.5">48 equipas · 12 grupos</p>
            </div>
          </div>
        </div>

        {/* Group selector (horizontal scroll) */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-1.5 min-w-max">
            {groups.map(g => {
              const isActive = activeGroup === g.id
              const isPT = g.id === 'K'
              const played = playedCount(g)
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`relative flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 min-w-[4rem] ${
                    isActive
                      ? isPT
                        ? 'bg-pt text-white shadow-lg shadow-pt/30'
                        : 'bg-gold text-black shadow-lg shadow-gold/20'
                      : isPT
                        ? 'text-pt border border-pt/30 bg-pt/5 hover:bg-pt/10'
                        : 'text-slate-500 border border-surface-border bg-surface hover:text-slate-900'
                  }`}
                >
                  {isPT && <span className="text-base leading-none mb-0.5">🇵🇹</span>}
                  <span>Grupo {g.id}</span>
                  {played > 0 && (
                    <span className={`text-[9px] mt-0.5 font-mono ${
                      isActive
                        ? isPT ? 'text-white/70' : 'text-black/60'
                        : 'text-slate-400'
                    }`}>
                      {played}/6 jogos
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active group */}
        {current && (
          <div>
            <div className={`flex items-center gap-2 mb-4 ${current.isPortugal ? 'text-pt' : 'text-gold'}`}>
              <span className="text-2xl font-black">Grupo {current.id}</span>
              {current.isPortugal && <span className="text-xl">🇵🇹</span>}
            </div>
            <GroupView group={current} />
          </div>
        )}
      </div>
    </div>
  )
}

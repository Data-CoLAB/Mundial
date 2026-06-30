import Flag from './Flag'

// Quadro (organigrama) da fase a eliminar, R32 -> Final, em árvore da esquerda p/ direita.
// Emparelhamento posicional: ronda seguinte[i] alimentada por ronda[2i] e ronda[2i+1]
// (ordem do bracket oficial da Wikipédia). Seleção por definir => bandeira hollow + "?".

const ROUNDS = [
  { key: 'R32', label: '16-avos' },
  { key: 'R16', label: 'Oitavos' },
  { key: 'QF', label: 'Quartos' },
  { key: 'SF', label: 'Meias' },
  { key: 'Final', label: 'Final' },
]

const ROW = 66          // altura (px) de cada "slot" na coluna R32
const COLW = 132        // largura de cada coluna de jogos
const GAP = 30          // largura da coluna de conectores
const LISBON = 'Europe/Lisbon'

// Etiqueta "dia hora · cidade" em hora de Portugal (a partir do instante UTC do pontapé de saída).
function ptLabel(m) {
  if (!m) return ''
  let day = '', time = ''
  if (m.kickoff) {
    const d = new Date(m.kickoff)
    day = d.toLocaleDateString('pt-PT', { timeZone: LISBON, day: 'numeric', month: 'short' }).replace('.', '')
    time = ' ' + d.toLocaleTimeString('pt-PT', { timeZone: LISBON, hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  } else if (m.date) {
    day = new Date(m.date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '')
  }
  return `${day}${time}${m.venue ? ` · ${m.venue}` : ''}`
}

function TeamLine({ team, score, pen, won, isPT }) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 h-[22px] ${won ? 'bg-gold/10' : ''}`}>
      <Flag team={team} size={15} />
      <span className={`flex-1 min-w-0 truncate text-[11px] leading-none ${
        !team ? 'text-slate-400 italic' : won ? 'font-black text-slate-900' : 'font-medium text-slate-500'
      } ${isPT ? 'text-pt' : ''}`} title={team || 'A definir'}>
        {team || '?'}
      </span>
      <span className={`text-[11px] font-mono shrink-0 ${won ? 'font-black text-gold' : 'text-slate-400'}`}>
        {score === null || score === undefined ? '' : pen != null ? `${score} (${pen})` : score}
      </span>
    </div>
  )
}

function MatchCard({ m }) {
  const played = m && m.homeScore !== null && m.homeScore !== undefined
  const hasPen = m && m.homePen != null && m.awayPen != null
  const homeWon = played && (m.homeScore > m.awayScore || (m.homeScore === m.awayScore && hasPen && m.homePen > m.awayPen))
  const awayWon = played && (m.awayScore > m.homeScore || (m.awayScore === m.homeScore && hasPen && m.awayPen > m.homePen))
  const ptInvolved = m && (m.home === 'Portugal' || m.away === 'Portugal')
  return (
    // O slot tem altura ROW e centra a CAIXA verticalmente — assim os conectores
    // batem no centro da caixa (divisória entre as 2 equipas), ao estilo de um quadro clássico.
    // A data fica posicionada por baixo, sem afetar a centragem.
    <div className="relative flex items-center" style={{ height: ROW }}>
      <div className={`w-full rounded-lg border bg-surface overflow-hidden shadow-sm ${ptInvolved ? 'border-pt/40 ring-1 ring-pt/20' : 'border-surface-border'}`}>
        <TeamLine team={m?.home} score={m?.homeScore} pen={m?.homePen} won={homeWon} isPT={m?.home === 'Portugal'} />
        <div className="border-t border-surface-border/60" />
        <TeamLine team={m?.away} score={m?.awayScore} pen={m?.awayPen} won={awayWon} isPT={m?.away === 'Portugal'} />
      </div>
      {(m?.kickoff || m?.date) && (
        <span className="absolute left-0 right-0 text-[8px] text-slate-400 text-center leading-none truncate px-0.5"
          style={{ top: 'calc(50% + 24px)' }}>
          {ptLabel(m)}
        </span>
      )}
    </div>
  )
}

function Round({ matches }) {
  return (
    <div className="flex flex-col justify-around shrink-0" style={{ width: COLW }}>
      {matches.map((m, i) => <MatchCard key={i} m={m} />)}
    </div>
  )
}

// Coluna de conectores: n células (uma por jogo da ronda seguinte). Em cada célula,
// os dois alimentadores entram a 25% e 75% da altura, unidos por uma vertical e
// saindo a 50% para o jogo seguinte.
function Connectors({ n }) {
  const line = 'bg-slate-300'
  return (
    <div className="flex flex-col justify-around shrink-0" style={{ width: GAP }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="relative" style={{ height: ROW * 2 }}>
          <span className={`absolute ${line}`} style={{ left: 0, top: '25%', width: '50%', height: 2 }} />
          <span className={`absolute ${line}`} style={{ left: 0, top: '75%', width: '50%', height: 2 }} />
          <span className={`absolute ${line}`} style={{ left: '50%', top: '25%', height: '50%', width: 2 }} />
          <span className={`absolute ${line}`} style={{ left: '50%', top: '50%', width: '50%', height: 2 }} />
        </div>
      ))}
    </div>
  )
}

export default function Bracket({ knockout }) {
  const rounds = ROUNDS.map((r) => ({ ...r, matches: knockout[r.key] || [] }))
  const height = (knockout.R32?.length || 16) * ROW
  const third = knockout.Third?.[0]

  if (!knockout.R32?.length) {
    return <div className="card p-6 text-center text-slate-400 text-sm">Quadro ainda não disponível.</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 px-1">Desliza na horizontal para veres o quadro completo →</p>
      <div className="card p-3 overflow-x-auto">
        {/* Cabeçalhos das rondas */}
        <div className="flex min-w-max mb-2">
          {rounds.map((r, i) => (
            <div key={r.key} className="flex items-center" >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center shrink-0" style={{ width: COLW }}>{r.label}</div>
              {i < rounds.length - 1 && <div className="shrink-0" style={{ width: GAP }} />}
            </div>
          ))}
        </div>
        {/* Árvore */}
        <div className="flex min-w-max" style={{ height }}>
          {rounds.map((r, i) => (
            <div key={r.key} className="flex">
              <Round matches={r.matches} />
              {i < rounds.length - 1 && <Connectors n={rounds[i + 1].matches.length} />}
            </div>
          ))}
        </div>
      </div>

      {/* 3.º / 4.º lugar */}
      {third && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">3.º / 4.º lugar</p>
          <div className="card p-3" style={{ maxWidth: COLW + 40 }}>
            <MatchCard m={third} />
          </div>
        </div>
      )}
    </div>
  )
}

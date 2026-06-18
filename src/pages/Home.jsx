import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import MarketCard from '../components/MarketCard'
import PodiumPicker from '../components/PodiumPicker'
import Flag from '../components/Flag'

function TabCountdown({ closesAt, active, onGold }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = (closesAt?.toDate?.()?.getTime() ?? 0) - Date.now()
      if (diff <= 0) { setLabel(''); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setLabel(`${d}d ${h}h`)
      else if (h > 0) setLabel(`${h}h ${m}m`)
      else setLabel(`${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  if (!label) return null

  // Inactive: red badge on dark green
  // Active gold tab: dark pill so it shows on gold
  // Active red (Portugal) tab: white pill so it shows on red
  const style = !active
    ? 'bg-red-500/20 text-red-600 border border-red-500/30'
    : onGold
      ? 'bg-black/20 text-black/75 border border-black/15'
      : 'bg-white/25 text-white border border-white/30'

  return (
    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${style}`}>
      {label}
    </span>
  )
}

function WelcomeBanner({ onDismiss }) {
  return (
    <div className="card p-5 border-gold/30 bg-gradient-to-br from-gold/10 to-transparent">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Bem-vindo ao DataBets! ⚽</h2>
          <p className="text-slate-500 text-xs mt-0.5">Mundial 2026 · Apostas internas DataColab</p>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-900 text-lg leading-none">✕</button>
      </div>

      <p className="text-slate-600 text-sm mb-4 leading-relaxed">
        A plataforma interna de apostas da DataColab para o Mundial 2026. Faz as tuas previsões, acumula pontos e tenta chegar ao top 3 para ganhar um dos prémios! Tens até ao início de cada jogo para apostar — depois disso fica bloqueado. 🔒
      </p>

      {/* Modes */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">O que podes fazer</p>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">🌍</span>
          <div>
            <p className="text-xs font-bold text-slate-900">Apostas Gerais</p>
            <p className="text-xs text-slate-500 mt-0.5">Quem ganha o Mundial, Bota de Ouro, resultado da final, Portugal em que fase chega — mercados que ficam abertos até ao fim.</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">🇵🇹</span>
          <div>
            <p className="text-xs font-bold text-slate-900">Jogos de Portugal</p>
            <p className="text-xs text-slate-500 mt-0.5">Resultado, marcador, golos — mercados específicos para cada jogo de Portugal, que fecham na hora do pontapé inicial.</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">🔮</span>
          <div>
            <p className="text-xs font-bold text-slate-900">Oracle</p>
            <p className="text-xs text-slate-500 mt-0.5">Escolhe 3 seleções (1 por tier de ranking FIFA) que achas que chegam mais longe. Quanto mais avançam, mais pontos ganhas — distribuídos no final do torneio.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Prémios para o top 3</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm"><span>🥇</span><span className="text-slate-600">1.º lugar — Camisola oficial de Portugal</span></div>
          <div className="flex items-center gap-2 text-sm"><span>🥈</span><span className="text-slate-600">2.º lugar — Bola oficial da seleção</span></div>
          <div className="flex items-center gap-2 text-sm"><span>🥉</span><span className="text-slate-600">3.º lugar — Caixa de cerveja</span></div>
        </div>
      </div>

      <button onClick={onDismiss} className="btn-primary w-full text-sm">
        Vamos jogar! 🚀
      </button>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [markets, setMarkets] = useState([])
  const [userBets, setUserBets] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('geral')
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('databets_welcomed'))
  const [lateWindowUntil, setLateWindowUntil] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const dismissWelcome = () => {
    localStorage.setItem('databets_welcomed', '1')
    setShowWelcome(false)
  }

  useEffect(() => {
    const q = query(collection(db, 'markets'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'bets'), where('userId', '==', user.uid))
    return onSnapshot(q, snap => {
      const bets = {}
      snap.docs.forEach(d => { bets[d.data().marketId] = d.data() })
      setUserBets(bets)
    })
  }, [user])

  // Janela de recuperação aberta pelo admin para este utilizador
  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'lateBetWindows', user.uid), snap => {
      setLateWindowUntil(snap.exists() ? (snap.data().openUntil?.toDate?.() ?? null) : null)
    })
  }, [user])

  // Re-avalia quando a janela expirar (sem polling contínuo)
  useEffect(() => {
    if (!lateWindowUntil) return
    const ms = lateWindowUntil.getTime() - Date.now()
    if (ms <= 0) return
    const t = setTimeout(() => setNowTick(Date.now()), ms)
    return () => clearTimeout(t)
  }, [lateWindowUntil])

  const lateWindowOpen = !!lateWindowUntil && lateWindowUntil.getTime() > nowTick

  const globalMarkets = markets.filter(m => m.category === 'global')
  const gameGroups = markets
    .filter(m => m.category === 'portugal_game')
    .reduce((acc, m) => {
      const key = m.gameLabel || 'Portugal'
      if (!acc[key]) acc[key] = { order: m.gameOrder ?? 99, markets: [] }
      acc[key].markets.push(m)
      return acc
    }, {})
  const sortedGames = Object.entries(gameGroups).sort((a, b) => a[1].order - b[1].order)

  const pendingBets = markets.filter(m => m.status === 'open' && !userBets[m.id]).length

  const nearestClose = (list) => list
    .filter(m => m.status === 'open' && m.closesAt)
    .map(m => m.closesAt)
    .sort((a, b) => a.toDate() - b.toDate())[0] ?? null

  const nearestGlobalClose = nearestClose(globalMarkets)
  const nearestPortugalClose = nearestClose(sortedGames.flatMap(([, g]) => g.markets))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF1F8]">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EEF1F8]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="card overflow-hidden bg-gradient-to-br from-[#EEF2FB] to-[#F4F6FB] relative">
          <div className="h-1 wc-stripe" />
          <div className="absolute inset-0 bg-wc-glow pointer-events-none" />
          <div className="relative p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Mundial 2026</p>
              <p className="text-slate-500 text-sm">Olá, <span className="text-slate-900 font-semibold">{user?.name}</span> 👋</p>
              <p className="text-3xl font-black text-gold mt-1">
                {user?.totalPoints ?? 0} <span className="text-lg font-semibold text-slate-500">pontos</span>
              </p>
              {pendingBets > 0 && (
                <p className="text-xs text-amber-600 mt-1">⚡ {pendingBets} aposta{pendingBets > 1 ? 's' : ''} por fazer</p>
              )}
            </div>
            <div className="text-right leading-none">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">26</p>
              <p className="text-2xl mt-1">🏆</p>
            </div>
          </div>
        </div>

        {/* Welcome banner */}
        {showWelcome && <WelcomeBanner onDismiss={dismissWelcome} />}

        {/* Janela de recuperação */}
        {lateWindowOpen && (
          <div className="card p-4 border border-emerald-300 bg-emerald-50">
            <p className="text-sm font-bold text-emerald-800">⏳ Janela de recuperação aberta</p>
            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
              O admin reabriu apostas para ti até{' '}
              <strong>{lateWindowUntil.toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>.
              Podes apostar nas perguntas que ainda não foram resolvidas e onde ainda não apostaste. Apostas já feitas não mudam.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F4F6FB] border border-[#E2E7F2] p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'geral' ? 'bg-gold text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🌍 Apostas
            <TabCountdown closesAt={nearestGlobalClose} active={activeTab === 'geral'} onGold />
          </button>
          <button
            onClick={() => setActiveTab('portugal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'portugal' ? 'bg-pt text-white shadow-lg shadow-pt/20' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🇵🇹 Portugal
            <TabCountdown closesAt={nearestPortugalClose} active={activeTab === 'portugal'} />
          </button>
          <button
            onClick={() => setActiveTab('podio')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'podio' ? 'bg-electric text-white shadow-lg shadow-electric/30' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🔮 Oracle
          </button>
        </div>

        {/* Content */}
        {activeTab === 'geral' && (
          <section className="space-y-3">
            {globalMarkets.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">Sem mercados globais ainda.</div>
            )}
            {globalMarkets.filter(m => m.section !== 'diversao').map(m => (
              <MarketCard key={m.id} market={m} userBet={userBets[m.id]} lateBettingOpen={lateWindowOpen} onBetPlaced={() => {}} />
            ))}
            {globalMarkets.some(m => m.section === 'diversao') && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-[#E2E7F2]" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">🎭 Por Diversão</span>
                  <div className="flex-1 h-px bg-[#E2E7F2]" />
                </div>
                {globalMarkets.filter(m => m.section === 'diversao').map(m => (
                  <MarketCard key={m.id} market={m} userBet={userBets[m.id]} lateBettingOpen={lateWindowOpen} onBetPlaced={() => {}} />
                ))}
              </>
            )}
          </section>
        )}

        {activeTab === 'podio' && (
          <section>
            <PodiumPicker lateBettingOpen={lateWindowOpen} />
          </section>
        )}

        {activeTab === 'portugal' && (
          <div className="space-y-8">
            {sortedGames.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">Sem jogos de Portugal ainda.</div>
            )}
            {sortedGames.map(([gameLabel, group]) => {
              const opponent = gameLabel.replace(/^\s*Portugal\s+vs\s+/i, '').trim()
              const hasOpponent = opponent && opponent !== gameLabel
              return (
              <section key={gameLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <Flag team="Portugal" size={24} />
                  <h2 className="text-sm font-bold text-slate-900">{gameLabel}</h2>
                  {hasOpponent && <Flag team={opponent} size={24} />}
                </div>
                <div className="space-y-3">
                  {group.markets.map(m => (
                    <MarketCard key={m.id} market={m} userBet={userBets[m.id]} lateBettingOpen={lateWindowOpen} onBetPlaced={() => {}} />
                  ))}
                </div>
              </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import PrizeImg from '../components/PrizeImg'
import { PRIZES } from '../data/prizes'

const PODIUM = PRIZES

// Seta de variação de posição face à última base fixada pelo admin.
function Move({ m }) {
  if (!m) return null
  if (m.dir === 'up') return (
    <span title={`Subiu ${m.d} lugar(es)`} className="inline-flex items-center text-green-600 text-xs font-black leading-none">
      ▲{m.d > 1 && <span className="ml-0.5 text-[10px]">{m.d}</span>}
    </span>
  )
  if (m.dir === 'down') return (
    <span title={`Desceu ${m.d} lugar(es)`} className="inline-flex items-center text-red-500 text-xs font-black leading-none">
      ▼{m.d > 1 && <span className="ml-0.5 text-[10px]">{m.d}</span>}
    </span>
  )
  return <span title="Manteve a posição" className="text-slate-400 text-xs font-black leading-none">=</span>
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [snapRanks, setSnapRanks] = useState(null) // { uid: posição } da base fixada
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Ordenação determinística igual à do servidor (api/fixRanking): pontos desc, depois id asc.
      list.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      setUsers(list.map((u, i) => ({ ...u, rank: i + 1 })))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'rankingSnapshot'), snap => {
      setSnapRanks(snap.exists() ? (snap.data().ranks || null) : null)
    })
  }, [])

  // Variação de posição face à base fixada (null = sem base ou utilizador novo).
  const move = (u) => {
    if (!snapRanks || !(u.id in snapRanks)) return null
    const prev = snapRanks[u.id]
    if (prev > u.rank) return { dir: 'up', d: prev - u.rank }
    if (prev < u.rank) return { dir: 'down', d: u.rank - prev }
    return { dir: 'same', d: 0 }
  }

  const podium = users.slice(0, 3)
  const rest = users.slice(3)

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
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Ranking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pontos confirmados · Top 3 ganham prémios</p>
        </div>

        {/* Prizes banner */}
        <div className="card p-4 border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Prémios em jogo</p>
          <div className="grid grid-cols-3 gap-2">
            {PODIUM.map((p) => (
              <div key={p.rank} className={`rounded-xl border p-3 text-center ${p.prizeBg}`}>
                <div className="flex items-center justify-center h-20 mb-2">
                  <PrizeImg src={p.prizeImg} fallback={p.prizeIcon} size="lg" />
                </div>
                <p className={`text-xs font-black ${p.prizeColor}`}>{p.rank} lugar</p>
                <p className="text-xs text-slate-900 font-semibold mt-0.5 leading-tight">{p.prize}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{p.prizeDetail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="space-y-3">
          {podium.map((u, i) => {
            const p = PODIUM[i]
            return (
              <div
                key={u.id}
                className={`rounded-2xl border bg-gradient-to-r ${p.bg} ${p.border} shadow-lg ${p.glow} ${u.id === user?.uid ? 'ring-1 ring-gold/50' : ''}`}
              >
                {/* Top row */}
                <div className="flex items-center gap-4 p-4 pb-3">
                  <div className="text-center w-10 flex-shrink-0">
                    <p className="text-2xl">{p.medal}</p>
                    <p className={`text-xs font-black ${p.color}`}>{p.rank}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-900 text-base truncate">{u.name}</p>
                      <Move m={move(u)} />
                      {u.id === user?.uid && (
                        <span className="text-xs text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">Tu</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-gold tabular-nums">{u.totalPoints}</p>
                    <p className="text-xs text-slate-500">pontos</p>
                  </div>
                </div>
                {/* Prize row */}
                <div className={`mx-3 mb-3 rounded-xl border px-3 py-2 flex items-center gap-3 ${p.prizeBg}`}>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <PrizeImg src={p.prizeImg} fallback={p.prizeIcon} size="sm" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${p.prizeColor}`}>{p.prize}</p>
                    <p className="text-xs text-slate-500">{p.prizeDetail}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Rest */}
        {rest.length > 0 && (
          <div className="card overflow-hidden divide-y divide-[#E2E7F2]">
            {rest.map((u) => (
              <div
                key={u.id}
                className={`flex items-center gap-4 px-4 py-3 ${u.id === user?.uid ? 'bg-gold/5' : ''}`}
              >
                <span className="text-sm text-slate-500 w-6 text-center font-semibold tabular-nums">{u.rank}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p className={`text-sm font-semibold truncate ${u.id === user?.uid ? 'text-gold' : 'text-slate-900'}`}>
                    {u.name}
                  </p>
                  <Move m={move(u)} />
                </div>
                <p className="text-sm font-bold text-slate-600 tabular-nums">{u.totalPoints}</p>
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-slate-500">Ainda sem dados. Faz a tua primeira aposta!</p>
          </div>
        )}
      </div>
    </div>
  )
}

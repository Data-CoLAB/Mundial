import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, getDocs, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, auth } from '../firebase'
import Navbar from '../components/Navbar'
import { ROUNDS, ROUND_LABELS, POINTS_BY_ROUND } from '../data/podiumTiers'
import { FLAG } from '../data/worldcupGroups'
import PodiumPicker from '../components/PodiumPicker'

async function callApi(path, payload) {
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

const SQUAD = [
  'Diogo Costa', 'António Silva', 'Rúben Dias', 'João Cancelo', 'Nuno Mendes',
  'Rúben Neves', 'Vitinha', 'Bruno Fernandes', 'Bernardo Silva', 'Rafael Leão',
  'Pedro Neto', 'Gonçalo Ramos', 'João Félix', 'Francisco Conceição', 'Cristiano Ronaldo',
]

// Timestamps (Portugal = UTC+1)
const T_BEFORE_CONGO   = new Date('2026-06-17T15:00:00Z') // 16h Portugal, 2h antes do jogo
const T_CONGO_KICKOFF  = new Date('2026-06-17T17:00:00Z') // 18h Portugal - hora do jogo
const T_END_OF_WEEK    = new Date('2026-06-21T22:59:00Z') // Dom 23h59 Portugal
const T_BEFORE_FINAL   = new Date('2026-07-19T18:00:00Z') // ~2h antes da final

const squad = (prefix) => SQUAD.map((name, i) => ({ id: `${prefix}_${i}`, label: name }))

const SEED_MARKETS = [
  // ── MUNDIAL GERAL ──────────────────────────────
  { title: 'Qual seleção vai ganhar o Mundial?', category: 'global', points: 100, closesAt: T_END_OF_WEEK,
    options: [{ id: 'esp', label: 'Espanha' }, { id: 'bra', label: 'Brasil' }, { id: 'fra', label: 'França' },
      { id: 'arg', label: 'Argentina' }, { id: 'por', label: 'Portugal' }, { id: 'eng', label: 'Inglaterra' },
      { id: 'ger', label: 'Alemanha' }, { id: 'other', label: 'Outra' }] },
  { title: 'Quem ganha a Bota de Ouro?', category: 'global', points: 100, closesAt: T_END_OF_WEEK,
    description: 'Prémio atribuído ao jogador que marcar mais golos no torneio.',
    options: [{ id: 'mbappe', label: 'Kylian Mbappé' }, { id: 'haaland', label: 'Erling Haaland' },
      { id: 'kane', label: 'Harry Kane' }, { id: 'vini', label: 'Vinicius Jr' },
      { id: 'cr7', label: 'Cristiano Ronaldo' }, { id: 'messi', label: 'Lionel Messi' },
      { id: 'yamal', label: 'Lamine Yamal' }, { id: 'other', label: 'Outro' }] },
  { title: 'Quem ganha a Bola de Ouro?', category: 'global', points: 100, closesAt: T_END_OF_WEEK,
    description: 'Prémio atribuído ao melhor jogador do torneio, eleito pelos treinadores e capitães de equipa.',
    options: [{ id: 'mbappe', label: 'Kylian Mbappé' }, { id: 'vini', label: 'Vinicius Jr' },
      { id: 'yamal', label: 'Lamine Yamal' }, { id: 'haaland', label: 'Erling Haaland' },
      { id: 'bell', label: 'Jude Bellingham' }, { id: 'other', label: 'Outro' }] },
  { title: 'Portugal chega a que fase?', category: 'global', points: 75, closesAt: T_BEFORE_CONGO,
    options: [{ id: 'grupos', label: 'Fase de Grupos' }, { id: 'oitavos', label: 'Oitavos de Final' },
      { id: 'quartos', label: 'Quartos de Final' }, { id: 'meias', label: 'Meias-Finais' },
      { id: 'final', label: 'Final' }, { id: 'campeao', label: 'Campeão 🏆' }] },
  { title: 'Ronaldo marca no torneio?', category: 'global', points: 40, closesAt: T_BEFORE_CONGO,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Quantos golos marca Portugal no total?', category: 'global', points: 60, closesAt: T_BEFORE_CONGO,
    options: [{ id: '0_3', label: '0 a 3' }, { id: '4_6', label: '4 a 6' },
      { id: '7_9', label: '7 a 9' }, { id: '10m', label: '10 ou mais' }] },
  { title: 'Portugal sofre golos na fase de grupos?', category: 'global', points: 30, closesAt: T_BEFORE_CONGO,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Qual seleção africana chega mais longe?', category: 'global', points: 50, closesAt: T_END_OF_WEEK,
    options: [{ id: 'mar', label: 'Marrocos' }, { id: 'sen', label: 'Senegal' },
      { id: 'cdi', label: 'Costa do Marfim' }, { id: 'egi', label: 'Egito' },
      { id: 'alg', label: 'Argélia' }, { id: 'rdc', label: 'Congo RD' },
      { id: 'cpv', label: 'Cabo Verde' }, { id: 'other', label: 'Outro' }] },
  { title: 'Resultado exato da final', category: 'global', points: 150, closesAt: T_BEFORE_FINAL,
    options: [{ id: '1_0', label: '1-0' }, { id: '2_0', label: '2-0' }, { id: '2_1', label: '2-1' },
      { id: '1_1', label: '1-1' }, { id: '2_2', label: '2-2' }, { id: '3_1', label: '3-1' },
      { id: '3_2', label: '3-2' }, { id: 'other', label: 'Outro' }] },
  { title: 'Haverá prolongamento na final?', category: 'global', points: 30, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Haverá penáltis na final?', category: 'global', points: 30, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Haverá cartão vermelho na final?', category: 'global', points: 25, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  // ── DIVERSÃO ───────────────────────────────────
  { title: 'Alguém invade o campo durante algum jogo?', category: 'global', section: 'diversao', points: 30, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Ronaldo chora em campo durante o torneio?', category: 'global', section: 'diversao', points: 25, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Quem marca mais golos no torneio — Ronaldo ou Messi?', category: 'global', section: 'diversao', points: 40, closesAt: T_BEFORE_FINAL,
    options: [{ id: 'cr7', label: 'Cristiano Ronaldo' }, { id: 'mess', label: 'Lionel Messi' }, { id: 'emp', label: 'Empatam' }] },
  // ── PORTUGAL VS CONGO ──────────────────────────
  { title: 'Resultado final', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 40, closesAt: T_CONGO_KICKOFF,
    options: [{ id: 'por', label: 'Vitória Portugal' }, { id: 'emp', label: 'Empate' }, { id: 'con', label: 'Derrota Portugal' }] },
  { title: 'Resultado ao intervalo', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 30, closesAt: T_CONGO_KICKOFF,
    options: [{ id: 'por', label: 'Vitória Portugal' }, { id: 'emp', label: 'Empate' }, { id: 'con', label: 'Derrota Portugal' }] },
  { title: 'Mais ou menos de 2.5 golos?', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 25, closesAt: T_CONGO_KICKOFF,
    options: [{ id: 'mais', label: 'Mais de 2.5' }, { id: 'menos', label: 'Menos ou igual a 2.5' }] },
  { title: 'Jogador a marcar', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 50, closesAt: T_CONGO_KICKOFF,
    options: squad('jm') },
  { title: 'Portugal marca em primeiro?', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 25, closesAt: T_CONGO_KICKOFF,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Haverá cartão vermelho?', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 25, closesAt: T_CONGO_KICKOFF,
    options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] },
  { title: 'Minuto do 1º golo Portugal', category: 'portugal_game', gameLabel: 'Portugal vs Congo', gameOrder: 1, points: 40, closesAt: T_CONGO_KICKOFF,
    options: [{ id: '1_30', label: '1 a 30 min' }, { id: '31_60', label: '31 a 60 min' },
      { id: '61_90', label: '61 a 90 min' }, { id: 'sem', label: 'Sem golo de PT' }] },
]

const EMPTY_MARKET = {
  title: '',
  category: 'global',
  gameLabel: '',
  gameOrder: 1,
  points: 50,
  closesAt: '',
  options: [{ id: 'opt1', label: '' }, { id: 'opt2', label: '' }],
}

export default function Admin() {
  const [markets, setMarkets] = useState([])
  const [form, setForm] = useState(EMPTY_MARKET)
  const [creating, setCreating] = useState(false)
  const [resolving, setResolving] = useState({})
  const [selectedWinner, setSelectedWinner] = useState({})
  const [editingOptions, setEditingOptions] = useState(null)
  const [newOptionLabel, setNewOptionLabel] = useState({})
  const [editingClose, setEditingClose] = useState(null)
  const [newCloseAt, setNewCloseAt] = useState({})
  const [tab, setTab] = useState('markets')
  const [feedback, setFeedback] = useState('')

  // Pódio state
  const [podiumPicks, setPodiumPicks] = useState([])
  const [podiumUsers, setPodiumUsers] = useState({}) // uid → name
  const [podiumConfig, setPodiumConfig] = useState(null)
  const [teamResults, setTeamResults] = useState({}) // team → round
  const [podiumLoading, setPodiumLoading] = useState(false)
  const [resolvingPodium, setResolvingPodium] = useState(false)
  const [showPodiumPreview, setShowPodiumPreview] = useState(false)

  // Apostas tardias (janelas de recuperação)
  const [lateWindows, setLateWindows] = useState({}) // uid → { openUntil, openedAt }
  const [lateUsers, setLateUsers] = useState([])     // [{ id, name, email }]
  const [lateFilter, setLateFilter] = useState('')
  const [lateBusy, setLateBusy] = useState({})       // uid → bool

  useEffect(() => {
    const q = query(collection(db, 'markets'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'lateBetWindows'), snap => {
      const m = {}
      snap.docs.forEach(d => { m[d.id] = d.data() })
      setLateWindows(m)
    })
  }, [])

  useEffect(() => {
    if (tab !== 'tardias') return
    getDocs(collection(db, 'users')).then(snap => {
      setLateUsers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      )
    })
  }, [tab])

  useEffect(() => {
    if (tab !== 'podio') return
    setPodiumLoading(true)
    Promise.all([
      getDocs(collection(db, 'podiumPicks')),
      getDocs(collection(db, 'users')),
      getDoc(doc(db, 'config', 'podium')),
    ]).then(([picksSnap, usersSnap, configDoc]) => {
      const picks = picksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPodiumPicks(picks)
      const usersMap = {}
      usersSnap.docs.forEach(d => { usersMap[d.id] = d.data() })
      setPodiumUsers(usersMap)
      if (configDoc.exists()) setPodiumConfig(configDoc.data())
      // Pre-fill teamResults with existing config results if any
      if (configDoc.exists() && configDoc.data().results) {
        setTeamResults(configDoc.data().results)
      }
      setPodiumLoading(false)
    })
  }, [tab])

  const notify = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 4000) }

  const handleSeed = async () => {
    if (markets.length > 0 && !window.confirm(`Já existem ${markets.length} mercados. Criar os ${SEED_MARKETS.length} mercados pré-definidos na mesma?`)) return
    setCreating(true)
    try {
      for (const m of SEED_MARKETS) {
        await addDoc(collection(db, 'markets'), {
          title: m.title,
          category: m.category,
          gameLabel: m.gameLabel ?? null,
          gameOrder: m.gameOrder ?? null,
          points: m.points,
          closesAt: Timestamp.fromDate(m.closesAt),
          status: 'open',
          winningOptionId: null,
          options: m.options,
          section: m.section ?? null,
          description: m.description ?? null,
          createdAt: serverTimestamp(),
        })
      }
      notify(`✅ ${SEED_MARKETS.length} mercados criados!`)
    } catch (err) {
      notify('Erro: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const addOption = () => setForm(f => ({
    ...f,
    options: [...f.options, { id: `opt${f.options.length + 1}`, label: '' }]
  }))

  const removeFormOption = (i) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))

  const updateOption = (i, val) => setForm(f => ({
    ...f,
    options: f.options.map((o, idx) => idx === i ? { ...o, label: val } : o)
  }))

  const useSquad = () => setForm(f => ({
    ...f,
    options: SQUAD.map((name, i) => ({ id: `player_${i}`, label: name }))
  }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (form.options.some(o => !o.label.trim())) { notify('Preenche todas as opções'); return }
    setCreating(true)
    try {
      await addDoc(collection(db, 'markets'), {
        title: form.title,
        category: form.category,
        gameLabel: form.category === 'portugal_game' ? form.gameLabel : null,
        gameOrder: form.category === 'portugal_game' ? Number(form.gameOrder) : null,
        points: Number(form.points),
        closesAt: Timestamp.fromDate(new Date(form.closesAt)),
        status: 'open',
        winningOptionId: null,
        options: form.options.filter(o => o.label.trim()),
        createdAt: serverTimestamp(),
      })
      setForm(EMPTY_MARKET)
      notify('✅ Mercado criado!')
    } catch (err) {
      notify('Erro ao criar mercado: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const closeMarket = async (marketId) => {
    await updateDoc(doc(db, 'markets', marketId), { status: 'closed' })
    notify('Mercado encerrado')
  }

  const removeOption = async (market, optionId) => {
    const newOptions = market.options.filter(o => o.id !== optionId)
    await updateDoc(doc(db, 'markets', market.id), { options: newOptions })
    notify('Opção removida')
  }

  const toggleDiversao = async (market) => {
    const next = market.section === 'diversao' ? null : 'diversao'
    await updateDoc(doc(db, 'markets', market.id), { section: next })
    notify(next ? '🎭 Marcado como diversão' : 'Removido de diversão')
  }

  const updateCloseAt = async (market) => {
    const val = newCloseAt[market.id]
    if (!val) return
    await updateDoc(doc(db, 'markets', market.id), { closesAt: Timestamp.fromDate(new Date(val)) })
    setEditingClose(null)
    notify('Data de fecho atualizada')
  }

  const addOptionToMarket = async (market, label) => {
    if (!label.trim()) return
    const newOptions = [...market.options, { id: `opt_${Date.now()}`, label: label.trim() }]
    await updateDoc(doc(db, 'markets', market.id), { options: newOptions })
    setNewOptionLabel(prev => ({ ...prev, [market.id]: '' }))
    notify('Opção adicionada')
  }

  const deleteMarket = async (market) => {
    if (!window.confirm(`Apagar "${market.title}"? Esta ação não pode ser desfeita.`)) return
    await deleteDoc(doc(db, 'markets', market.id))
    notify('Mercado apagado')
  }

  const deleteAllMarkets = async () => {
    if (!window.confirm(`Apagar TODOS os ${markets.length} mercados e todas as apostas associadas? Esta ação não pode ser desfeita.`)) return
    if (!window.confirm('Tens a certeza absoluta? Isto apaga tudo — mercados e apostas.')) return
    try {
      const [marketsSnap, betsSnap] = await Promise.all([
        getDocs(collection(db, 'markets')),
        getDocs(collection(db, 'bets')),
      ])
      await Promise.all([
        ...marketsSnap.docs.map(d => deleteDoc(d.ref)),
        ...betsSnap.docs.map(d => deleteDoc(d.ref)),
      ])
      notify(`✅ ${marketsSnap.size} mercados e ${betsSnap.size} apostas apagados`)
    } catch (err) {
      notify('Erro: ' + err.message)
    }
  }

  const resolveMarket = async (market) => {
    const winId = selectedWinner[market.id]
    if (!winId) { notify('Seleciona a opção vencedora'); return }
    setResolving(r => ({ ...r, [market.id]: true }))
    try {
      const result = await callApi('resolveMarket', { marketId: market.id, winningOptionId: winId })
      notify(`✅ Resolvido! ${result.winnersCount} vencedor(es)`)
    } catch (err) {
      notify('Erro: ' + err.message)
    } finally {
      setResolving(r => ({ ...r, [market.id]: false }))
    }
  }

  const lateWindowActive = (uid) => {
    const w = lateWindows[uid]
    const until = w?.openUntil?.toDate?.()
    return until ? until > new Date() : false
  }

  const openLateWindow = async (uid, hours) => {
    setLateBusy(b => ({ ...b, [uid]: true }))
    try {
      const until = new Date(Date.now() + hours * 3600 * 1000)
      await setDoc(doc(db, 'lateBetWindows', uid), {
        openUntil: Timestamp.fromDate(until),
        openedBy: auth.currentUser.uid,
        openedAt: serverTimestamp(),
      })
      notify(`⏳ Janela aberta até ${until.toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`)
    } catch (err) {
      notify('Erro: ' + err.message)
    } finally {
      setLateBusy(b => ({ ...b, [uid]: false }))
    }
  }

  const closeLateWindow = async (uid) => {
    setLateBusy(b => ({ ...b, [uid]: true }))
    try {
      await deleteDoc(doc(db, 'lateBetWindows', uid))
      notify('Janela fechada')
    } catch (err) {
      notify('Erro: ' + err.message)
    } finally {
      setLateBusy(b => ({ ...b, [uid]: false }))
    }
  }

  const activeMarkets = markets.filter(m => m.status !== 'resolved')
  const resolvedMarkets = markets.filter(m => m.status === 'resolved')
  const unresolvedCount = activeMarkets.length
  const activeWindowsCount = Object.keys(lateWindows).filter(uid => lateWindowActive(uid)).length

  return (
    <div className="min-h-screen bg-[#EEF1F8]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">Admin</h1>
          {feedback && <p className="text-sm text-gold font-semibold">{feedback}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[['markets', 'Mercados'], ['create', 'Criar Mercado'], ['tardias', '⏳ Tardias'], ['podio', '🔮 Oracle']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-gold text-black' : 'bg-[#FFFFFF] text-slate-500 hover:text-slate-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* CREATE TAB */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="card p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Título</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold">
                  <option value="global">Mundial Geral</option>
                  <option value="portugal_game">Jogo Portugal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Pontos</label>
                <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} required min="1"
                  className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold" />
              </div>
            </div>

            {form.category === 'portugal_game' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do jogo</label>
                  <input value={form.gameLabel} onChange={e => setForm(f => ({ ...f, gameLabel: e.target.value }))} placeholder="Portugal vs Congo"
                    className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ordem do jogo</label>
                  <input type="number" value={form.gameOrder} onChange={e => setForm(f => ({ ...f, gameOrder: e.target.value }))} min="1" max="10"
                    className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha em</label>
              <input type="datetime-local" value={form.closesAt} onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))} required
                className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500">Opções</label>
                {form.category === 'portugal_game' && (
                  <button type="button" onClick={useSquad} className="text-xs text-gold hover:text-gold-light transition-colors font-semibold">
                    Usar squad PT
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={opt.label} onChange={e => updateOption(i, e.target.value)} placeholder={`Opção ${i + 1}`}
                      className="flex-1 bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-gold" />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeFormOption(i)} className="text-slate-400 hover:text-red-600 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addOption} className="mt-2 text-xs text-slate-500 hover:text-slate-900 transition-colors">
                + Adicionar opção
              </button>
            </div>

            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'A criar...' : 'Criar Mercado'}
            </button>
          </form>
        )}

        {/* PÓDIO TAB */}
        {tab === 'podio' && (
          <div className="space-y-5">
            <button
              onClick={() => setShowPodiumPreview(p => !p)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors ${showPodiumPreview ? 'bg-[#FFFFFF] border-gold/40 text-gold' : 'border-[#E2E7F2] text-slate-500 hover:text-slate-900'}`}
            >
              {showPodiumPreview ? '✕ Fechar preview de utilizador' : '👁 Ver como utilizador'}
            </button>

            {showPodiumPreview && (
              <div className="rounded-2xl border border-[#E2E7F2] overflow-hidden">
                <div className="px-4 py-2 bg-[#F4F6FB] border-b border-[#E2E7F2]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview — vista do utilizador</p>
                </div>
                <div className="p-4 bg-[#EEF1F8]">
                  <PodiumPicker />
                </div>
              </div>
            )}

            {podiumLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : podiumConfig?.resolved ? (
              <div className="card p-5 border-gold/30 bg-gold/5">
                <p className="text-sm font-bold text-gold">✅ Pódio já resolvido</p>
                <p className="text-xs text-slate-500 mt-1">{podiumPicks.length} participantes · pontos já distribuídos</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Participantes</p>
                    <p className="text-2xl font-black text-gold">{podiumPicks.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="text-sm font-bold text-slate-900">17 Jun · 18h00</p>
                  </div>
                </div>

                {/* Picks list */}
                {podiumPicks.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E2E7F2]">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Picks submetidos</p>
                    </div>
                    <div className="divide-y divide-[#E2E7F2]/50">
                      {podiumPicks.map(pick => {
                        const userName = podiumUsers[pick.userId]?.name ?? pick.userId.slice(0, 8) + '…'
                        return (
                          <div key={pick.id} className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1.5">{userName}</p>
                            <div className="flex flex-wrap gap-2">
                              {[['🥇', pick.tier1], ['🥈', pick.tier2], ['🥉', pick.tier3]].map(([emoji, team]) => (
                                <span key={emoji} className="flex items-center gap-1 text-xs bg-[#F4F6FB] border border-[#E2E7F2] rounded-lg px-2 py-1">
                                  {emoji}
                                  {FLAG[team] && (
                                    <img
                                      src={`https://flagcdn.com/16x12/${FLAG[team]}.png`}
                                      alt=""
                                      className="rounded-[2px]"
                                      style={{ width: 16, height: 12 }}
                                    />
                                  )}
                                  <span className="text-slate-600">{team}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Resolve section */}
                {podiumPicks.length > 0 && (() => {
                  const pickedTeams = [...new Set(podiumPicks.flatMap(p => [p.tier1, p.tier2, p.tier3]))]
                  const allSet = pickedTeams.every(t => teamResults[t])
                  return (
                    <div className="card p-4 space-y-4">
                      <p className="text-sm font-bold text-slate-900">Definir fase atingida por seleção</p>
                      <p className="text-xs text-slate-500">Define a fase máxima atingida por cada seleção que foi escolhida pelos utilizadores. Pontos = soma das 3 picks.</p>
                      <div className="space-y-2">
                        {pickedTeams.sort().map(team => (
                          <div key={team} className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 w-36 shrink-0">
                              {FLAG[team] && (
                                <img
                                  src={`https://flagcdn.com/20x15/${FLAG[team]}.png`}
                                  alt=""
                                  className="rounded-[2px]"
                                  style={{ width: 20, height: 15 }}
                                />
                              )}
                              <span className="text-sm text-slate-900 font-semibold truncate">{team}</span>
                            </div>
                            <select
                              value={teamResults[team] ?? ''}
                              onChange={e => setTeamResults(r => ({ ...r, [team]: e.target.value }))}
                              className="flex-1 bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-gold"
                            >
                              <option value="">— Fase atingida —</option>
                              {ROUNDS.map(r => (
                                <option key={r.id} value={r.id}>{r.label} ({r.pts} pts)</option>
                              ))}
                            </select>
                            {teamResults[team] && (
                              <span className="text-gold font-black text-sm shrink-0 w-10 text-right">
                                {POINTS_BY_ROUND[teamResults[team]]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {!allSet && (
                        <p className="text-xs text-amber-600">⚠️ Define a fase para todas as seleções antes de distribuir</p>
                      )}
                      <button
                        onClick={async () => {
                          if (!allSet) return
                          if (!window.confirm(`Distribuir pontos do Pódio a ${podiumPicks.length} utilizadores? Esta ação não pode ser desfeita.`)) return
                          setResolvingPodium(true)
                          try {
                            const res = await callApi('resolvePodium', { results: teamResults })
                            notify(`✅ Pódio resolvido! ${res.picksResolved} picks processados.`)
                            setPodiumConfig({ resolved: true, results: teamResults })
                          } catch (err) {
                            notify('Erro: ' + err.message)
                          } finally {
                            setResolvingPodium(false)
                          }
                        }}
                        disabled={!allSet || resolvingPodium}
                        className="btn-primary w-full"
                      >
                        {resolvingPodium ? 'A distribuir...' : `🔮 Distribuir Pontos Oracle (${podiumPicks.length} utilizadores)`}
                      </button>
                    </div>
                  )
                })()}

                {podiumPicks.length === 0 && (
                  <div className="card p-6 text-center">
                    <p className="text-slate-500 text-sm">Nenhum pick submetido ainda.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* APOSTAS TARDIAS TAB */}
        {tab === 'tardias' && (
          <div className="space-y-4">
            {/* Aviso de justiça */}
            <div className="card p-4 border border-amber-300 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">⚠️ Antes de abrir uma janela</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Resolve primeiro os mercados de jogos <strong>já decididos</strong>. A janela só deixa
                apostar em perguntas <strong>ainda não resolvidas</strong> — se um jogo já aconteceu mas
                ainda não o resolveste, o utilizador podia apostar sabendo o resultado.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Neste momento há <strong>{unresolvedCount}</strong> mercado(s) por resolver.
              </p>
            </div>

            {/* Resumo + filtro */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Janelas ativas</p>
                  <p className="text-2xl font-black text-gold">{activeWindowsCount}</p>
                </div>
                <p className="text-xs text-slate-500 text-right max-w-[55%] leading-relaxed">
                  Abre uma janela temporária para quem não conseguiu apostar a tempo.
                  Apostas já feitas não mudam; só pode apostar em perguntas novas.
                </p>
              </div>
              <input
                value={lateFilter}
                onChange={e => setLateFilter(e.target.value)}
                placeholder="Procurar utilizador..."
                className="w-full bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-gold"
              />
            </div>

            {/* Lista de utilizadores */}
            <div className="card overflow-hidden divide-y divide-[#E2E7F2]/60">
              {lateUsers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">A carregar utilizadores...</p>
              )}
              {lateUsers
                .filter(u => {
                  const q = lateFilter.trim().toLowerCase()
                  if (!q) return true
                  return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
                })
                .map(u => {
                  const active = lateWindowActive(u.id)
                  const until = lateWindows[u.id]?.openUntil?.toDate?.()
                  const busy = lateBusy[u.id]
                  return (
                    <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{u.name || '(sem nome)'}</p>
                        {active && until ? (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                            ⏳ Aberta até {until.toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {active ? (
                          <button
                            onClick={() => closeLateWindow(u.id)}
                            disabled={busy}
                            className="text-xs py-1.5 px-3 rounded-xl border border-red-500/40 text-red-600 hover:bg-red-500/10 transition-colors font-semibold disabled:opacity-50"
                          >
                            {busy ? '...' : 'Fechar'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openLateWindow(u.id, 2)}
                              disabled={busy}
                              className="text-xs py-1.5 px-3 rounded-xl border border-[#C8D0E4] text-slate-600 hover:text-slate-900 hover:border-gold transition-colors font-semibold disabled:opacity-50"
                            >
                              {busy ? '...' : '+2h'}
                            </button>
                            <button
                              onClick={() => openLateWindow(u.id, 24)}
                              disabled={busy}
                              className="text-xs py-1.5 px-3 rounded-xl border border-[#C8D0E4] text-slate-600 hover:text-slate-900 hover:border-gold transition-colors font-semibold disabled:opacity-50"
                            >
                              {busy ? '...' : '+24h'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* MARKETS TAB */}
        {tab === 'markets' && (
          <div className="space-y-4">
            {activeMarkets.length === 0 && resolvedMarkets.length === 0 && (
              <div className="card p-6 text-center space-y-3">
                <p className="text-slate-500 text-sm">Sem mercados criados ainda.</p>
                <button onClick={handleSeed} disabled={creating} className="btn-primary text-sm">
                  {creating ? 'A criar...' : `🚀 Criar ${SEED_MARKETS.length} mercados de uma vez`}
                </button>
              </div>
            )}
            {(activeMarkets.length > 0 || resolvedMarkets.length > 0) && (
              <div className="flex gap-2">
                <button onClick={handleSeed} disabled={creating} className="btn-secondary text-sm flex-1">
                  {creating ? 'A criar...' : `+ Mercados pré-definidos (${SEED_MARKETS.length})`}
                </button>
                <button onClick={deleteAllMarkets} className="text-sm px-4 py-2 rounded-xl border border-red-500/40 text-red-600 hover:bg-red-500/10 transition-colors font-semibold">
                  🗑 Apagar tudo
                </button>
              </div>
            )}

            {activeMarkets.map(market => (
              <div key={market.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{market.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{market.points} pts · {market.category === 'portugal_game' ? market.gameLabel : 'Mundial Geral'}</p>
                  </div>
                  <span className={market.status === 'open' ? 'badge-open' : 'badge-closed'}>
                    {market.status === 'open' ? 'Aberto' : 'Encerrado'}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {market.status === 'open' && (
                    <button onClick={() => closeMarket(market.id)} className="btn-secondary text-xs py-1.5 px-3">
                      Encerrar
                    </button>
                  )}
                  <button
                    onClick={() => setEditingOptions(editingOptions === market.id ? null : market.id)}
                    className="text-xs py-1.5 px-3 rounded-xl border border-[#C8D0E4] text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {editingOptions === market.id ? 'Fechar' : 'Editar opções'}
                  </button>
                  <button
                    onClick={() => {
                      const current = market.closesAt?.toDate?.()
                      const local = current ? new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
                      setNewCloseAt(prev => ({ ...prev, [market.id]: local }))
                      setEditingClose(editingClose === market.id ? null : market.id)
                    }}
                    className="text-xs py-1.5 px-3 rounded-xl border border-[#C8D0E4] text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {editingClose === market.id ? 'Fechar' : 'Editar fecho'}
                  </button>
                  <button
                    onClick={() => toggleDiversao(market)}
                    className={`text-xs py-1.5 px-3 rounded-xl border transition-colors ${market.section === 'diversao' ? 'border-purple-500/40 text-purple-400 bg-purple-500/10' : 'border-[#C8D0E4] text-slate-500 hover:text-slate-900'}`}
                  >
                    {market.section === 'diversao' ? '🎭 Diversão' : '🎭'}
                  </button>
                  <button onClick={() => deleteMarket(market)} className="text-xs py-1.5 px-3 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors">
                    Apagar
                  </button>

                  {editingClose === market.id && (
                    <div className="w-full mt-1 bg-[#F4F6FB] rounded-xl p-3 flex gap-2">
                      <input
                        type="datetime-local"
                        value={newCloseAt[market.id] || ''}
                        onChange={e => setNewCloseAt(prev => ({ ...prev, [market.id]: e.target.value }))}
                        className="flex-1 bg-[#FFFFFF] border border-[#E2E7F2] rounded-xl px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-gold"
                      />
                      <button onClick={() => updateCloseAt(market)} className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
                        Guardar
                      </button>
                    </div>
                  )}

                  {editingOptions === market.id && (
                    <div className="w-full mt-1 bg-[#F4F6FB] rounded-xl p-3 space-y-1.5">
                      <p className="text-xs text-slate-500 mb-2">Opções actuais</p>
                      {market.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between gap-2 bg-[#FFFFFF] rounded-lg px-3 py-2">
                          <span className="text-sm text-slate-600">{opt.label}</span>
                          <button
                            onClick={() => removeOption(market, opt.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors text-lg leading-none flex-shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={newOptionLabel[market.id] || ''}
                          onChange={e => setNewOptionLabel(prev => ({ ...prev, [market.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOptionToMarket(market, newOptionLabel[market.id] || ''))}
                          placeholder="Nova opção..."
                          className="flex-1 bg-[#FFFFFF] border border-[#E2E7F2] rounded-xl px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-gold"
                        />
                        <button
                          onClick={() => addOptionToMarket(market, newOptionLabel[market.id] || '')}
                          className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 flex-1">
                    <select
                      value={selectedWinner[market.id] || ''}
                      onChange={e => setSelectedWinner(w => ({ ...w, [market.id]: e.target.value }))}
                      className="flex-1 bg-[#F4F6FB] border border-[#E2E7F2] rounded-xl px-2 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-gold"
                    >
                      <option value="">Seleciona vencedor...</option>
                      {market.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => resolveMarket(market)}
                      disabled={resolving[market.id]}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      {resolving[market.id] ? '...' : 'Resolver'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {resolvedMarkets.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resolvidos</p>
                <div className="space-y-2">
                  {resolvedMarkets.map(market => {
                    const winner = market.options.find(o => o.id === market.winningOptionId)
                    return (
                      <div key={market.id} className="card p-3 flex items-center justify-between opacity-60">
                        <div>
                          <p className="text-sm text-slate-900 font-semibold">{market.title}</p>
                          <p className="text-xs text-gold mt-0.5">✓ {winner?.label}</p>
                        </div>
                        <span className="badge-resolved">Resolvido</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

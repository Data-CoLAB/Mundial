// Sync do calendário do Mundial 2026 (grupos + fase a eliminar) da Wikipédia -> Firestore.
//
// Os dados vêm SEMPRE da Wikipédia (en) em tempo real — zero memória/intuição.
// Resultados, classificações e o quadro são reconstruídos do zero a cada execução.
//
// Como correr:
//   1. Precisa de  serviceAccountKey.json  nesta pasta (Mundial/). NÃO commitar (está no .gitignore).
//   2. Dry-run (não escreve nada, só mostra o que ia gravar):
//        node sync-fixtures.mjs
//   3. Aplicar a sério (escreve em config/calendar):
//        node sync-fixtures.mjs --apply
//
// "Vamos atualizando à medida que os resultados saem" = voltar a correr este comando.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const KEY_PATH = process.env.SA_KEY || './serviceAccountKey.json'
const UA = 'DataBets-WC-sync/1.0 (trsantospt@gmail.com)'

// Código FIFA (3 letras) -> nome PT (igual ao mapa FLAG da app)
const CODE_PT = {
  MEX: 'México', RSA: 'África do Sul', KOR: 'Coreia do Sul', CZE: 'Chéquia',
  CAN: 'Canadá', BIH: 'Bósnia-Herz.', QAT: 'Qatar', SUI: 'Suíça',
  BRA: 'Brasil', MAR: 'Marrocos', SCO: 'Escócia', HAI: 'Haiti',
  USA: 'EUA', PAR: 'Paraguai', AUS: 'Austrália', TUR: 'Turquia',
  GER: 'Alemanha', CIV: 'Costa do Marfim', ECU: 'Equador', CUW: 'Curaçao',
  NED: 'Países Baixos', JPN: 'Japão', SWE: 'Suécia', TUN: 'Tunísia',
  NZL: 'Nova Zelândia', IRN: 'Irão', EGY: 'Egito', BEL: 'Bélgica',
  KSA: 'Arábia Saudita', URU: 'Uruguai', ESP: 'Espanha', CPV: 'Cabo Verde',
  FRA: 'França', SEN: 'Senegal', IRQ: 'Iraque', NOR: 'Noruega',
  ARG: 'Argentina', ALG: 'Argélia', AUT: 'Áustria', JOR: 'Jordânia',
  POR: 'Portugal', COD: 'Congo RD', UZB: 'Uzbequistão', COL: 'Colômbia',
  ENG: 'Inglaterra', CRO: 'Croácia', GHA: 'Gana', PAN: 'Panamá',
  DRC: 'Congo RD',
}

const MONTHS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 }

const unknown = new Set()
const pt = (code) => {
  code = code.trim().toUpperCase()
  if (CODE_PT[code]) return CODE_PT[code]
  unknown.add(code)
  return code
}

async function wikitext(page) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'parse', page, format: 'json', prop: 'wikitext', formatversion: '2',
  })
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar "${page}"`)
  return (await r.json()).parse.wikitext
}

// Split em sep só ao nível de topo (ignora | dentro de [[ ]] e {{ }})
function splitTop(s, sep = '|') {
  const out = []; let buf = '', sq = 0, cu = 0
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (two === '[[') { sq++; buf += two; i++; continue }
    if (two === ']]') { sq--; buf += two; i++; continue }
    if (two === '{{') { cu++; buf += two; i++; continue }
    if (two === '}}') { cu--; buf += two; i++; continue }
    const c = s[i]
    if (c === sep && sq <= 0 && cu <= 0) { out.push(buf); buf = ''; continue }
    buf += c
  }
  out.push(buf)
  return out
}

const CODE_RE = /fb[a-z-]*\|([A-Za-z]{3})/
const SCORE_RE = /(\d+)\s*[–\-−]\s*(\d+)/
const DATE_RE = /Start date\|(\d+)\|(\d+)\|(\d+)/

function parseFootballBoxes(wt) {
  const boxes = []
  const parts = wt.split('#invoke:football box')
  for (let p = 1; p < parts.length; p++) {
    const lines = parts[p].split('\n')
    let date = null, t1 = null, t2 = null, score = null
    for (const ln of lines) {
      const s = ln.trim()
      if (date === null && s.startsWith('|date=')) {
        const m = s.match(DATE_RE)
        if (m) date = `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`
      } else if (t1 === null && s.startsWith('|team1=')) {
        const m = s.match(CODE_RE); if (m) t1 = m[1]
      } else if (t2 === null && s.startsWith('|team2=')) {
        const m = s.match(CODE_RE); if (m) t2 = m[1]
      } else if (score === null && s.startsWith('|score=')) {
        const m = s.match(SCORE_RE); if (m) score = [+m[1], +m[2]]
      }
    }
    if (t1 && t2) boxes.push({
      home: pt(t1), away: pt(t2),
      homeScore: score ? score[0] : null, awayScore: score ? score[1] : null,
      date,
    })
  }
  return boxes
}

// Classificação oficial 2026: pontos -> (entre empatados) pts H2H, DG H2H, GM H2H -> DG total, GM total.
// Verificado contra a ordem oficial da Wikipédia nos 12 grupos.
function computeOrder(matches) {
  const T = {}
  const ensure = (t) => (T[t] ||= { Pts: 0, GD: 0, GF: 0 })
  const add = (a, b, ga, gb) => { const x = ensure(a); x.GF += ga; x.GD += ga - gb; if (ga > gb) x.Pts += 3; else if (ga === gb) x.Pts += 1 }
  for (const m of matches) { ensure(m.home); ensure(m.away); add(m.home, m.away, m.homeScore, m.awayScore); add(m.away, m.home, m.awayScore, m.homeScore) }
  const h2h = (set) => {
    const S = {}; set.forEach((t) => (S[t] = { Pts: 0, GD: 0, GF: 0 }))
    for (const m of matches) {
      if (set.has(m.home) && set.has(m.away)) {
        for (const [x, , gx, gy] of [[m.home, m.away, m.homeScore, m.awayScore], [m.away, m.home, m.awayScore, m.homeScore]]) {
          S[x].GF += gx; S[x].GD += gx - gy; if (gx > gy) S[x].Pts += 3; else if (gx === gy) S[x].Pts += 1
        }
      }
    }
    return S
  }
  const names = Object.keys(T).sort((a, b) => T[b].Pts - T[a].Pts)
  const out = []
  for (let i = 0; i < names.length;) {
    let j = i
    while (j < names.length && T[names[j]].Pts === T[names[i]].Pts) j++
    const block = names.slice(i, j)
    if (block.length > 1) {
      const S = h2h(new Set(block))
      block.sort((a, b) => S[b].Pts - S[a].Pts || S[b].GD - S[a].GD || S[b].GF - S[a].GF || T[b].GD - T[a].GD || T[b].GF - T[a].GF)
    }
    out.push(...block)
    i = j
  }
  return out
}

function parseBracket(wt) {
  const m = wt.match(/N32([\s\S]*?)\}\}<section end/)
  const block = m ? m[1] : ''
  const RD = { 'Round of 32': 'R32', 'Round of 16': 'R16', Quarterfinals: 'QF', Semifinals: 'SF', Final: 'Final', 'Match for third place': 'Third' }
  const ko = { R32: [], R16: [], QF: [], SF: [], Final: [], Third: [] }
  let round = null
  for (const raw of block.split('\n')) {
    const cm = raw.match(/^\s*<!--(.*?)-->/)
    if (cm) { if (RD[cm[1].trim()]) round = RD[cm[1].trim()]; continue }
    if (!raw.trim().startsWith('|') || !round) continue
    const cells = splitTop(raw, '|')
    if (cells.length < 4) continue
    const meta = cells[1]
    const dm = meta.match(/\s*([A-Za-z]+ \d+)\s*[–\-]\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
    let date = null, venue = ''
    if (dm) {
      const [, md, target, label] = dm
      const [mon, day] = md.split(' ')
      date = `2026-${String(MONTHS[mon]).padStart(2, '0')}-${String(+day).padStart(2, '0')}`
      venue = (label || target).trim()
    }
    const team = (c) => { const cc = c.match(CODE_RE); if (cc) return pt(cc[1]); return null } // Winner/Loser -> null
    const num = (c) => { const v = c.trim(); return /^\d+$/.test(v) ? +v : null }
    const home = team(cells[2] || ''), away = team(cells[4] || '')
    ko[round].push({ date, venue, home, away, homeScore: num(cells[3] || ''), awayScore: num(cells[5] || '') })
  }
  return ko
}

async function build() {
  const groups = []
  for (const L of 'ABCDEFGHIJKL') {
    const wt = await wikitext('2026 FIFA World Cup Group ' + L)
    const matches = parseFootballBoxes(wt)
    matches.forEach((b, i) => (b.jornada = Math.floor(i / 2) + 1))
    if (matches.length !== 6) throw new Error(`Grupo ${L}: esperava 6 jogos, obtive ${matches.length}`)
    const allPlayed = matches.every((m) => m.homeScore !== null)
    groups.push({ id: L, isPortugal: L === 'K', matches, order: allPlayed ? computeOrder(matches) : null })
    process.stderr.write(`Grupo ${L}: ${matches.length} jogos${allPlayed ? ' (classificação calculada)' : ''}\n`)
  }
  const koWt = await wikitext('2026 FIFA World Cup knockout stage')
  const knockout = parseBracket(koWt)
  return { groups, knockout, source: 'en.wikipedia.org', updatedAt: new Date().toISOString() }
}

function printSummary(data) {
  console.log('\n================ FASE DE GRUPOS ================')
  for (const g of data.groups) {
    console.log(`\n--- Grupo ${g.id}${g.isPortugal ? ' 🇵🇹' : ''} ---  ordem: ${g.order ? g.order.join(' > ') : '(incompleta)'}`)
    for (const m of g.matches) {
      const sc = m.homeScore !== null ? `${m.homeScore}-${m.awayScore}` : 'vs'
      console.log(`  J${m.jornada} ${m.date}  ${m.home.padStart(16)} ${sc.padStart(5)} ${m.away}`)
    }
  }
  console.log('\n================ FASE A ELIMINAR ================')
  for (const rd of ['R32', 'R16', 'QF', 'SF', 'Third', 'Final']) {
    console.log(`\n--- ${rd} ---`)
    for (const m of data.knockout[rd]) {
      const sc = m.homeScore !== null ? `${m.homeScore}-${m.awayScore}` : 'vs'
      const h = (m.home || '?').padStart(16), a = m.away || '?'
      console.log(`  ${(m.date || '').padStart(10)} ${(m.venue || '').padEnd(16)} ${h} ${sc.padStart(5)} ${a}`)
    }
  }
  const played = data.knockout.R32.filter((m) => m.homeScore !== null).length
  console.log(`\nR32 jogados: ${played}/16`)
}

async function main() {
  const data = await build()
  if (unknown.size) { console.error('\n⚠️  CÓDIGOS DESCONHECIDOS:', [...unknown]); throw new Error('Há códigos por mapear — aborta para não gravar lixo.') }
  printSummary(data)
  if (!APPLY) {
    console.log('\nℹ️  DRY-RUN. Nada foi escrito. Corre com  --apply  para gravar em config/calendar.')
    return
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(KEY_PATH, 'utf8'))) })
  const db = getFirestore()
  await db.collection('config').doc('calendar').set(data)
  console.log('\n✅ Gravado em config/calendar (Firestore).')
}

main().catch((e) => { console.error(e); process.exit(1) })

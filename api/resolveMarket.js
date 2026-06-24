import { FieldValue } from 'firebase-admin/firestore'
import { getDb, requireAdmin } from '../lib/firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await requireAdmin(req)

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { marketId } = body
    // Aceita várias opções vencedoras (winningOptionIds) ou uma só (winningOptionId, legado).
    const winningIds = Array.isArray(body.winningOptionIds)
      ? [...new Set(body.winningOptionIds)]
      : (body.winningOptionId ? [body.winningOptionId] : [])
    if (!marketId || winningIds.length === 0) {
      return res.status(400).json({ error: 'marketId e pelo menos uma opção vencedora são obrigatórios' })
    }

    const db = getDb()
    const marketRef = db.doc(`markets/${marketId}`)
    const marketDoc = await marketRef.get()
    if (!marketDoc.exists) {
      return res.status(404).json({ error: 'Mercado não encontrado' })
    }
    const market = marketDoc.data()
    if (market.status === 'resolved') {
      return res.status(409).json({ error: 'Mercado já resolvido' })
    }

    const validIds = new Set((market.options || []).map((o) => o.id))
    const invalid = winningIds.filter((id) => !validIds.has(id))
    if (invalid.length) {
      return res.status(400).json({ error: 'Opção(ões) inválida(s): ' + invalid.join(', ') })
    }

    const points = market.points

    // Lê todas as apostas do mercado e filtra as que acertaram numa das opções vencedoras.
    const winningSet = new Set(winningIds)
    const betsSnap = await db.collection('bets').where('marketId', '==', marketId).get()
    const winningBets = betsSnap.docs.filter((d) => winningSet.has(d.data().optionId))

    // Salta apostas de utilizadores que já não existem (apagados/órfãos) — senão
    // o batch.update rebenta com NOT_FOUND e a resolução falha toda.
    const userRefs = winningBets.map((d) => db.doc(`users/${d.data().userId}`))
    const userSnaps = userRefs.length ? await db.getAll(...userRefs) : []
    const existing = new Set(userSnaps.filter((s) => s.exists).map((s) => s.id))

    const batch = db.batch()
    let credited = 0
    winningBets.forEach((betDoc) => {
      const uid = betDoc.data().userId
      if (!existing.has(uid)) return
      batch.update(db.doc(`users/${uid}`), {
        totalPoints: FieldValue.increment(points),
      })
      credited++
    })
    batch.update(marketRef, {
      status: 'resolved',
      winningOptionIds: winningIds,
      winningOptionId: winningIds.length === 1 ? winningIds[0] : null,
      resolvedAt: FieldValue.serverTimestamp(),
    })
    await batch.commit()

    return res.status(200).json({ success: true, winnersCount: credited, skipped: winningBets.length - credited })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  }
}

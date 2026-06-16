import { FieldValue } from 'firebase-admin/firestore'
import { getDb, requireAdmin } from '../lib/firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await requireAdmin(req)

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { marketId, winningOptionId } = body
    if (!marketId || !winningOptionId) {
      return res.status(400).json({ error: 'marketId e winningOptionId são obrigatórios' })
    }

    const db = getDb()
    const marketRef = db.doc(`markets/${marketId}`)
    const marketDoc = await marketRef.get()
    if (!marketDoc.exists) {
      return res.status(404).json({ error: 'Mercado não encontrado' })
    }
    if (marketDoc.data().status === 'resolved') {
      return res.status(409).json({ error: 'Mercado já resolvido' })
    }

    const points = marketDoc.data().points

    const betsSnap = await db.collection('bets')
      .where('marketId', '==', marketId)
      .where('optionId', '==', winningOptionId)
      .get()

    const batch = db.batch()
    betsSnap.docs.forEach((betDoc) => {
      batch.update(db.doc(`users/${betDoc.data().userId}`), {
        totalPoints: FieldValue.increment(points),
      })
    })
    batch.update(marketRef, {
      status: 'resolved',
      winningOptionId,
      resolvedAt: FieldValue.serverTimestamp(),
    })
    await batch.commit()

    return res.status(200).json({ success: true, winnersCount: betsSnap.size })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  }
}

import { FieldValue } from 'firebase-admin/firestore'
import { getDb, requireAdmin } from '../lib/firebaseAdmin.js'

const POINTS = {
  grupos: 5, '16avos': 10, oitavos: 20, quartos: 40, meias: 70, final: 100, campeao: 150,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await requireAdmin(req)

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { results } = body
    if (!results || typeof results !== 'object') {
      return res.status(400).json({ error: 'results é obrigatório' })
    }

    const db = getDb()
    const configRef = db.doc('config/podium')
    const configDoc = await configRef.get()
    if (configDoc.exists && configDoc.data()?.resolved) {
      return res.status(409).json({ error: 'Pódio já foi resolvido' })
    }

    const picksSnap = await db.collection('podiumPicks').get()

    // Pré-calcula os pontos de cada pick e salta utilizadores que já não existem
    // (apagados/órfãos) — senão o batch.update rebenta com NOT_FOUND.
    const toCredit = []
    picksSnap.docs.forEach((pickDoc) => {
      const pick = pickDoc.data()
      const pts =
        (POINTS[results[pick.tier1]] ?? 0) +
        (POINTS[results[pick.tier2]] ?? 0) +
        (POINTS[results[pick.tier3]] ?? 0)
      if (pts > 0) toCredit.push({ uid: pick.userId, pts })
    })
    const userRefs = toCredit.map((c) => db.doc(`users/${c.uid}`))
    const userSnaps = userRefs.length ? await db.getAll(...userRefs) : []
    const existing = new Set(userSnaps.filter((s) => s.exists).map((s) => s.id))

    const batch = db.batch()
    let credited = 0
    toCredit.forEach(({ uid, pts }) => {
      if (!existing.has(uid)) return
      batch.update(db.doc(`users/${uid}`), {
        totalPoints: FieldValue.increment(pts),
      })
      credited++
    })

    batch.set(configRef, {
      resolved: true,
      resolvedAt: FieldValue.serverTimestamp(),
      results,
    })
    await batch.commit()

    return res.status(200).json({ success: true, picksResolved: picksSnap.size, credited })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  }
}

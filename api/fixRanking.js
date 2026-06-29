import { FieldValue } from 'firebase-admin/firestore'
import { getDb, requireAdmin } from '../lib/firebaseAdmin.js'

// Fixa o ranking atual como base para as setas do leaderboard.
// Guarda em config/rankingSnapshot um mapa { uid: posição } com a ordenação
// IGUAL à do leaderboard (totalPoints desc, depois id asc — desempate determinístico).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await requireAdmin(req)

    const db = getDb()
    const usersSnap = await db.collection('users').get()
    const users = usersSnap.docs.map((d) => ({ id: d.id, totalPoints: d.data().totalPoints || 0 }))
    users.sort((a, b) => b.totalPoints - a.totalPoints || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    const ranks = {}
    users.forEach((u, i) => { ranks[u.id] = i + 1 })

    await db.doc('config/rankingSnapshot').set({
      ranks,
      count: users.length,
      fixedAt: FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ success: true, count: users.length })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  }
}

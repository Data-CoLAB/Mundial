const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()

exports.resolveMarket = onCall({ region: 'europe-west1' }, async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Não autenticado')

  const callerDoc = await db.doc(`users/${callerUid}`).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas admins podem resolver mercados')
  }

  const { marketId, winningOptionId } = request.data
  if (!marketId || !winningOptionId) {
    throw new HttpsError('invalid-argument', 'marketId e winningOptionId são obrigatórios')
  }

  const marketDoc = await db.doc(`markets/${marketId}`).get()
  if (!marketDoc.exists) throw new HttpsError('not-found', 'Mercado não encontrado')
  if (marketDoc.data().status === 'resolved') {
    throw new HttpsError('failed-precondition', 'Mercado já resolvido')
  }

  const points = marketDoc.data().points

  const betsSnap = await db.collection('bets')
    .where('marketId', '==', marketId)
    .where('optionId', '==', winningOptionId)
    .get()

  const batch = db.batch()

  betsSnap.docs.forEach(betDoc => {
    const userRef = db.doc(`users/${betDoc.data().userId}`)
    batch.update(userRef, { totalPoints: FieldValue.increment(points) })
  })

  batch.update(db.doc(`markets/${marketId}`), {
    status: 'resolved',
    winningOptionId,
    resolvedAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return { success: true, winnersCount: betsSnap.size }
})

exports.resolvePodium = onCall({ region: 'europe-west1' }, async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Não autenticado')

  const callerDoc = await db.doc(`users/${callerUid}`).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas admins podem resolver o Pódio')
  }

  // Check not already resolved
  const configDoc = await db.doc('config/podium').get()
  if (configDoc.exists && configDoc.data()?.resolved) {
    throw new HttpsError('failed-precondition', 'Pódio já foi resolvido')
  }

  const { results } = request.data
  // results = { 'Argentina': 'campeao', 'Brasil': 'quartos', ... }
  if (!results || typeof results !== 'object') {
    throw new HttpsError('invalid-argument', 'results é obrigatório')
  }

  const POINTS = {
    grupos: 5, '16avos': 10, oitavos: 20, quartos: 40, meias: 70, final: 100, campeao: 150,
  }

  const picksSnap = await db.collection('podiumPicks').get()
  const batch = db.batch()
  let count = 0

  picksSnap.docs.forEach(pickDoc => {
    const pick = pickDoc.data()
    const pts =
      (POINTS[results[pick.tier1]] ?? 0) +
      (POINTS[results[pick.tier2]] ?? 0) +
      (POINTS[results[pick.tier3]] ?? 0)

    if (pts > 0) {
      batch.update(db.doc(`users/${pick.userId}`), {
        totalPoints: FieldValue.increment(pts),
      })
    }
    count++
  })

  batch.set(db.doc('config/podium'), {
    resolved: true,
    resolvedAt: FieldValue.serverTimestamp(),
    results,
  })

  await batch.commit()

  return { success: true, picksResolved: count }
})

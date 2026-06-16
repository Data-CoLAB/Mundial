import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function ensureApp() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    initializeApp({ credential: cert(svc) })
  }
}

export function getDb() {
  ensureApp()
  return getFirestore()
}

// Verifies the caller's Firebase ID token and that they are an admin.
// Resolves with the decoded token; rejects with { status, message } on failure.
export async function requireAdmin(req) {
  ensureApp()
  const authz = req.headers.authorization || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) throw { status: 401, message: 'Não autenticado' }

  let decoded
  try {
    decoded = await getAuth().verifyIdToken(token)
  } catch {
    throw { status: 401, message: 'Token inválido' }
  }

  const userDoc = await getFirestore().doc(`users/${decoded.uid}`).get()
  if (userDoc.data()?.role !== 'admin') {
    throw { status: 403, message: 'Apenas admins podem executar esta ação' }
  }
  return decoded
}

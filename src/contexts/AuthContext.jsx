import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { getPendingName } from '../authPending'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setNeedsVerification(false)
        setLoading(false)
        return
      }

      const emailPrefix = firebaseUser.email.split('@')[0]
      const displayName = firebaseUser.displayName || getPendingName() || emailPrefix

      try {
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          // Utilizador JÁ registado — entra e aposta normalmente (não é afetado
          // pela verificação de email; só os novos é que precisam de verificar).
          const data = userSnap.data()
          if (firebaseUser.displayName && data.name === emailPrefix && data.name !== firebaseUser.displayName) {
            await setDoc(userRef, { name: firebaseUser.displayName }, { merge: true })
            data.name = firebaseUser.displayName
          }
          setUser({ uid: firebaseUser.uid, ...data })
          setNeedsVerification(false)
        } else if (firebaseUser.emailVerified) {
          // Novo utilizador, já verificado → cria o documento.
          const newUser = {
            name: displayName,
            email: firebaseUser.email,
            totalPoints: 0,
            role: 'user',
            createdAt: serverTimestamp(),
          }
          await setDoc(userRef, newUser)
          setUser({ uid: firebaseUser.uid, ...newUser, totalPoints: 0 })
          setNeedsVerification(false)
        } else {
          // Novo utilizador, sem documento e por verificar → ecrã de verificação.
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: displayName, role: 'user', totalPoints: 0 })
          setNeedsVerification(true)
        }
      } catch (err) {
        console.error('Erro ao carregar utilizador:', err)
        // Em caso de erro de leitura, não bloquear — a segurança real está nas regras.
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: displayName, totalPoints: 0, role: 'user' })
        setNeedsVerification(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin', needsVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

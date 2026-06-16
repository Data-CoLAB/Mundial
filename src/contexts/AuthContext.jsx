import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { getPendingName } from '../authPending'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid)
          const userSnap = await getDoc(userRef)

          const emailPrefix = firebaseUser.email.split('@')[0]

          if (!userSnap.exists()) {
            const newUser = {
              name: firebaseUser.displayName || getPendingName() || emailPrefix,
              email: firebaseUser.email,
              totalPoints: 0,
              role: 'user',
              createdAt: serverTimestamp(),
            }
            await setDoc(userRef, newUser)
            setUser({ uid: firebaseUser.uid, ...newUser, totalPoints: 0 })
          } else {
            const data = userSnap.data()
            // Self-heal: contas antigas guardaram o prefixo do email em vez do nome
            // real. Se o displayName (definido no registo) existir e o doc tiver o
            // prefixo, corrige o nome.
            if (firebaseUser.displayName && data.name === emailPrefix && data.name !== firebaseUser.displayName) {
              await setDoc(userRef, { name: firebaseUser.displayName }, { merge: true })
              data.name = firebaseUser.displayName
            }
            setUser({ uid: firebaseUser.uid, ...data })
          }
        } catch (err) {
          console.error('Erro ao carregar utilizador:', err)
          // Still set basic user so app doesn't hang — Firestore rules may not be deployed yet
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email.split('@')[0], totalPoints: 0, role: 'user' })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

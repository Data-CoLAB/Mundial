import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

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

          if (!userSnap.exists()) {
            const newUser = {
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              totalPoints: 0,
              role: 'user',
              createdAt: serverTimestamp(),
            }
            await setDoc(userRef, newUser)
            setUser({ uid: firebaseUser.uid, ...newUser, totalPoints: 0 })
          } else {
            setUser({ uid: firebaseUser.uid, ...userSnap.data() })
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

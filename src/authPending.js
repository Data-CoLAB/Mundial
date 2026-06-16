// Canal simples para passar o nome do registo ao AuthContext.
// O createUserWithEmailAndPassword faz login antes de o updateProfile(displayName)
// correr, por isso guardamos o nome aqui (síncrono) antes de criar a conta para
// o AuthContext o usar ao criar o documento do utilizador no Firestore.
let pendingName = null
export const setPendingName = (n) => { pendingName = n || null }
export const getPendingName = () => pendingName

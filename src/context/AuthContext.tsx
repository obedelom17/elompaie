import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authClient } from '../lib/auth-client'

interface OrgInfo { id: string; name: string }
interface UserInfo { id: string; email: string; name?: string }
interface AuthContextType {
  user: UserInfo | null
  org: OrgInfo | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function loadOrg(): Promise<OrgInfo | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return data.org || null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authClient.getSession().then(async ({ data }: any) => {
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
        setOrg(await loadOrg())
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authClient.signIn.email({ email, password, fetchOptions: { credentials: 'include' } }) as any
    if (error) return { error: error.message || 'Email ou mot de passe incorrect' }
    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
      setOrg(await loadOrg())
    }
    return { error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      // 1. Créer le compte
      const { error } = await authClient.signUp.email({
        email, password, name: email.split('@')[0],
        fetchOptions: { credentials: 'include' }
      }) as any
      if (error) return { error: error.message }

      // 2. Se connecter pour obtenir la session cookie
      const { data: signInData, error: signInError } = await authClient.signIn.email({
        email, password, fetchOptions: { credentials: 'include' }
      }) as any
      if (signInError) return { error: signInError.message }
      if (signInData?.user) setUser({ id: signInData.user.id, email: signInData.user.email })

      // 3. Créer l'organisation (le cookie est maintenant envoyé automatiquement)
      const orgRes = await fetch('/api/auth/signup-org', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName }),
      })
      const orgData = await orgRes.json()
      if (!orgRes.ok) return { error: orgData.error || 'Erreur création organisation' }

      setOrg(orgData.org)
      return { error: null }
    } catch (e: any) { return { error: e.message } }
  }

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { credentials: 'include' } })
    setUser(null); setOrg(null)
  }

  return (
    <AuthContext.Provider value={{ user, org, loading, signIn, signUp, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

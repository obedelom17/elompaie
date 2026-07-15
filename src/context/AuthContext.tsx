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

async function fetchOrg(): Promise<OrgInfo | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return data.org || null
  } catch { return null }
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function createOrg(orgName: string, retries = 3): Promise<OrgInfo> {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await sleep(800 * i)
    const res = await fetch('/api/auth/signup-org', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName }),
    })
    const data = await res.json()
    if (res.ok) return data.org
    if (i === retries - 1) throw new Error(data.error || 'Erreur création organisation')
  }
  throw new Error('Erreur création organisation')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authClient.getSession()
      .then(async ({ data }: any) => {
        if (data?.user) {
          setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
          setOrg(await fetchOrg())
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await (authClient as any).signIn.email({ email, password })
    if (error) return { error: error.message || 'Email ou mot de passe incorrect' }
    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
      setOrg(await fetchOrg())
    }
    return { error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      // 1. Inscription
      const { error } = await (authClient as any).signUp.email({
        email,
        password,
        name: orgName, // nom du cabinet comme nom d'utilisateur
      })
      if (error) return { error: error.message }

      // 2. Connexion
      const { data, error: signInError } = await (authClient as any).signIn.email({ email, password })
      if (signInError) return { error: signInError.message }
      if (data?.user) setUser({ id: data.user.id, email: data.user.email, name: data.user.name })

      // 3. Attendre que le cookie soit bien posé, puis créer l'org avec retry
      await sleep(500)
      const newOrg = await createOrg(orgName)
      setOrg(newOrg)
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  const handleSignOut = async () => {
    await (authClient as any).signOut()
    setUser(null)
    setOrg(null)
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

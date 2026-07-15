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
  refreshOrg: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchMe(): Promise<{ user: UserInfo | null; org: OrgInfo | null }> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) return { user: null, org: null }
    const data = await res.json()
    return {
      user: data.userId ? { id: data.userId, email: data.email } : null,
      org: data.org || null,
    }
  } catch { return { user: null, org: null } }
}

async function createOrg(orgName: string, retries = 4): Promise<OrgInfo | null> {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await sleep(1000 * i)
    try {
      const res = await fetch('/api/auth/signup-org', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName }),
      })
      const data = await res.json()
      if (res.ok && data.org) return data.org
      console.warn(`[signup-org] tentative ${i + 1}:`, data.error)
    } catch (e) {
      console.warn(`[signup-org] tentative ${i + 1} exception:`, e)
    }
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshOrg = async () => {
    const me = await fetchMe()
    if (me.org) setOrg(me.org)
  }

  useEffect(() => {
    fetchMe().then(me => {
      if (me.user) { setUser(me.user); setOrg(me.org) }
    }).finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await (authClient as any).signIn.email({ email, password })
    if (error) return { error: error.message || 'Email ou mot de passe incorrect' }
    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email })
      await sleep(300)
      const me = await fetchMe()
      setOrg(me.org)
    }
    return { error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      const { error } = await (authClient as any).signUp.email({
        email, password, name: orgName,
      })
      if (error) return { error: error.message }

      // Connexion
      await sleep(300)
      const { data, error: signInError } = await (authClient as any).signIn.email({ email, password })
      if (signInError) return { error: signInError.message }
      if (data?.user) setUser({ id: data.user.id, email: data.user.email })

      // Créer org avec retry
      await sleep(500)
      const newOrg = await createOrg(orgName)
      if (newOrg) setOrg(newOrg)
      else console.error('[signUp] org non créée après 4 tentatives')

      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  const handleSignOut = async () => {
    await (authClient as any).signOut()
    setUser(null); setOrg(null)
  }

  return (
    <AuthContext.Provider value={{ user, org, loading, signIn, signUp, signOut: handleSignOut, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

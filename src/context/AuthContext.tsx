import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface OrgInfo { id: string; name: string }
interface AuthContextType {
  user: User | null; session: Session | null; org: OrgInfo | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrg = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('organization_id, organizations(id, name)')
      .eq('id', userId)
      .maybeSingle()
    if (data?.organizations) {
      const o = data.organizations as any
      setOrg({ id: o.id, name: o.name })
    } else setOrg(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null)
      if (session?.user) fetchOrg(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session); setUser(session?.user ?? null)
      if (session?.user) fetchOrg(session.user.id)
      else { setOrg(null) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    // Inscription native Supabase (pas de Edge Function)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { org_name: orgName } }
    })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Erreur création compte' }
    // Le trigger SQL crée automatiquement organization + profile
    return { error: null }
  }

  const signOut = async () => { await supabase.auth.signOut(); setOrg(null) }

  return (
    <AuthContext.Provider value={{ user, session, org, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

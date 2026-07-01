import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface OrgInfo { id: string; name: string; role: string }
interface AuthContextType { user: User | null; session: Session | null; org: OrgInfo | null; loading: boolean; signIn: (email: string, password: string) => Promise<{ error: string | null }>; signUp: (email: string, password: string, orgName: string) => Promise<{ error: string | null }>; signOut: () => Promise<void> }

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrg = async (userId: string) => {
    const { data } = await supabase.from('organization_members').select('organization_id, role, organizations(id, name)').eq('user_id', userId).maybeSingle()
    if (data?.organizations) setOrg({ id: (data.organizations as any).id, name: (data.organizations as any).name, role: data.role })
    else setOrg(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null)
      if (session?.user) fetchOrg(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session); setUser(session?.user ?? null)
      if (session?.user) { (async () => { await fetchOrg(session.user.id) })() }
      else setOrg(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    // Use admin edge function to create user, bypassing Supabase password strength check
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok || json.error) return { error: json.error || 'Erreur lors de la création du compte' }

    // Sign in to get a session
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) return { error: signInError?.message || 'Connexion échouée après inscription' }

    const { data: orgData, error: orgError } = await supabase.from('organizations').insert({ name: orgName }).select().single()
    if (orgError || !orgData) return { error: 'Erreur lors de la création du cabinet' }
    const { error: memberError } = await supabase.from('organization_members').insert({ organization_id: orgData.id, user_id: data.user.id, role: 'admin' })
    if (memberError) return { error: 'Erreur lors de l\'association au cabinet' }
    setOrg({ id: orgData.id, name: orgData.name, role: 'admin' })
    return { error: null }
  }

  const signOut = async () => { await supabase.auth.signOut(); setOrg(null) }

  return <AuthContext.Provider value={{ user, session, org, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

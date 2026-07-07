import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '../lib/api'

interface OrgInfo { id: string; name: string }
interface UserInfo { id: string; email: string }
interface AuthContextType {
  user: UserInfo | null
  org: OrgInfo | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('auth_user')
    const orgData = localStorage.getItem('auth_org')
    if (token && userData && orgData) {
      try {
        setUser(JSON.parse(userData))
        setOrg(JSON.parse(orgData))
      } catch { clearAuth() }
    }
    setLoading(false)
  }, [])

  function clearAuth() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_org')
    setUser(null); setOrg(null)
  }

  function saveAuth(token: string, user: UserInfo, org: OrgInfo) {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_org', JSON.stringify(org))
    setUser(user); setOrg(org)
  }

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authApi.signIn(email, password)
      saveAuth(data.token, data.user, data.org)
      return { error: null }
    } catch (e: any) { return { error: e.message } }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      const data = await authApi.signUp(email, password, orgName)
      saveAuth(data.token, data.user, data.org)
      return { error: null }
    } catch (e: any) { return { error: e.message } }
  }

  const signOut = () => clearAuth()

  return (
    <AuthContext.Provider value={{ user, org, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

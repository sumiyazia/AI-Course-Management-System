'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const t = Cookies.get('token')
    const u = Cookies.get('user')
    if (t && u) {
      try {
        setToken(t)
        setUser(JSON.parse(u))
      } catch {}
    }
    setIsLoading(false)
  }, [])

  const login = (token: string, userData: User) => {
    Cookies.set('token', token, { expires: 7 })
    Cookies.set('user', JSON.stringify(userData), { expires: 7 })
    setToken(token)
    setUser(userData)
  }

  const logout = () => {
    Cookies.remove('token')
    Cookies.remove('user')
    setToken(null)
    setUser(null)
    window.location.href = '/auth/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

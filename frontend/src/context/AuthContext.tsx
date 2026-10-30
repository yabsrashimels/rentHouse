import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services'
import { getRealtimeSocket } from '../services/realtime'

export interface User {
  id: string
  fullName: string
  email: string
  phone: string
  role: 'TENANT' | 'OWNER' | 'ADMIN'
  accountStatus: string
  telegram?: string
  instagram?: string
  profileImageUrl?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  becomeHost: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe()
      setUser(userData)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const { user: userData } = await authService.login({ email, password })
    setUser(userData)
  }

  const register = async (data: any) => {
    const { user: userData } = await authService.register(data)
    setUser(userData)
  }

  const becomeHost = useCallback(async () => {
    const userData = await authService.becomeHost()
    setUser(userData)
  }, [])

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      getRealtimeSocket().disconnect()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      becomeHost,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

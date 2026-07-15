import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AdminRole } from '../types/admin'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  isAdmin: boolean
  adminRole: AdminRole | null
  adminLoading: boolean
  signInWithKakao: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      setError(sessionError?.message ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      error,
      async signInWithKakao() {
        if (!supabase) {
          setError('Supabase 환경변수가 설정되지 않았습니다.')
          return
        }

        setError(null)
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'kakao',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              scope: 'profile_nickname profile_image',
            },
          },
        })

        if (signInError) setError(signInError.message)
      },
      async signOut() {
        if (!supabase) return
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) setError(signOutError.message)
      },
    }),
    [error, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

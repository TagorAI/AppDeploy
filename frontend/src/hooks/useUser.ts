import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Profile {
  age: number
  // add other profile fields you need
}

export function useUser() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const { data: { user } } = supabase.auth.getUser()
    setUser(user)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })

    // Fetch initial profile if user exists
    if (user) {
      fetchProfile(user.id)
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return { user, profile, loading }
} 
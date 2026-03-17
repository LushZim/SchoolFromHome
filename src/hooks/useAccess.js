import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LEVEL_ORDER = ['student', 'teacher', 'admin']

function isAtLeast(current, required) {
  return LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required)
}

export function useAccess() {
  // undefined = loading, null = no access (show landing), string = 'student'|'teacher'|'admin'
  const [accessLevel, setAccessLevel] = useState(undefined)
  const [publicSettings, setPublicSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPublicSettings = useCallback(async () => {
    const { data } = await supabase.rpc('get_public_settings')
    if (data) setPublicSettings(data)
  }, [])

  const initAccess = useCallback(async () => {
    try {
      // 1. Ensure we have a Supabase session (anonymous if needed)
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        session = data.session
      }

      // 2. Check stored access level in localStorage
      const stored = localStorage.getItem('access_level')

      if (stored && LEVEL_ORDER.includes(stored)) {
        // 3. Validate with backend: check user_access table
        const { data: row } = await supabase
          .from('user_access')
          .select('access_level')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (row && LEVEL_ORDER.includes(row.access_level)) {
          // Use the DB value (source of truth), update localStorage if different
          const dbLevel = row.access_level
          // Use the higher of stored vs DB (DB is authoritative)
          const effective = isAtLeast(dbLevel, stored) ? dbLevel : stored
          localStorage.setItem('access_level', effective)
          setAccessLevel(effective)
        } else {
          // No DB record — clear localStorage and require re-entry
          localStorage.removeItem('access_level')
          setAccessLevel(null)
        }
      } else {
        setAccessLevel(null)
      }

      // 4. Load public settings (code_required flags)
      await fetchPublicSettings()
    } catch (err) {
      console.error('Access init error:', err)
      setAccessLevel(null)
    } finally {
      setLoading(false)
    }
  }, [fetchPublicSettings])

  useEffect(() => {
    initAccess()
  }, [initAccess])

  // Call this with a code — returns the new access level or throws on failure
  const verifyCode = useCallback(async (code) => {
    const { data, error } = await supabase.rpc('verify_access_code', { code })
    if (error) throw new Error(error.message || 'קוד שגוי')
    const newLevel = data
    localStorage.setItem('access_level', newLevel)
    setAccessLevel(newLevel)
    return newLevel
  }, [])

  // Call this when code is not required — grants access via backend without a code
  const requestFreeAccess = useCallback(async (roleType) => {
    const { data, error } = await supabase.rpc('request_free_access', { role_type: roleType })
    if (error) throw new Error(error.message)
    localStorage.setItem('access_level', data)
    setAccessLevel(data)
    return data
  }, [])

  // Clear access (reset to landing page)
  const clearAccess = useCallback(() => {
    localStorage.removeItem('access_level')
    setAccessLevel(null)
  }, [])

  return {
    accessLevel,
    loading,
    publicSettings,
    verifyCode,
    requestFreeAccess,
    clearAccess,
    isAtLeast: (required) => accessLevel && isAtLeast(accessLevel, required),
  }
}

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  sysName:      'YouthLink — Barangay Bakakeng Central SK',
  barangay:     'Bakakeng Central, Baguio City',
  logoUrl:      '/SK_Logo.png',
  primaryColor: '#1A365D',
  accentColor:  '#D69E2E',
  primaryLt:    '#2A4A7F',
}

const Ctx = createContext({ settings: DEFAULTS, updateSettings: () => {} })
export const useSiteSettings = () => useContext(Ctx)

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('site_settings')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  const applySettings = (raw) => {
    // Extract only the flat site settings fields — the nested 'theme' object
    // is handled exclusively by ThemeContext to avoid conflicts.
    const { theme: _ignored, ...flatSettings } = raw || {}
    const merged = { ...DEFAULTS, ...flatSettings }
    setSettings(merged)
    localStorage.setItem('site_settings', JSON.stringify(merged))
  }

  useEffect(() => {
    // Initial load from Supabase
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
        if (!error && data?.settings) applySettings(data.settings)
      } catch(e) { console.error('SiteSettings load error:', e) }
    }
    load()

    // Realtime — listen to both INSERT and UPDATE so upsert always triggers
    const channel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', {
        event: '*',  // catches INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'site_settings',
      }, (payload) => {
        const s = payload.new?.settings
        if (s) applySettings(s)
      })
      .subscribe((status) => {
        console.log('SiteSettings realtime:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateSettings = async (patch) => {
    // Optimistic local update immediately
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('site_settings', JSON.stringify(next))
      return next
    })
    // Persist to Supabase
    try {
      const { data: current } = await supabase
        .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
      const existing = current?.settings || {}
      // Preserve any existing 'theme' sub-object when saving flat site settings
      const { theme: existingTheme } = existing
      const { theme: _patchTheme, ...flatPatch } = patch
      const { error } = await supabase.from('site_settings').upsert(
        { id: 'global', settings: { ...existing, ...flatPatch, ...(existingTheme ? { theme: existingTheme } : {}) }, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (error) console.error('SiteSettings save error:', error)
    } catch(e) { console.error('SiteSettings save failed:', e) }
  }

  return <Ctx.Provider value={{ settings, updateSettings }}>{children}</Ctx.Provider>
}

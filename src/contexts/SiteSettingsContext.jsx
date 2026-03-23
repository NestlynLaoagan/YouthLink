import React, { createContext, useContext, useState, useEffect } from 'react'

const DEFAULTS = {
  sysName:    'YouthLink — Barangay Bakakeng Central SK',
  barangay:   'Bakakeng Central, Baguio City',
  logoUrl:    '/SK_Logo.png',       // public logo path or base64
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

  const updateSettings = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('site_settings', JSON.stringify(next))
      return next
    })
  }

  return <Ctx.Provider value={{ settings, updateSettings }}>{children}</Ctx.Provider>
}

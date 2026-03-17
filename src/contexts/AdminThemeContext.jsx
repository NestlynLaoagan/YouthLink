import React, { createContext, useContext, useState } from 'react'

export const ADMIN_LIGHT = {
  bg:        '#F7FAFC',
  surface:   '#FFFFFF',
  surface2:  '#EDF2F7',
  border:    '#E2E8F0',
  text:      '#2D3748',
  textMuted: '#718096',
  navy:      '#1A365D',
  crimson:   '#C53030',
  gold:      '#D69E2E',
  btnNavy:   '#1A365D',
  tableHd:   '#F7FAFC',
  tableHover:'#FAFBFF',
  badgeBl:   { bg:'#EBF8FF',  color:'#1A365D' },
  badgeGr:   { bg:'#F0FFF4',  color:'#276749' },
  badgeRd:   { bg:'#FFF5F5',  color:'#C53030' },
  badgeGy:   { bg:'#F7FAFC',  color:'#718096' },
  badgeGd:   { bg:'#FEF9E7',  color:'#7B4800' },
}

export const ADMIN_DARK = {
  bg:        '#0F172A',
  surface:   '#1E293B',
  surface2:  '#334155',
  border:    '#334155',
  text:      '#F1F5F9',
  textMuted: '#94A3B8',
  navy:      '#60A5FA',
  crimson:   '#F87171',
  gold:      '#FBBF24',
  btnNavy:   '#60A5FA',
  tableHd:   '#1E293B',
  tableHover:'#334155',
  badgeBl:   { bg:'#1E3A5F',  color:'#93C5FD' },
  badgeGr:   { bg:'#14532D',  color:'#86EFAC' },
  badgeRd:   { bg:'#7F1D1D',  color:'#FCA5A5' },
  badgeGy:   { bg:'#1E293B',  color:'#94A3B8' },
  badgeGd:   { bg:'#422006',  color:'#FDE68A' },
}

const Ctx = createContext({ T: ADMIN_LIGHT, dark: false, setDark: () => {} })
export const useAdminTheme = () => useContext(Ctx)

export function AdminThemeProvider({ children }) {
  const [dark, setDark] = useState(false)
  const T = dark ? ADMIN_DARK : ADMIN_LIGHT
  return <Ctx.Provider value={{ T, dark, setDark }}>{children}</Ctx.Provider>
}

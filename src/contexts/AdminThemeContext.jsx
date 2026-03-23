import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ── Preset palettes ── */
export const PALETTES = {
  navy: {
    label: 'Navy Blue (Default)',
    light: { navy:'#1A365D', navyLt:'#2A4A7F', accent:'#D69E2E', accentLt:'#F6E05E' },
    dark:  { navy:'#60A5FA', navyLt:'#93C5FD',  accent:'#FBBF24', accentLt:'#FDE68A' },
  },
  emerald: {
    label: 'Emerald Green',
    light: { navy:'#065F46', navyLt:'#047857', accent:'#D97706', accentLt:'#FCD34D' },
    dark:  { navy:'#34D399', navyLt:'#6EE7B7', accent:'#FBBF24', accentLt:'#FDE68A' },
  },
  violet: {
    label: 'Royal Violet',
    light: { navy:'#4C1D95', navyLt:'#6D28D9', accent:'#DB2777', accentLt:'#F472B6' },
    dark:  { navy:'#A78BFA', navyLt:'#C4B5FD', accent:'#F472B6', accentLt:'#FBCFE8' },
  },
  slate: {
    label: 'Slate Gray',
    light: { navy:'#1E293B', navyLt:'#334155', accent:'#0EA5E9', accentLt:'#7DD3FC' },
    dark:  { navy:'#94A3B8', navyLt:'#CBD5E0', accent:'#38BDF8', accentLt:'#BAE6FD' },
  },
  rose: {
    label: 'Deep Rose',
    light: { navy:'#9F1239', navyLt:'#BE123C', accent:'#D97706', accentLt:'#FCD34D' },
    dark:  { navy:'#FB7185', navyLt:'#FDA4AF', accent:'#FBBF24', accentLt:'#FDE68A' },
  },
}

function makeTheme(palette, isDark) {
  const p = PALETTES[palette] || PALETTES.navy
  const colors = isDark ? p.dark : p.light
  if (isDark) return {
    bg:'#0F172A', surface:'#1E293B', surface2:'#334155', border:'#334155',
    text:'#F1F5F9', textMuted:'#94A3B8', navy:colors.navy, navyLt:colors.navyLt,
    crimson:'#F87171', gold:colors.accent, btnNavy:colors.navy,
    tableHd:'#1E293B', tableHover:'#334155',
    badgeBl:{ bg:'#1E3A5F', color:'#93C5FD' }, badgeGr:{ bg:'#14532D', color:'#86EFAC' },
    badgeRd:{ bg:'#7F1D1D', color:'#FCA5A5' }, badgeGy:{ bg:'#1E293B', color:'#94A3B8' },
    badgeGd:{ bg:'#422006', color:'#FDE68A' },
  }
  return {
    bg:'#F7FAFC', surface:'#FFFFFF', surface2:'#EDF2F7', border:'#E2E8F0',
    text:'#2D3748', textMuted:'#718096', navy:colors.navy, navyLt:colors.navyLt,
    crimson:'#C53030', gold:colors.accent, btnNavy:colors.navy,
    tableHd:'#F7FAFC', tableHover:'#FAFBFF',
    badgeBl:{ bg:'#EBF8FF', color:colors.navy }, badgeGr:{ bg:'#F0FFF4', color:'#276749' },
    badgeRd:{ bg:'#FFF5F5', color:'#C53030' }, badgeGy:{ bg:'#F7FAFC', color:'#718096' },
    badgeGd:{ bg:'#FEF9E7', color:'#7B4800' },
  }
}

export const ADMIN_LIGHT = makeTheme('navy', false)
export const ADMIN_DARK  = makeTheme('navy', true)

const Ctx = createContext({ T: ADMIN_LIGHT, dark:false, setDark:()=>{}, palette:'navy', setPalette:()=>{}, navbarVisible:true, setNavbarVisible:()=>{} })
export const useAdminTheme = () => useContext(Ctx)

/* ── Write colors to Supabase site_settings ── */
async function persistColors(patch) {
  try {
    const { data: current } = await supabase
      .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
    const existing = current?.settings || {}
    const { error } = await supabase.from('site_settings').upsert(
      { id: 'global', settings: { ...existing, ...patch }, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) console.error('AdminTheme sync error:', error)
  } catch(e) { console.error('AdminTheme sync failed:', e) }
}

export function AdminThemeProvider({ children }) {
  const [dark,          setDark]         = useState(() => localStorage.getItem('admin_dark') === 'true')
  const [palette,       setPaletteState] = useState(() => localStorage.getItem('admin_palette') || 'navy')
  const [navbarVisible, setNavbarVisible]= useState(() => localStorage.getItem('admin_navbar') !== 'false')
  const [customColors,  setCustomColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_custom_colors') || 'null') } catch { return null }
  })

  /* On mount: pull latest colors from Supabase and apply to admin dashboard */
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
        if (error || !data?.settings) return
        const s = data.settings
        if (!s.primaryColor) return
        const matched = Object.entries(PALETTES).find(
          ([, p]) => p.light.navy === s.primaryColor && p.light.accent === s.accentColor
        )
        if (matched) {
          setPaletteState(matched[0])
          localStorage.setItem('admin_palette', matched[0])
          setCustomColors(null)
          localStorage.removeItem('admin_custom_colors')
        } else {
          const custom = { primary: s.primaryColor, primaryLt: s.primaryLt || s.primaryColor, accent: s.accentColor }
          setCustomColors(custom)
          localStorage.setItem('admin_custom_colors', JSON.stringify(custom))
        }
      } catch(e) { console.error('AdminTheme load error:', e) }
    }
    load()
  }, [])

  const setPalette = (p) => {
    setPaletteState(p)
    localStorage.setItem('admin_palette', p)
    setCustomColors(null)
    localStorage.removeItem('admin_custom_colors')
    const pal = PALETTES[p]
    if (pal) persistColors({
      primaryColor: pal.light.navy,
      primaryLt:    pal.light.navyLt,
      accentColor:  pal.light.accent,
    })
  }

  const toggleDark    = (v) => { setDark(v);           localStorage.setItem('admin_dark',    String(v)) }
  const toggleNavbar  = (v) => { setNavbarVisible(v);  localStorage.setItem('admin_navbar',  String(v)) }

  const saveCustomColors = (colors) => {
    if (colors) {
      setCustomColors(colors)
      localStorage.setItem('admin_custom_colors', JSON.stringify(colors))
      persistColors({ primaryColor: colors.primary, primaryLt: colors.primaryLt, accentColor: colors.accent })
    } else {
      setCustomColors(null)
      localStorage.removeItem('admin_custom_colors')
    }
  }

  const T = customColors
    ? { ...makeTheme(palette, dark), navy: customColors.primary, gold: customColors.accent, navyLt: customColors.primaryLt }
    : makeTheme(palette, dark)

  return (
    <Ctx.Provider value={{ T, dark, setDark:toggleDark, palette, setPalette, navbarVisible, setNavbarVisible:toggleNavbar, customColors, saveCustomColors, PALETTES }}>
      {children}
    </Ctx.Provider>
  )
}

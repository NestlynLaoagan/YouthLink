/**
 * ThemeContext.jsx  (UPDATED)
 * ─────────────────────────────────────────────────────────────────
 * System-wide Theme Context — Admin ↔ User Portal sync.
 *
 * Key changes vs previous version:
 *  • Uses --color-* CSS variables that match tailwind.config.js
 *  • Initialises with the EXACT spec palette:
 *      Branding Primary  #1A365D / #60A5FA
 *      CTA Secondary     #C53030 / #F87171
 *      Accents           #D69E2E / #FBBF24
 *      Background        #F7FAFC / #0F172A
 *      Surfaces/Cards    #FFFFFF / #1E293B
 *      Body Text         #2D3748 / #E2E8F0
 *  • Injects a 200ms CSS transition on every variable so colour
 *    changes animate smoothly across the whole portal.
 *  • Exports QUICK_PRESETS (the six colour-swatch rows in the
 *    Admin Home panel) built from the same spec palette.
 * ─────────────────────────────────────────────────────────────────
 * Place at: src/contexts/ThemeContext.jsx
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react'
import { supabase } from '../lib/supabase'

// ─── GOOGLE FONTS ─────────────────────────────────────────────────
export const FONT_OPTIONS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Default)', weights: '400;500;600;700;800;900' },
  { value: 'Inter',             label: 'Inter',                        weights: '400;500;600;700' },
  { value: 'Poppins',          label: 'Poppins',                      weights: '400;500;600;700;800' },
  { value: 'DM Sans',          label: 'DM Sans',                      weights: '400;500;600;700' },
  { value: 'Nunito',           label: 'Nunito',                       weights: '400;600;700;800;900' },
  { value: 'Lato',             label: 'Lato',                         weights: '400;700;900' },
  { value: 'Manrope',          label: 'Manrope',                      weights: '400;500;600;700;800' },
  { value: 'Outfit',           label: 'Outfit',                       weights: '400;500;600;700;800' },
]

// ─── QUICK PRESETS (colour swatches shown in Admin Home) ──────────
// Each preset carries separate light / dark hex pairs so the panel
// can display both columns from the spec.
export const QUICK_PRESETS = {
  navy: {
    label: '🏛️ Barangay Official',
    light: { primary: '#1A365D', secondary: '#C53030', accent: '#D69E2E', bg: '#F7FAFC', surface: '#FFFFFF', text: '#2D3748' },
    dark:  { primary: '#60A5FA', secondary: '#F87171', accent: '#FBBF24', bg: '#0F172A', surface: '#1E293B', text: '#E2E8F0' },
  },
  emerald: {
    label: '🌿 Emerald Green',
    light: { primary: '#065F46', secondary: '#C53030', accent: '#D97706', bg: '#F0FDF4', surface: '#FFFFFF', text: '#1F2937' },
    dark:  { primary: '#34D399', secondary: '#F87171', accent: '#FBBF24', bg: '#022C22', surface: '#064E3B', text: '#E2E8F0' },
  },
  violet: {
    label: '💜 Royal Violet',
    light: { primary: '#4C1D95', secondary: '#DB2777', accent: '#D69E2E', bg: '#FAF5FF', surface: '#FFFFFF', text: '#1F2937' },
    dark:  { primary: '#A78BFA', secondary: '#F472B6', accent: '#FBBF24', bg: '#1E1B4B', surface: '#2E1065', text: '#E2E8F0' },
  },
  slate: {
    label: '🩶 Slate Gray',
    light: { primary: '#1E293B', secondary: '#C53030', accent: '#0EA5E9', bg: '#F8FAFC', surface: '#FFFFFF', text: '#334155' },
    dark:  { primary: '#94A3B8', secondary: '#F87171', accent: '#38BDF8', bg: '#0F172A', surface: '#1E293B', text: '#CBD5E1' },
  },
  rose: {
    label: '🌹 Deep Rose',
    light: { primary: '#9F1239', secondary: '#D97706', accent: '#D69E2E', bg: '#FFF1F2', surface: '#FFFFFF', text: '#1F2937' },
    dark:  { primary: '#FB7185', secondary: '#FBBF24', accent: '#FDE68A', bg: '#4C0519', surface: '#881337', text: '#E2E8F0' },
  },
}

// ─── PRESET THEMES (full theme object for ThemeCustomization) ─────
export const THEME_PRESETS = {
  official: {
    label: '🏛️ Barangay Official',
    colors: {
      primaryColor:   '#1A365D',
      secondaryColor: '#C53030',
      bgColor:        '#F7FAFC',
      cardColor:      '#FFFFFF',
      sidebarColor:   '#0F2444',
      borderColor:    '#E2E8F0',
      headingColor:   '#1A365D',
      bodyColor:      '#2D3748',
      mutedColor:     '#718096',
      linkColor:      '#2979FF',
    },
  },
  emerald: {
    label: '🌿 Emerald Green',
    colors: {
      primaryColor:   '#065F46',
      secondaryColor: '#C53030',
      bgColor:        '#F0FDF4',
      cardColor:      '#FFFFFF',
      sidebarColor:   '#022C22',
      borderColor:    '#D1FAE5',
      headingColor:   '#064E3B',
      bodyColor:      '#1F2937',
      mutedColor:     '#6B7280',
      linkColor:      '#059669',
    },
  },
  violet: {
    label: '💜 Royal Violet',
    colors: {
      primaryColor:   '#4C1D95',
      secondaryColor: '#DB2777',
      bgColor:        '#FAF5FF',
      cardColor:      '#FFFFFF',
      sidebarColor:   '#2E1065',
      borderColor:    '#EDE9FE',
      headingColor:   '#4C1D95',
      bodyColor:      '#1F2937',
      mutedColor:     '#6B7280',
      linkColor:      '#7C3AED',
    },
  },
  rose: {
    label: '🌹 Deep Rose',
    colors: {
      primaryColor:   '#9F1239',
      secondaryColor: '#D97706',
      bgColor:        '#FFF1F2',
      cardColor:      '#FFFFFF',
      sidebarColor:   '#4C0519',
      borderColor:    '#FFE4E6',
      headingColor:   '#881337',
      bodyColor:      '#1F2937',
      mutedColor:     '#6B7280',
      linkColor:      '#E11D48',
    },
  },
}

// ─── SPEC-COMPLIANT DEFAULT THEME ────────────────────────────────
const DEFAULT_THEME = {
  // Colours — Light mode spec palette
  primaryColor:   '#1A365D',   // Branding (Primary) light
  secondaryColor: '#C53030',   // CTA Buttons (Secondary) light
  accentColor:    '#D69E2E',   // Accents light  ← NEW explicit field
  bgColor:        '#F7FAFC',   // Background light
  cardColor:      '#FFFFFF',   // Surfaces/Cards light
  sidebarColor:   '#0F2444',
  borderColor:    '#E2E8F0',
  headingColor:   '#1A365D',
  bodyColor:      '#2D3748',   // Body Text light
  mutedColor:     '#718096',
  linkColor:      '#2979FF',

  // Dark-mode overrides (stored separately so panel can show both columns)
  darkPrimaryColor:   '#60A5FA',
  darkSecondaryColor: '#F87171',
  darkAccentColor:    '#FBBF24',
  darkBgColor:        '#0F172A',
  darkCardColor:      '#1E293B',
  darkBodyColor:      '#E2E8F0',

  // Fonts
  fontFamily:    'Plus Jakarta Sans',
  headingWeight: '700',

  // Background
  bgType:         'solid',
  bgGradientFrom: '#EEF2FF',
  bgGradientTo:   '#F5F7FB',
  bgImageUrl:     '',
  bgOverlay:      40,

  // UI Elements
  buttonStyle:  'rounded',
  buttonVariant:'filled',
  cardShadow:   'moderate',
  cardRadius:   12,
  sidebarStyle: 'dark',

  // Meta
  darkMode: false,
}

// ─── CSS VAR APPLICATION ─────────────────────────────────────────
// Called on every updateTheme() — writes both legacy vars (--navy,
// --crimson, --gold) AND the new --color-* vars that tailwind.config
// maps to utility classes.
function applyThemeToDom(theme) {
  const root = document.documentElement
  const dark = theme.darkMode

  // Resolve colour set for current mode
  const primary   = dark ? theme.darkPrimaryColor   || '#60A5FA' : theme.primaryColor
  const secondary = dark ? theme.darkSecondaryColor || '#F87171' : theme.secondaryColor
  const accent    = dark ? theme.darkAccentColor    || '#FBBF24' : (theme.accentColor || theme.secondaryColor)
  const bg        = dark ? theme.darkBgColor        || '#0F172A' : theme.bgColor
  const surface   = dark ? theme.darkCardColor      || '#1E293B' : theme.cardColor
  const text      = dark ? theme.darkBodyColor      || '#E2E8F0' : theme.bodyColor
  const textHead  = dark ? '#93C5FD' : theme.headingColor
  const textMuted = dark ? '#94A3B8' : theme.mutedColor

  // ── NEW: --color-* variables (used by tailwind.config.js) ──────
  root.style.setProperty('--color-primary',    primary)
  root.style.setProperty('--color-secondary',  secondary)
  root.style.setProperty('--color-accent',     accent)
  root.style.setProperty('--color-bg',         bg)
  root.style.setProperty('--color-surface',    surface)
  root.style.setProperty('--color-border',     dark ? '#334155' : theme.borderColor)
  root.style.setProperty('--color-text',       text)
  root.style.setProperty('--color-text-head',  textHead)
  root.style.setProperty('--color-text-muted', textMuted)

  // ── Legacy vars — keep existing components working unchanged ───
  root.style.setProperty('--primary',    primary)
  root.style.setProperty('--secondary',  secondary)
  root.style.setProperty('--link-color', theme.linkColor)
  root.style.setProperty('--border',     dark ? '#334155' : theme.borderColor)
  root.style.setProperty('--bg',         bg)
  root.style.setProperty('--surface',    surface)
  root.style.setProperty('--surface2',   dark ? '#334155' : '#EDF2F7')
  root.style.setProperty('--text',       text)
  root.style.setProperty('--text-heading', textHead)
  root.style.setProperty('--text-muted',   textMuted)
  root.style.setProperty('--text-subtle',  dark ? '#64748B' : '#A0AEC0')
  // Brand aliases
  root.style.setProperty('--navy',    primary)
  root.style.setProperty('--navy-lt', primary + 'CC')
  root.style.setProperty('--crimson', secondary)
  root.style.setProperty('--gold',    accent)

  // Sidebar
  if (theme.sidebarStyle === 'light') {
    root.style.setProperty('--sidebar-bg',   '#F8FAFC')
    root.style.setProperty('--sidebar-text', '#1A202C')
  } else if (theme.sidebarStyle === 'custom') {
    root.style.setProperty('--sidebar-bg',   theme.sidebarColor)
    root.style.setProperty('--sidebar-text', '#FFFFFF')
  } else {
    root.style.setProperty('--sidebar-bg',   dark ? '#0A1628' : theme.sidebarColor)
    root.style.setProperty('--sidebar-text', '#FFFFFF')
  }

  // Shadows
  const shadowMap = {
    none:     'none',
    low:      '0 1px 4px rgba(0,0,0,0.06)',
    moderate: '0 4px 20px rgba(0,0,0,0.08)',
    high:     '0 8px 32px rgba(0,0,0,0.14)',
  }
  root.style.setProperty('--shadow-sm', '0 1px 3px rgba(0,0,0,0.06)')
  root.style.setProperty('--shadow-md', shadowMap[theme.cardShadow] || shadowMap.moderate)
  root.style.setProperty('--shadow-lg', '0 8px 32px rgba(0,0,0,0.08)')
  root.style.setProperty('--shadow-xl', '0 16px 48px rgba(0,0,0,0.10)')

  // Radius
  root.style.setProperty('--radius-sm', `${Math.max(4, theme.cardRadius - 4)}px`)
  root.style.setProperty('--radius-md', `${theme.cardRadius}px`)
  root.style.setProperty('--radius-lg', `${theme.cardRadius + 4}px`)
  root.style.setProperty('--radius-xl', `${theme.cardRadius + 8}px`)

  // Font
  root.style.setProperty('--font-body',    `'${theme.fontFamily}', sans-serif`)
  root.style.setProperty('--font-heading', `'${theme.fontFamily}', sans-serif`)

  // Dark mode body class
  if (dark) document.body.classList.add('dark')
  else      document.body.classList.remove('dark')

  // Background (gradient / image)
  if (theme.bgType === 'gradient') {
    document.body.style.background = `linear-gradient(135deg, ${theme.bgGradientFrom}, ${theme.bgGradientTo})`
  } else if (theme.bgType === 'image' && theme.bgImageUrl) {
    document.body.style.background = `url(${theme.bgImageUrl}) center/cover no-repeat fixed`
  } else {
    document.body.style.background = ''
  }

  // ── SMOOTH TRANSITIONS ──────────────────────────────────────────
  // Injected once; every element transitions colours automatically.
  if (!document.getElementById('__theme-transition')) {
    const style = document.createElement('style')
    style.id = '__theme-transition'
    style.textContent = `
      *, *::before, *::after {
        transition:
          color            200ms cubic-bezier(0.4,0,0.2,1),
          background-color 200ms cubic-bezier(0.4,0,0.2,1),
          border-color     200ms cubic-bezier(0.4,0,0.2,1),
          box-shadow       200ms cubic-bezier(0.4,0,0.2,1),
          fill             200ms cubic-bezier(0.4,0,0.2,1);
      }
    `
    document.head.appendChild(style)
  }

  injectGoogleFont(theme.fontFamily)
}

const loadedFonts = new Set()
function injectGoogleFont(family) {
  if (loadedFonts.has(family)) return
  loadedFonts.add(family)
  const opt = FONT_OPTIONS.find(f => f.value === family)
  if (!opt) return
  const link = document.createElement('link')
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g,'+')}:wght@${opt.weights}&display=swap`
  document.head.appendChild(link)
}

// ─── CONTEXT ─────────────────────────────────────────────────────
const ThemeCtx = createContext({
  theme:        DEFAULT_THEME,
  pendingTheme: DEFAULT_THEME,
  updateTheme:  () => {},
  applyTheme:   () => {},
  saveTheme:    async () => {},
  resetTheme:   () => {},
  isDirty:      false,
  saving:       false,
})

export const useTheme = () => useContext(ThemeCtx)

// ─── PROVIDER ────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [theme,        setTheme]   = useState(DEFAULT_THEME)
  const [pendingTheme, setPending] = useState(DEFAULT_THEME)
  const [saving,       setSaving]  = useState(false)

  // ── Hydrate from Supabase on mount ────────────────────────────
  useEffect(() => {
    // Instant load from localStorage so there's no flash
    try {
      const local = localStorage.getItem('portal_theme')
      if (local) {
        const parsed = { ...DEFAULT_THEME, ...JSON.parse(local) }
        setTheme(parsed); setPending(parsed); applyThemeToDom(parsed)
      } else {
        applyThemeToDom(DEFAULT_THEME)
      }
    } catch { applyThemeToDom(DEFAULT_THEME) }

    // Then pull latest from DB
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
        if (!error && data?.settings?.theme) {
          const saved = { ...DEFAULT_THEME, ...data.settings.theme }
          setTheme(saved); setPending(saved); applyThemeToDom(saved)
          localStorage.setItem('portal_theme', JSON.stringify(saved))
        }
      } catch(e) { console.error('ThemeContext load:', e) }
    })()

    // Realtime — when super admin saves, ALL open portals update live.
    // Uses BOTH postgres_changes (requires replication enabled) AND a
    // broadcast channel as a reliable fallback so sync always works.
    const applyFromPayload = (settingsObj) => {
      // Support both flat {theme:{...}} and flat theme object stored directly
      const t = settingsObj?.theme || settingsObj
      if (t && typeof t === 'object' && Object.keys(t).length > 0) {
        const merged = { ...DEFAULT_THEME, ...t }
        setTheme(merged); setPending(merged); applyThemeToDom(merged)
        localStorage.setItem('portal_theme', JSON.stringify(merged))
      }
    }

    const channel = supabase
      .channel('theme_realtime')
      // postgres_changes: fires if realtime replication is ON for site_settings
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'site_settings',
      }, (payload) => {
        applyFromPayload(payload.new?.settings)
      })
      // broadcast: admin explicitly pushes theme on save (always works, no replication needed)
      .on('broadcast', { event: 'theme_update' }, (payload) => {
        applyFromPayload(payload.payload)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Live preview — updates DOM instantly, no DB write
  const updateTheme = useCallback((patch) => {
    setPending(prev => {
      const next = { ...prev, ...patch }
      applyThemeToDom(next)
      return next
    })
  }, [])

  // Apply pending → committed theme (localStorage only, no DB)
  const applyTheme = useCallback(() => {
    setTheme(pendingTheme)
    applyThemeToDom(pendingTheme)
    localStorage.setItem('portal_theme', JSON.stringify(pendingTheme))
  }, [pendingTheme])

  // Save to Supabase (triggers realtime update on every open tab)
  const saveTheme = useCallback(async (themeToSave = pendingTheme) => {
    setSaving(true)
    setTheme(themeToSave)
    applyThemeToDom(themeToSave)
    localStorage.setItem('portal_theme', JSON.stringify(themeToSave))
    try {
      const { data: current } = await supabase
        .from('site_settings').select('settings').eq('id', 'global').maybeSingle()
      const existing = current?.settings || {}
      const { error } = await supabase.from('site_settings').upsert(
        { id: 'global', settings: { ...existing, theme: themeToSave }, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (error) throw error
      // Broadcast theme update to all connected clients as a reliable fallback
      await supabase.channel('theme_realtime').send({
        type: 'broadcast',
        event: 'theme_update',
        payload: { theme: themeToSave },
      })
    } catch(e) { console.error('Theme save error:', e) }
    setSaving(false)
  }, [pendingTheme])

  const resetTheme = useCallback(() => {
    setPending(DEFAULT_THEME)
    applyThemeToDom(DEFAULT_THEME)
  }, [])

  const isDirty = JSON.stringify(theme) !== JSON.stringify(pendingTheme)

  return (
    <ThemeCtx.Provider value={{
      theme, pendingTheme, updateTheme, applyTheme,
      saveTheme, resetTheme, isDirty, saving,
      DEFAULT_THEME, THEME_PRESETS, FONT_OPTIONS, QUICK_PRESETS,
    }}>
      {children}
    </ThemeCtx.Provider>
  )
}

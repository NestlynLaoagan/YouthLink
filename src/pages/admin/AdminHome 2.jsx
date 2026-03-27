/**
 * AdminHome.jsx  — REDESIGNED with 4-Tab Theme Customization
 * ─────────────────────────────────────────────────────────────────
 * Tab 1: Colors    — Global color rows (Light/Dark), Quick Presets
 * Tab 2: Fonts     — Font family cards, Base font color, Background
 *                    image upload, Overlay opacity, Heading weight,
 *                    Heading font color
 * Tab 3: Background — Color vs Image toggle, Color picker + presets,
 *                     Image upload, Overlay color, Opacity slider,
 *                     Applies-to / Sidebar toggle
 * Tab 4: UI Elements — Button shape/variant/preview, Card shadow/
 *                      radius/preview
 *
 * Live preview always visible on the right (sticky).
 * Apply & Sync saves to ThemeContext + SiteSettingsContext.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  ChevronRight, Palette, RotateCcw, Save, Check,
  ChevronDown, Zap, Monitor, ExternalLink, RefreshCw,
  Megaphone, Calendar, FolderOpen, Bell, Sun, Settings,
  LogOut, Home, MessageSquare, Type, Image, Layout,
  Upload, X, Circle, Square,
} from 'lucide-react'
import { supabase }            from '../../lib/supabase'
import { useAuth }             from '../../contexts/AuthContext'
import { useAdminTheme }       from '../../contexts/AdminThemeContext'
import { useTheme, THEME_PRESETS, FONT_OPTIONS } from '../../contexts/ThemeContext'
import { useSiteSettings }     from '../../contexts/SiteSettingsContext'
import { useNavigate }         from 'react-router-dom'

const MF = "'Montserrat','Plus Jakarta Sans',sans-serif"
const IF = "'Plus Jakarta Sans','Inter',sans-serif"

const SHADOW_MAP = {
  none:     'none',
  low:      '0 2px 6px rgba(0,0,0,.06)',
  moderate: '0 4px 16px rgba(0,0,0,.10)',
  high:     '0 8px 28px rgba(0,0,0,.18)',
}

// ─── REUSABLE: COLOR SWATCH INPUT ────────────────────────────────
function ColorSwatch({ value, onChange, size = 22 }) {
  const ref = useRef()
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => ref.current?.click()}
        style={{
          width: size, height: size, borderRadius: size / 3,
          background: value || '#000',
          border: '2px solid rgba(0,0,0,0.15)',
          cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,.15)',
        }}
      />
      <input
        ref={ref} type="color" value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
    </div>
  )
}

// ─── REUSABLE: COLOR FIELD ROW ───────────────────────────────────
function ColorFieldRow({ value, onChange, T }) {
  const ref = useRef()
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 9, padding: '7px 12px', cursor: 'pointer',
        transition: 'border-color .15s', flex: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6, background: value,
        border: `2px solid ${T.border}`, flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,.15)',
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'monospace', flex: 1 }}>
        {(value || '#000000').toUpperCase()}
      </span>
      <input
        ref={ref} type="color" value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      />
      <ChevronDown size={11} style={{ color: T.textMuted }} />
    </div>
  )
}

// ─── REUSABLE: LABELED COLOR FIELD ───────────────────────────────
function ColorField({ label, value, onChange, T }) {
  const ref = useRef()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <FieldLabel T={T}>{label}</FieldLabel>}
      <ColorFieldRow value={value} onChange={onChange} T={T} />
    </div>
  )
}

// ─── REUSABLE: FIELD LABEL ───────────────────────────────────────
function FieldLabel({ children, T, mb = 8 }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '.5px',
      fontFamily: IF, marginBottom: mb,
    }}>
      {children}
    </label>
  )
}

// ─── REUSABLE: TOGGLE GROUP ──────────────────────────────────────
function ToggleGroup({ options, value, onChange, T }) {
  return (
    <div style={{
      display: 'flex', background: T.surface2 || T.bg,
      border: `1.5px solid ${T.border}`, borderRadius: 10,
      overflow: 'hidden', padding: 3, gap: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '9px 10px', border: 'none', cursor: 'pointer',
            borderRadius: 8, fontSize: 12,
            fontWeight: value === opt.value ? 700 : 500,
            background: value === opt.value ? T.navy : 'transparent',
            color: value === opt.value ? 'white' : T.textMuted,
            transition: 'all .15s', fontFamily: IF,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          {opt.icon && <span>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── REUSABLE: TOGGLE SWITCH ─────────────────────────────────────
function ToggleSwitch({ value, onChange, T }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        cursor: 'pointer', background: value ? T.navy : T.border,
        position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3, left: value ? 23 : 3,
        transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

// ─── REUSABLE: SECTION CARD ──────────────────────────────────────
function Section({ icon: Icon, title, children, T, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`,
      marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${T.border}` : 'none',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${T.navy}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color: T.navy }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: MF, flex: 1, textAlign: 'left' }}>
          {title}
        </span>
        <ChevronRight size={14} style={{
          color: T.textMuted,
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform .2s',
        }} />
      </button>
      {open && <div style={{ padding: '20px 22px' }}>{children}</div>}
    </div>
  )
}

// ─── COLOUR SWATCH ROW (for Colors tab) ──────────────────────────
function ColorRow({ label, lightValue, darkValue, onLightChange, onDarkChange, T }) {
  const lightRef = useRef()
  const darkRef  = useRef()

  const Swatch = ({ value, inputRef, onChange }) => (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 9, padding: '8px 12px', flex: 1,
        transition: 'border-color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: value,
        border: `2px solid ${T.border}`, flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,.15)',
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'monospace', flex: 1 }}>
        {(value || '').toUpperCase()}
      </span>
      <ChevronDown size={11} style={{ color: T.textMuted }} />
      <input
        ref={inputRef} type="color" value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      />
    </div>
  )

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '185px 1fr 1fr',
      alignItems: 'center', gap: 10, padding: '10px 0',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 13, color: T.text, fontFamily: IF }}>{label}</span>
      <Swatch value={lightValue} inputRef={lightRef} onChange={onLightChange} />
      <Swatch value={darkValue}  inputRef={darkRef}  onChange={onDarkChange}  />
    </div>
  )
}

// ─── LIVE PREVIEW ─────────────────────────────────────────────────
function LivePreview({ pending, T: adminT }) {
  const p       = pending
  const primary = p.primaryColor   || '#1A365D'
  const accent  = p.accentColor    || p.secondaryColor || '#D69E2E'
  const crimson = p.secondaryColor || '#C53030'
  const fontFam = `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`
  const btnR    = (p.buttonStyle || 'rounded') === 'rounded' ? 20 : 6
  const cardR   = p.cardRadius ?? 12
  const cardSh  = SHADOW_MAP[p.cardShadow] || SHADOW_MAP.moderate
  const bgMode  = p.bgMode || 'color'

  const anns = [
    { tag: 'Notice',   title: 'Free Operation Tuli 2026',       date: 'Mar 2026' },
    { tag: 'Notice',   title: 'Barangay Clean-Up Drive 2026',   date: 'Mar 2026' },
    { tag: 'Training', title: 'SK Leadership Training Program',  date: 'Mar 2026' },
    { tag: 'Sports',   title: 'SK Liga 2026 Opening',            date: 'Mar 2026' },
  ]

  return (
    <div style={{
      position: 'sticky', top: 20,
      border: `2px solid ${adminT.border}`, borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.14)',
    }}>
      {/* Chrome bar */}
      <div style={{
        background: adminT.surface2, padding: '9px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${adminT.border}`,
      }}>
        <Monitor size={13} style={{ color: adminT.textMuted }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: adminT.textMuted, fontFamily: IF }}>
          Live Preview — User Portal
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>

      {/* Portal shell */}
      <div style={{ display: 'flex', height: 530, overflow: 'hidden', position: 'relative' }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: bgMode === 'image' && p.bgImageUrl ? `url(${p.bgImageUrl})` : "url('/login-bg.png')",
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: bgMode === 'image' && p.bgImageUrl && p.bgOverlayColor
            ? p.bgOverlayColor + Math.round((p.bgOpacity ?? 30) / 100 * 255).toString(16).padStart(2,'0')
            : 'rgba(247,250,252,0.85)',
        }} />

        {/* LEFT SIDEBAR */}
        <div style={{
          width: 128, flexShrink: 0, zIndex: 10, position: 'relative',
          background: 'rgba(12,30,68,0.97)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(212,175,55,0.1)',
        }}>
          <div style={{ padding: '13px 9px 9px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🏛️</div>
            <div>
              <div style={{ color: 'white', fontSize: 7, fontWeight: 800, letterSpacing: '.8px', fontFamily: fontFam, lineHeight: 1.2 }}>BAKAKENG CENTRAL</div>
              <div style={{ color: 'rgba(212,175,55,0.6)', fontSize: 6, letterSpacing: '1px' }}>Sangguniang Kabataan</div>
            </div>
          </div>
          <div style={{ margin: '7px 6px', padding: '5px 7px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#C53030,#9B2C2C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>S</div>
            <div><div style={{ color: 'white', fontSize: 8, fontWeight: 700 }}>SK Admin</div><div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 6 }}>skadmin@...</div></div>
          </div>
          <div style={{ padding: '2px 11px 4px' }}>
            <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Navigation</div>
          </div>
          <nav style={{ flex: 1, padding: '2px 5px' }}>
            {[
              { icon: Home,          label: 'Home',          active: true },
              { icon: Megaphone,     label: 'Announcements' },
              { icon: FolderOpen,    label: 'Projects' },
              { icon: Calendar,      label: 'Events' },
              { icon: MessageSquare, label: 'Feedback' },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px',
                borderRadius: 7, marginBottom: 2,
                background: active ? crimson : 'transparent',
                boxShadow: active ? '0 2px 8px rgba(197,48,48,0.3)' : 'none',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={9} style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)' }} />
                </div>
                <span style={{ fontSize: 8, color: active ? 'white' : 'rgba(255,255,255,0.55)', fontWeight: active ? 700 : 400, fontFamily: fontFam }}>{label}</span>
                {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />}
              </div>
            ))}
          </nav>
          <div style={{ padding: '5px 5px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ icon: Sun, label: 'Dark Mode' }, { icon: Settings, label: 'Settings' }, { icon: LogOut, label: 'Log Out', red: true }].map(({ icon: Icon, label, red }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', marginBottom: 1 }}>
                <div style={{ width: 17, height: 17, borderRadius: 4, background: red ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={8} style={{ color: red ? 'rgba(248,113,113,0.75)' : 'rgba(255,255,255,0.45)' }} />
                </div>
                <span style={{ fontSize: 7.5, color: red ? 'rgba(248,113,113,0.75)' : 'rgba(255,255,255,0.45)', fontFamily: fontFam }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 5 }}>
          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(214,158,46,0.95)', letterSpacing: '2px', textTransform: 'uppercase' }}>Saturday</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontFamily: fontFam }}>March 28, 2026</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={12} style={{ color: '#2D3748' }} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', padding: '8px 10px 0' }}>
            {/* Center */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', paddingRight: 9, paddingBottom: 8 }}>
              <div>
                <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(214,158,46,0.9)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 3 }}>SANGGUNIANG KABATAAN — BAKAKENG CENTRAL</div>
                <div style={{ fontSize: 10.5, fontWeight: 900, color: 'white', fontFamily: fontFam, textTransform: 'uppercase', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>
                  WELCOME TO THE SK PORTAL OF{' '}
                  <span style={{ color: accent }}>BARANGAY BAKAKENG CENTRAL!</span>
                </div>
              </div>

              {/* Hero */}
              <div style={{
                borderRadius: cardR, overflow: 'hidden', height: 130, flexShrink: 0,
                background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 60%,#1A365D 100%)',
                boxShadow: cardSh, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 9, left: 11, background: 'rgba(16,185,129,0.92)', color: 'white', fontSize: 6.5, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 10 }}>✦ ACCOMPLISHED</div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 13px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 900, color: 'white', fontFamily: fontFam, lineHeight: 1.2, marginBottom: 4 }}>SK Tech4Youth Innovation Project</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.75)' }}>📅 January 10, 2026</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: '#FBBF24' }}>₱45,000</span>
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 7, right: 10, display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: i===0?12:4, height: 4, borderRadius: 2, background: i===0?'white':'rgba(255,255,255,0.4)' }} />)}
                </div>
              </div>

              {/* Events header */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 2.5, height: 12, borderRadius: 2, background: accent }} />
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: 'white', fontFamily: fontFam, textTransform: 'uppercase', letterSpacing: '.5px', textShadow: '0 1px 4px rgba(0,0,0,.4)' }}>Events — March 2026</span>
                    <div style={{ background: 'rgba(214,158,46,0.2)', color: accent, fontSize: 7, fontWeight: 800, padding: '1px 5px', borderRadius: 8, border: `1px solid ${accent}30` }}>2</div>
                  </div>
                  <span style={{ fontSize: 7.5, color: accent, fontWeight: 700 }}>View All →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {[
                    { label: 'Creative Arts & Music Workshop',    date: 'Tue, Mar 10 · 05:00 PM', bg: '#4ADE80' },
                    { label: 'Senior Basketball League: Final Round Robin', date: 'Sun, Mar 22 · 09:00 PM', bg: '#60A5FA' },
                  ].map((ev, i) => (
                    <div key={i} style={{ borderRadius: cardR * 0.7, overflow: 'hidden', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', boxShadow: cardSh, backdropFilter: 'blur(12px)' }}>
                      <div style={{ height: 46, background: `linear-gradient(135deg,rgba(26,54,93,0.85),rgba(10,25,60,0.7))`, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 4, left: 5, background: ev.bg, color: 'white', fontSize: 5.5, fontWeight: 800, padding: '1px 5px', borderRadius: 7 }}>UPCOMING</div>
                      </div>
                      <div style={{ padding: '5px 7px' }}>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: 'white', lineHeight: 1.3, marginBottom: 2, fontFamily: fontFam }}>{ev.label}</div>
                        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.6)' }}>📅 {ev.date}</div>
                        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.5)' }}>📍 Barangay Covered Court</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', paddingBottom: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 11, overflow: 'hidden', backdropFilter: 'blur(14px)' }}>
                <div style={{ padding: '8px 9px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 2, height: 10, borderRadius: 1, background: accent }} />
                    <span style={{ fontSize: 7.5, fontWeight: 800, color: 'white', fontFamily: fontFam }}>Latest Announcements</span>
                  </div>
                  <span style={{ fontSize: 6, color: accent, fontWeight: 700 }}>SEE ALL →</span>
                </div>
                {anns.map((ann, i) => (
                  <div key={i} style={{ padding: '6px 9px', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 6, fontWeight: 700, color: accent, background: `${accent}18`, padding: '1px 4px', borderRadius: 4 }}>{ann.tag}</span>
                      <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)' }}>{ann.date}</span>
                    </div>
                    <div style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.4, fontFamily: fontFam }}>{ann.title}</div>
                    <div style={{ fontSize: 6.5, color: accent, fontWeight: 700, marginTop: 2 }}>Read More →</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: primary, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>🏛️</span>
              <div>
                <div style={{ fontSize: 7, fontWeight: 800, color: 'white', fontFamily: fontFam }}>BAKAKENG CENTRAL</div>
                <div style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.5)' }}>Sangguniang Kabataan</div>
              </div>
            </div>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', fontFamily: IF }}>© 2026 Barangay Bakakeng Central. All Rights Reserved.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, count, desc, path, T }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(path)}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: '20px 24px', cursor: 'pointer', display: 'flex',
        flexDirection: 'column', gap: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,.04)', transition: 'all .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: T.textMuted, fontFamily: IF, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.navy, fontFamily: MF, lineHeight: 1 }}>{count}</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${T.navy}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} style={{ color: T.navy }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: IF }}>{desc}</span>
        <ChevronRight size={14} style={{ color: T.textMuted }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AdminHome() {
  const { T }    = useAdminTheme()
  const { role } = useAuth()
  const { pendingTheme, updateTheme, saveTheme, resetTheme, isDirty, saving } = useTheme()
  const { updateSettings } = useSiteSettings()

  const [activeTab,   setActiveTab]   = useState('colors')
  const [bgSubMode,   setBgSubMode]   = useState('color')
  const [saved,       setSaved]       = useState(false)
  const [counts,      setCounts]      = useState({ announcements: 0, events: 0, projects: 0, members: 0 })
  const bgImageRef = useRef()

  const isSuperAdmin = role === 'super_admin'
  const p   = pendingTheme
  const set = useCallback((key) => (value) => updateTheme({ [key]: value }), [updateTheme])

  useEffect(() => {
    ;(async () => {
      try {
        const [ann, evts, proj, mem] = await Promise.all([
          supabase.from('announcements').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id',         { count: 'exact', head: true }),
          supabase.from('projects').select('id',       { count: 'exact', head: true }),
          supabase.from('profiles').select('id',       { count: 'exact', head: true }),
        ])
        setCounts({ announcements: ann.count ?? 0, events: evts.count ?? 0, projects: proj.count ?? 0, members: mem.count ?? 0 })
      } catch {}
    })()
    // Sync bgSubMode with saved theme
    if (p.bgMode) setBgSubMode(p.bgMode)
  }, [])

  const handleSave = async () => {
    await saveTheme()
    await updateSettings({
      primaryColor: p.primaryColor || '#1A365D',
      primaryLt:    p.primaryColor || '#2A4A7F',
      accentColor:  p.accentColor  || p.secondaryColor || '#D69E2E',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const applyPreset = (key) => {
    const preset = THEME_PRESETS[key]
    if (preset) updateTheme(preset.colors)
  }

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => updateTheme({ bgImageUrl: ev.target.result, bgMode: 'image' })
    reader.readAsDataURL(file)
  }

  const COLOR_ROWS = [
    { label: 'Branding (Primary)',      lightKey: 'primaryColor',   darkKey: 'darkPrimaryColor',   defaultLight: '#1A365D', defaultDark: '#60A5FA' },
    { label: 'CTA Buttons (Secondary)', lightKey: 'secondaryColor', darkKey: 'darkSecondaryColor', defaultLight: '#C53030', defaultDark: '#F87171' },
    { label: 'Accents',                 lightKey: 'accentColor',    darkKey: 'darkAccentColor',    defaultLight: '#D69E2E', defaultDark: '#FBBF24' },
    { label: 'Background',              lightKey: 'bgColor',        darkKey: 'darkBgColor',        defaultLight: '#F7FAFC', defaultDark: '#0F172A' },
    { label: 'Surfaces/Cards',          lightKey: 'cardColor',      darkKey: 'darkCardColor',      defaultLight: '#FFFFFF', defaultDark: '#1E293B' },
    { label: 'Body Text',               lightKey: 'bodyColor',      darkKey: 'darkBodyColor',      defaultLight: '#2D3748', defaultDark: '#E2E8F0' },
  ]

  const TABS = [
    { id: 'colors',     label: 'Colors',      icon: Palette },
    { id: 'fonts',      label: 'Fonts',       icon: Type    },
    { id: 'background', label: 'Background',  icon: Image   },
    { id: 'ui',         label: 'UI Elements', icon: Layout  },
  ]

  // ── BG preset colors
  const BG_PRESETS = ['#FFFFFF','#F7FAFC','#10B981','#1E293B','#3B82F6','#8B5CF6','#EC4899','#EF4444','#065F46','#D97706','#F1F5F9','#DCFCE7']

  return (
    <div>
      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={Megaphone}  label="Announcements" count={counts.announcements} desc="Post and manage announcements" path="/admin/announcements" T={T} />
        <StatCard icon={Calendar}   label="Events"        count={counts.events}        desc="Schedule community events"   path="/admin/events"        T={T} />
        <StatCard icon={FolderOpen} label="Projects"      count={counts.projects}      desc="Track SK projects"           path="/admin/projects"      T={T} />
        <StatCard icon={Monitor}    label="Members"       count={counts.members}       desc="Manage registered members"   path="/admin/settings"      T={T} />
      </div>

      {/* ── Theme Customization (super admin only) ──────────────── */}
      {isSuperAdmin && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 4px', fontFamily: MF, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🎨</span> Site Branding &amp; User Portal Sync
              </h2>
              <p style={{ fontSize: 13, color: T.textMuted, margin: 0, fontFamily: IF }}>
                Changes apply system-wide and sync to all visitors in real-time via Supabase.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => window.open('/dashboard', '_blank')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, color: T.textMuted, fontWeight: 600, fontFamily: IF, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <ExternalLink size={13} /> Preview Site (New Tab)
              </button>
              <button
                onClick={resetTheme}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, color: T.textMuted, fontWeight: 600, fontFamily: IF, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <RotateCcw size={13} /> Reset to Default Palette
              </button>
              <button
                onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 9, border: 'none', background: saving ? '#9CA3AF' : T.navy, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, color: 'white', fontWeight: 700, fontFamily: IF, transition: 'all .15s', boxShadow: `0 3px 12px ${T.navy}40` }}
              >
                {saving
                  ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /> Saving…</>
                  : saved
                    ? <><Check size={13} /> Applied!</>
                    : <><Check size={13} /> Apply &amp; Sync</>}
              </button>
            </div>
          </div>

          {isDirty && !saving && (
            <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 8, background: `${T.navy}0D`, border: `1px solid ${T.navy}30`, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.navy, animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 11, color: T.navy, fontWeight: 600, fontFamily: IF }}>
                Unsaved changes — click "Apply &amp; Sync" to save and push to all users.
              </span>
            </div>
          )}

          {/* Two-column layout: tabs + preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 430px', gap: 20, alignItems: 'start' }}>

            {/* LEFT: Tab controls */}
            <div>
              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 2, marginBottom: 16,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 4,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '10px 10px', borderRadius: 9, border: 'none',
                      cursor: 'pointer',
                      background: activeTab === tab.id ? T.navy : 'transparent',
                      color: activeTab === tab.id ? 'white' : T.textMuted,
                      fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
                      fontFamily: IF, transition: 'all .15s',
                    }}
                  >
                    <tab.icon size={13} />{tab.label}
                  </button>
                ))}
              </div>

              {/* ═══════════════════════════════════════════════════
                  TAB 1: COLORS
              ════════════════════════════════════════════════════ */}
              {activeTab === 'colors' && (
                <>
                  {/* Global Colors table */}
                  <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: '0 20px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr 1fr', gap: 10, padding: '14px 0 10px', borderBottom: `2px solid ${T.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: MF }}>Global Colors</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, fontFamily: IF, alignSelf: 'center' }}>Light Mode (Hex)</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, fontFamily: IF, alignSelf: 'center' }}>Dark Mode (Hex)</span>
                    </div>
                    {COLOR_ROWS.map(row => (
                      <ColorRow
                        key={row.label} label={row.label}
                        lightValue={p[row.lightKey] || row.defaultLight}
                        darkValue={p[row.darkKey]   || row.defaultDark}
                        onLightChange={set(row.lightKey)}
                        onDarkChange={set(row.darkKey)}
                        T={T}
                      />
                    ))}
                    <div style={{ height: 12 }} />
                  </div>

                  {/* Quick Presets */}
                  <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <Zap size={14} style={{ color: T.navy }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: MF }}>⚡ Quick Presets</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${T.border}`, background: T.bg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.text, fontFamily: IF, transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = p.primaryColor || T.navy; e.currentTarget.style.color = p.primaryColor || T.navy }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text }}
                        >
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.colors.primaryColor }} />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: T.textMuted, marginTop: 14, marginBottom: 0, fontFamily: IF }}>
                      💾 Saved to <code style={{ background: T.bg, padding: '1px 5px', borderRadius: 4, fontSize: 10, border: `1px solid ${T.border}` }}>site_settings → settings</code> and synced to all users via Supabase Realtime.
                    </p>
                  </div>
                </>
              )}

              {/* ═══════════════════════════════════════════════════
                  TAB 2: FONTS
              ════════════════════════════════════════════════════ */}
              {activeTab === 'fonts' && (
                <Section icon={Type} title="Typography" T={T}>

                  {/* Font family grid */}
                  <div style={{ marginBottom: 22 }}>
                    <FieldLabel T={T}>Font Family</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {FONT_OPTIONS.map(font => {
                        const sel = p.fontFamily === font.value
                        return (
                          <button
                            key={font.value}
                            onClick={() => updateTheme({ fontFamily: font.value })}
                            style={{
                              padding: '13px 15px', border: `1.5px solid ${sel ? T.navy : T.border}`,
                              borderRadius: 12, cursor: 'pointer',
                              background: sel ? `${T.navy}0E` : T.bg,
                              textAlign: 'left', transition: 'all .15s',
                              boxShadow: sel ? `0 0 0 3px ${T.navy}1A` : 'none',
                            }}
                            onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = T.navy; e.currentTarget.style.background = `${T.navy}06` } }}
                            onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg } }}
                          >
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: `'${font.value}', sans-serif`, marginBottom: 3 }}>Aa Bb Cc</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: IF }}>{font.label.split(' (')[0]}</span>
                              {sel && <span style={{ fontSize: 9, fontWeight: 700, color: T.navy, background: `${T.navy}18`, borderRadius: 4, padding: '1px 5px' }}>✓</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Base Font Color */}
                  <div style={{ marginBottom: 20 }}>
                    <FieldLabel T={T}>Base Font Color</FieldLabel>
                    <ColorFieldRow value={p.bodyColor || '#2D3748'} onChange={set('bodyColor')} T={T} />
                  </div>

                  {/* Background (inside Fonts tab) */}
                  <div style={{ padding: '16px 18px', borderRadius: 12, background: T.bg, border: `1.5px solid ${T.border}`, marginBottom: 20 }}>
                    <FieldLabel T={T} mb={12}>Background</FieldLabel>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, fontFamily: IF, textTransform: 'uppercase', letterSpacing: '.4px' }}>Upload Image</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div
                          onClick={() => bgImageRef.current?.click()}
                          style={{ width: 80, height: 65, borderRadius: 9, border: `2px dashed ${T.border}`, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                        >
                          {p.bgImageUrl
                            ? <img src={p.bgImageUrl} alt="bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Upload size={16} style={{ color: T.textMuted }} />
                          }
                        </div>
                        <input ref={bgImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImageUpload} />
                        <div>
                          <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 5, fontFamily: IF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Fitting</div>
                          <select
                            value={p.bgFitting || 'cover'}
                            onChange={e => updateTheme({ bgFitting: e.target.value })}
                            style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: IF, cursor: 'pointer', outline: 'none', minWidth: 130 }}
                          >
                            <option value="cover">Cover, Contain</option>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    {/* Opacity slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <FieldLabel T={T} mb={0}>Background Overlay Opacity</FieldLabel>
                        <span style={{ fontSize: 13, fontWeight: 800, color: T.navy, fontFamily: IF }}>{p.bgOpacity ?? 30}%</span>
                      </div>
                      <input
                        type="range" min={0} max={80} step={1}
                        value={p.bgOpacity ?? 30}
                        onChange={e => updateTheme({ bgOpacity: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: T.navy }}
                      />
                    </div>
                  </div>

                  {/* Heading Weight + Color */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <FieldLabel T={T}>Heading Weight</FieldLabel>
                      <div style={{ display: 'flex', gap: 4, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden', padding: 3 }}>
                        {[{ v: '500', l: 'Medium' }, { v: '600', l: 'Semi-bold' }, { v: '700', l: 'Bold' }, { v: '800', l: 'Extra Bold' }].map(opt => (
                          <button key={opt.v} onClick={() => updateTheme({ headingWeight: opt.v })}
                            style={{ flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer', borderRadius: 7, fontSize: 11, fontWeight: (p.headingWeight || '700') === opt.v ? 700 : 500, background: (p.headingWeight || '700') === opt.v ? T.navy : 'transparent', color: (p.headingWeight || '700') === opt.v ? 'white' : T.textMuted, transition: 'all .15s', fontFamily: IF }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ColorField label="Heading Font Color" value={p.headingColor || '#1A365D'} onChange={set('headingColor')} T={T} />
                  </div>

                  {/* Typography preview */}
                  <div style={{ padding: '18px', borderRadius: 12, background: T.bg, border: `1.5px dashed ${T.border}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px', fontFamily: IF }}>Typography Preview</p>
                    <h2 style={{ fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, fontWeight: parseInt(p.headingWeight || 700), fontSize: 20, color: p.headingColor || '#1A365D', margin: '0 0 6px' }}>Barangay Bakakeng Central</h2>
                    <p style={{ fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, fontSize: 13, color: p.bodyColor || '#2D3748', margin: '0 0 4px', lineHeight: 1.6 }}>Stay connected, informed, and engaged with your community.</p>
                    <p style={{ fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, fontSize: 11, color: p.mutedColor || '#718096', margin: 0 }}>Announcements · Events · Projects · Feedback</p>
                  </div>
                </Section>
              )}

              {/* ═══════════════════════════════════════════════════
                  TAB 3: BACKGROUND
              ════════════════════════════════════════════════════ */}
              {activeTab === 'background' && (
                <Section icon={Image} title="Page Background Customization" T={T}>

                  {/* Color / Image toggle */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', background: T.navy, borderRadius: 10, overflow: 'hidden', width: 'fit-content', padding: 3, gap: 2 }}>
                      {[{ val: 'color', label: '⬤ Color' }, { val: 'image', label: '🖼 Image' }].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => { setBgSubMode(opt.val); updateTheme({ bgMode: opt.val }) }}
                          style={{ padding: '8px 26px', border: 'none', cursor: 'pointer', borderRadius: 8, background: bgSubMode === opt.val ? 'white' : 'transparent', color: bgSubMode === opt.val ? T.navy : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: bgSubMode === opt.val ? 700 : 500, fontFamily: IF, transition: 'all .15s' }}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* COLOR mode */}
                  {bgSubMode === 'color' && (
                    <div>
                      <FieldLabel T={T}>Base Page Color</FieldLabel>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                        {/* Big swatch */}
                        <div style={{ position: 'relative' }}>
                          <div
                            onClick={() => { const el = document.getElementById('__bg-color'); el?.click() }}
                            style={{ width: 130, height: 110, borderRadius: 12, cursor: 'pointer', background: p.bgColor || '#F7FAFC', border: `2px solid ${T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                          />
                          <input id="__bg-color" type="color" value={p.bgColor || '#F7FAFC'} onChange={e => updateTheme({ bgColor: e.target.value })} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                          <div style={{ marginTop: 5, textAlign: 'center', fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'monospace' }}>{(p.bgColor || '#F7FAFC').toUpperCase()}</div>
                        </div>
                        {/* Presets */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, fontFamily: IF, textTransform: 'uppercase', letterSpacing: '.5px' }}>Quick Presets</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                            {BG_PRESETS.map(color => (
                              <button key={color} onClick={() => updateTheme({ bgColor: color })} title={color}
                                style={{ width: 32, height: 32, borderRadius: 8, background: color, cursor: 'pointer', border: p.bgColor === color ? `3px solid ${T.navy}` : `2px solid ${T.border}`, transition: 'all .12s' }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IMAGE mode */}
                  {bgSubMode === 'image' && (
                    <div>
                      {/* Upload */}
                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel T={T}>Upload Image</FieldLabel>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div
                            onClick={() => bgImageRef.current?.click()}
                            style={{ width: 130, height: 110, borderRadius: 11, border: `2px dashed ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, transition: 'border-color .15s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                          >
                            {p.bgImageUrl
                              ? <img src={p.bgImageUrl} alt="bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ textAlign: 'center', color: T.textMuted }}><Upload size={22} style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} /><div style={{ fontSize: 10, fontFamily: IF }}>Click to upload</div></div>
                            }
                          </div>
                          <input ref={bgImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImageUpload} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={() => bgImageRef.current?.click()}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: T.navy, color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: IF }}>
                              <Upload size={13} /> Upload New
                            </button>
                            {p.bgImageUrl && (
                              <button onClick={() => updateTheme({ bgImageUrl: null })}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: IF }}>
                                <X size={13} /> Remove Image
                              </button>
                            )}
                            {/* Fitting */}
                            <div>
                              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 5, fontFamily: IF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Fitting</div>
                              <select value={p.bgFitting || 'cover'} onChange={e => updateTheme({ bgFitting: e.target.value })}
                                style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: IF, cursor: 'pointer', outline: 'none', width: 110 }}>
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                                <option value="fill">Fill</option>
                                <option value="center">Center</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Overlay Color */}
                      <div style={{ marginBottom: 18 }}>
                        <FieldLabel T={T}>Overlay Color</FieldLabel>
                        <ColorFieldRow value={p.bgOverlayColor || '#000000'} onChange={val => updateTheme({ bgOverlayColor: val })} T={T} />
                      </div>

                      {/* Opacity slider */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <FieldLabel T={T} mb={0}>Image Overlay Opacity</FieldLabel>
                          <span style={{ fontSize: 14, fontWeight: 800, color: T.navy, fontFamily: IF }}>{p.bgOpacity ?? 30}%</span>
                        </div>
                        <input
                          type="range" min={0} max={80} step={1}
                          value={p.bgOpacity ?? 30}
                          onChange={e => updateTheme({ bgOpacity: Number(e.target.value) })}
                          style={{ width: '100%', accentColor: T.navy }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMuted, fontFamily: IF, marginTop: 4 }}>
                          <span>0% — Transparent</span>
                          <span>80% — Dark</span>
                        </div>
                      </div>

                      {/* Applies-to / Sidebar toggle */}
                      <div style={{ padding: '14px 16px', borderRadius: 11, background: T.bg, border: `1.5px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: IF, marginBottom: 2 }}>Applies to:</div>
                          <div style={{ fontSize: 11, color: T.textMuted, fontFamily: IF }}>Main Content Backgrounds</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: T.textMuted, fontFamily: IF, whiteSpace: 'nowrap' }}>Also apply to Sidebar Background</span>
                          <ToggleSwitch value={p.bgApplyToSidebar || false} onChange={val => updateTheme({ bgApplyToSidebar: val })} T={T} />
                        </div>
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* ═══════════════════════════════════════════════════
                  TAB 4: UI ELEMENTS
              ════════════════════════════════════════════════════ */}
              {activeTab === 'ui' && (
                <>
                  {/* Buttons */}
                  <Section icon={Layout} title="Buttons" T={T}>
                    <div style={{ marginBottom: 20 }}>
                      <FieldLabel T={T}>Button Shape</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ value: 'rounded', label: 'Rounded', icon: <Circle size={14}/> }, { value: 'square', label: 'Square', icon: <Square size={14}/> }].map(opt => {
                          const sel = (p.buttonStyle || 'rounded') === opt.value
                          return (
                            <button key={opt.value} onClick={() => updateTheme({ buttonStyle: opt.value })}
                              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${sel ? T.navy : T.border}`, background: sel ? T.navy : T.surface, color: sel ? 'white' : T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 500, fontFamily: IF, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                              {opt.icon} {opt.label} {sel && <Check size={13} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <FieldLabel T={T}>Button Variant</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ value: 'filled', label: 'Filled', desc: '■' }, { value: 'outline', label: 'Outline', desc: '□' }].map(opt => {
                          const sel = (p.buttonVariant || 'filled') === opt.value
                          return (
                            <button key={opt.value} onClick={() => updateTheme({ buttonVariant: opt.value })}
                              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${sel ? T.navy : T.border}`, background: sel ? T.navy : T.surface, color: sel ? 'white' : T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 500, fontFamily: IF, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                              <span style={{ fontSize: 15 }}>{opt.desc}</span> {opt.label} {sel && <Check size={13} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <FieldLabel T={T}>Preview</FieldLabel>
                      <div style={{ display: 'flex', gap: 12, padding: '18px 20px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                        {[{ label: 'Primary', color: p.primaryColor || '#1A365D' }, { label: 'Secondary', color: p.secondaryColor || '#C53030' }].map(btn => {
                          const radius  = (p.buttonStyle || 'rounded') === 'rounded' ? 24 : 7
                          const variant = p.buttonVariant || 'filled'
                          return (
                            <div key={btn.label} style={{ padding: '10px 24px', borderRadius: radius, background: variant === 'filled' ? btn.color : 'transparent', border: `2px solid ${btn.color}`, color: variant === 'filled' ? 'white' : btn.color, fontSize: 13, fontWeight: 700, fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, transition: 'all .15s' }}>
                              {btn.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Section>

                  {/* Cards */}
                  <Section icon={Layout} title="Cards" T={T}>
                    <div style={{ marginBottom: 20 }}>
                      <FieldLabel T={T}>Shadow Intensity</FieldLabel>
                      <ToggleGroup
                        T={T}
                        value={p.cardShadow || 'moderate'}
                        onChange={set('cardShadow')}
                        options={[{ value: 'none', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }]}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <FieldLabel T={T} mb={0}>Border Radius</FieldLabel>
                        <span style={{ fontSize: 14, fontWeight: 800, color: T.navy, fontFamily: IF }}>{p.cardRadius ?? 12}px</span>
                      </div>
                      <input
                        type="range" min={0} max={24} step={1}
                        value={p.cardRadius ?? 12}
                        onChange={e => updateTheme({ cardRadius: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: T.navy }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMuted, fontFamily: IF, marginTop: 4 }}>
                        <span>0px — Sharp</span>
                        <span>24px — Pill</span>
                      </div>
                    </div>

                    <div>
                      <FieldLabel T={T}>Preview</FieldLabel>
                      <div style={{ borderRadius: p.cardRadius ?? 12, background: p.cardColor || T.surface, border: `1px solid ${p.borderColor || T.border}`, boxShadow: SHADOW_MAP[p.cardShadow || 'moderate'], padding: '20px 22px', transition: 'all .15s' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: p.headingColor || T.text, fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, marginBottom: 6 }}>Sample Card</div>
                        <div style={{ fontSize: 13, color: p.mutedColor || T.textMuted, fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`, lineHeight: 1.6 }}>This is how your cards will appear throughout the portal.</div>
                      </div>
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* RIGHT: Live Preview */}
            <div>
              <LivePreview pending={p} T={T} />
              <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.navy, margin: '0 0 5px', fontFamily: MF }}>💾 Sync &amp; Storage</p>
                <p style={{ fontSize: 10, color: T.textMuted, margin: 0, fontFamily: IF, lineHeight: 1.6 }}>
                  Theme is saved to{' '}
                  <code style={{ background: T.bg, padding: '1px 5px', borderRadius: 4, fontSize: 10, border: `1px solid ${T.border}` }}>site_settings → settings</code>{' '}
                  and broadcast to all users in real-time via Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
      `}</style>
    </div>
  )
}

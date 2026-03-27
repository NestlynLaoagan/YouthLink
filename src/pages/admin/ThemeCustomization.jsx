/**
 * ThemeCustomization.jsx  — FULLY ENHANCED
 * ─────────────────────────────────────────────────────────────────
 * Admin / Super Admin → Home → Theme Customization
 *
 * ✅ Tab 1: Background  — Color picker, Image upload, Overlay color,
 *                         Overlay opacity slider, Applies-to toggle,
 *                         Also apply to Sidebar toggle (Image 1)
 * ✅ Tab 2: Fonts       — Font family cards (8), Base font color,
 *                         Background image upload, Overlay opacity,
 *                         Heading weight selector, Heading font color (Image 2)
 * ✅ Tab 3: UI Elements — Button shape, Button variant, Preview,
 *                         Card shadow intensity, Card border radius,
 *                         Sample card preview (Image 3)
 *
 * ─────────────────────────────────────────────────────────────────
 * Place at: src/pages/admin/ThemeCustomization.jsx
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Type, Image, Layout, Save, Eye,
  RotateCcw, Check, ChevronRight,
  RefreshCw, Monitor, Upload, Palette, X,
  Sliders, Square, Circle,
} from 'lucide-react'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { useTheme, FONT_OPTIONS } from '../../contexts/ThemeContext'

// ─── CONSTANTS ────────────────────────────────────────────────────
const MF = `'Montserrat','Plus Jakarta Sans',sans-serif`
const IF = `'Plus Jakarta Sans','Inter',sans-serif`

const SHADOW_MAP = {
  none:     'none',
  low:      '0 2px 6px rgba(0,0,0,.06)',
  moderate: '0 4px 16px rgba(0,0,0,.10)',
  high:     '0 8px 28px rgba(0,0,0,.18)',
}

// Quick-access preset colors for the overlay color picker
const OVERLAY_PRESETS = [
  '#000000', '#0F172A', '#1A365D', '#1E293B',
  '#3B0764', '#450A0A', '#1A1A2E', '#064E3B',
]

// ─── COLOR FIELD ──────────────────────────────────────────────────
function ColorField({ label, value, onChange, T, small = false }) {
  const ref = useRef()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: IF,
        }}>
          {label}
        </label>
      )}
      <div
        onClick={() => ref.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.surface, border: `1.5px solid ${T.border}`,
          borderRadius: 10, padding: small ? '7px 10px' : '9px 14px',
          cursor: 'pointer', transition: 'border-color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
      >
        <div style={{
          width: small ? 20 : 24, height: small ? 20 : 24,
          borderRadius: 6, background: value,
          border: `2px solid ${T.border}`, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,.15)',
        }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: T.text,
          fontFamily: 'monospace', flex: 1,
        }}>
          {(value || '#000000').toUpperCase()}
        </span>
        <input
          ref={ref} type="color" value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
        />
        <Palette size={13} style={{ color: T.textMuted }} />
      </div>
    </div>
  )
}

// ─── TOGGLE GROUP ─────────────────────────────────────────────────
function ToggleGroup({ options, value, onChange, T, fullWidth = true }) {
  return (
    <div style={{
      display: 'flex', background: T.surface2 || T.bg,
      border: `1.5px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden', padding: 3, gap: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: fullWidth ? 1 : '0 0 auto',
            padding: '8px 14px', border: 'none', cursor: 'pointer',
            borderRadius: 8, fontSize: 12, fontWeight: value === opt.value ? 700 : 500,
            background: value === opt.value ? T.navy : 'transparent',
            color: value === opt.value ? 'white' : T.textMuted,
            transition: 'all .15s', fontFamily: IF,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}
        >
          {opt.icon && <span style={{ fontSize: 14 }}>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────
function Section({ icon: Icon, title, children, T, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`,
      marginBottom: 16, overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,.04)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 22px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${T.border}` : 'none',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${T.navy}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color: T.navy }} />
        </div>
        <span style={{
          fontSize: 15, fontWeight: 700, color: T.text, fontFamily: MF, flex: 1, textAlign: 'left',
        }}>
          {title}
        </span>
        <ChevronRight size={14} style={{
          color: T.textMuted,
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform .2s',
        }} />
      </button>
      {open && <div style={{ padding: '22px 24px' }}>{children}</div>}
    </div>
  )
}

// ─── FIELD LABEL ──────────────────────────────────────────────────
function FieldLabel({ children, T, style: extraStyle = {} }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '.5px',
      fontFamily: IF, marginBottom: 10, ...extraStyle,
    }}>
      {children}
    </label>
  )
}

// ─── SLIDER ROW ───────────────────────────────────────────────────
function SliderRow({ label, value, min = 0, max = 100, step = 1, unit = '%', onChange, T, rightLabel }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <FieldLabel T={T} style={{ marginBottom: 0 }}>{label}</FieldLabel>
        <span style={{
          fontSize: 14, fontWeight: 800, color: T.navy, fontFamily: IF,
          background: `${T.navy}10`, padding: '3px 10px', borderRadius: 20,
        }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 6,
          borderRadius: 3, background: T.border, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${T.navy}, ${T.navy}BB)`,
            width: `${((value - min) / (max - min)) * 100}%`,
            transition: 'width .1s',
          }} />
        </div>
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', left: 0, right: 0,
            width: '100%', opacity: 0, cursor: 'pointer', height: 36,
            zIndex: 2,
          }}
        />
        {/* Thumb visual */}
        <div style={{
          position: 'absolute',
          left: `calc(${((value - min) / (max - min)) * 100}% - 12px)`,
          width: 24, height: 24, borderRadius: '50%',
          background: T.navy,
          border: '3px solid white',
          boxShadow: `0 2px 8px ${T.navy}50`,
          pointerEvents: 'none',
          transition: 'left .1s',
          zIndex: 1,
        }} />
      </div>
      {rightLabel && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: T.textSubtle || T.textMuted, fontFamily: IF, marginTop: 6,
        }}>
          <span>{min}{unit} — Transparent</span>
          <span>{max}{unit} — {rightLabel}</span>
        </div>
      )}
    </div>
  )
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────
function ToggleSwitch({ value, onChange, T }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? T.navy : T.border,
        position: 'relative', transition: 'background .2s', flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3,
        left: value ? 23 : 3,
        transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

// ─── LIVE PREVIEW ─────────────────────────────────────────────────
function LivePreview({ p, T: adminT }) {
  const fontFam    = `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`
  const btnRadius  = (p.buttonStyle || 'rounded') === 'rounded' ? 24 : 7
  const cardRadius = p.cardRadius ?? 12
  const cardShadow = SHADOW_MAP[p.cardShadow] || SHADOW_MAP.moderate
  const bgMode     = p.bgMode || 'color'

  const getPageBg = () => {
    if (bgMode === 'image' && p.bgImageUrl) {
      const overlay = p.bgOverlayColor || '#000000'
      const opacity = (p.bgOpacity ?? 30) / 100
      return {
        backgroundImage: `url(${p.bgImageUrl})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    }
    return { background: p.bgColor || '#F7FAFC' }
  }

  const pageBg = getPageBg()
  const hasOverlay = bgMode === 'image' && p.bgImageUrl

  return (
    <div style={{
      position: 'sticky', top: 20,
      border: `2px solid ${adminT.border}`, borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.12)',
    }}>
      {/* Window chrome */}
      <div style={{
        background: adminT.surface2, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${adminT.border}`,
      }}>
        <Monitor size={13} style={{ color: adminT.textMuted }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: adminT.textMuted, fontFamily: IF }}>
          Live Preview — User Portal
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>

      {/* Mini portal */}
      <div style={{ display: 'flex', height: 500, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 100, background: p.sidebarColor || '#0F2444',
          padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0,
        }}>
          {/* Logo area */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, marginBottom: 10, paddingBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🏛️</div>
            <div style={{
              fontSize: 6, fontWeight: 800, color: 'white',
              fontFamily: fontFam, textAlign: 'center', lineHeight: 1.3,
            }}>BAKAKENG<br/>CENTRAL</div>
            <div style={{
              fontSize: 6, padding: '1px 6px', borderRadius: 10,
              background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: IF,
            }}>SK Admin</div>
          </div>

          {/* Nav label */}
          <div style={{
            fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase', letterSpacing: '1px',
            padding: '0 4px', marginBottom: 4, fontFamily: IF,
          }}>NAVIGATION</div>

          {[
            { icon: '🏠', label: 'Home', active: true },
            { icon: '📢', label: 'Announcements' },
            { icon: '🏗️', label: 'Projects' },
            { icon: '📅', label: 'Events' },
            { icon: '💬', label: 'Feedback' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '5px 7px', borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 5,
              background: item.active ? '#C53030' : 'transparent',
              marginBottom: 1,
            }}>
              <span style={{ fontSize: 8 }}>{item.icon}</span>
              <span style={{
                fontSize: 7, fontFamily: fontFam,
                color: item.active ? 'white' : 'rgba(255,255,255,.45)',
                fontWeight: item.active ? 700 : 400,
              }}>{item.label}</span>
            </div>
          ))}

          {/* Bottom controls */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6 }}>
            {['🌙 Dark Mode', '⚙️ Settings', '🚪 Log Out'].map(label => (
              <div key={label} style={{
                padding: '4px 7px', fontSize: 6,
                color: label.includes('Log Out') ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.4)',
                fontFamily: IF, display: 'flex', alignItems: 'center', gap: 4,
              }}>{label}</div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', ...pageBg }}>
          {/* Overlay layer */}
          {hasOverlay && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: p.bgOverlayColor || '#000000',
              opacity: (p.bgOpacity ?? 30) / 100,
              pointerEvents: 'none',
            }} />
          )}

          {/* Content above overlay */}
          <div style={{ position: 'relative', zIndex: 2, height: '100%', overflow: 'auto' }}>
            {/* Topbar */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderBottom: `1px solid #E2E8F0`,
              padding: '7px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 7, color: p.primaryColor || '#1A365D', fontWeight: 800, fontFamily: fontFam, letterSpacing: '1px' }}>
                  SATURDAY
                </div>
                <div style={{ fontSize: 9, fontWeight: parseInt(p.headingWeight || 700), color: p.headingColor || '#1A365D', fontFamily: fontFam }}>
                  March 26, 2026
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* User avatar */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#C53030', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 700,
                }}>S</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
              {/* Center content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {/* Greeting */}
                <div>
                  <div style={{
                    fontSize: 6, fontWeight: 700, color: 'rgba(212,175,55,0.9)',
                    letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 2,
                    fontFamily: fontFam, textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  }}>
                    SANGGUNIANG KABATAAN — BAKAKENG CENTRAL
                  </div>
                  <div style={{
                    fontSize: 8, fontWeight: parseInt(p.headingWeight || 700),
                    color: 'white', fontFamily: fontFam,
                    lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                  }}>
                    WELCOME TO THE SK PORTAL OF{' '}
                    <span style={{ color: p.accentColor || '#D69E2E' }}>
                      BARANGAY BAKAKENG CENTRAL!
                    </span>
                  </div>
                </div>

                {/* Hero card */}
                <div style={{
                  borderRadius: 8, overflow: 'hidden',
                  boxShadow: cardShadow, position: 'relative', height: 72,
                  background: 'linear-gradient(135deg, rgba(26,54,93,0.9), rgba(10,25,60,0.8))',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                  <div style={{
                    position: 'absolute', top: 5, left: 8,
                    padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(16,185,129,0.9)', color: 'white',
                    fontSize: 6, fontWeight: 800, fontFamily: fontFam,
                  }}>+ ACCOMPLISHED</div>
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8, right: 8,
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: parseInt(p.headingWeight || 700),
                      color: 'white', fontFamily: fontFam, marginBottom: 2,
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    }}>SK Tech4Youth Innovation Project</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', fontFamily: fontFam, display: 'flex', gap: 8 }}>
                      <span>📅 Jan 16, 2026</span>
                      <span style={{ color: p.accentColor || '#D69E2E', fontWeight: 700 }}>₱45,000</span>
                    </div>
                  </div>
                </div>

                {/* Events section header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 2, height: 10, borderRadius: 1, background: p.accentColor || '#D69E2E' }} />
                    <span style={{
                      fontSize: 7, fontWeight: 800, color: 'white',
                      fontFamily: fontFam, textTransform: 'uppercase', letterSpacing: '0.5px',
                      textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    }}>EVENTS — MARCH 2026</span>
                    <span style={{
                      fontSize: 6, background: 'rgba(212,175,55,0.2)', color: p.accentColor || '#D69E2E',
                      padding: '1px 5px', borderRadius: 6, fontWeight: 700,
                    }}>2</span>
                  </div>
                  <span style={{ fontSize: 6, color: p.accentColor || '#D69E2E', fontWeight: 700, fontFamily: fontFam }}>VIEW ALL →</span>
                </div>

                {/* Event cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'PROJECTES', title: 'Creative Arts & Music Workshop', date: 'Tue, Mar 10 · 05:00 PM', loc: 'Barangay Covered Court', tag: '#4ADE80' },
                    { label: 'EVENTSS', title: 'SK Fun Run 2026: Takbo ng Kabataan', date: 'Mon, Mar 30 · 01:30 PM', loc: 'Barangay Main Road', tag: '#60A5FA' },
                  ].map((ev, i) => (
                    <div key={i} style={{
                      borderRadius: cardRadius / 2, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: cardShadow,
                      backdropFilter: 'blur(8px)',
                    }}>
                      <div style={{ height: 34, background: 'rgba(26,54,93,0.7)', position: 'relative' }}>
                        <span style={{
                          position: 'absolute', top: 3, left: 4,
                          background: ev.tag, color: 'white',
                          fontSize: 5, fontWeight: 800, padding: '1px 4px', borderRadius: 4,
                          fontFamily: fontFam, textTransform: 'uppercase',
                        }}>{ev.label}</span>
                      </div>
                      <div style={{ padding: '5px 7px' }}>
                        <div style={{ fontSize: 7, fontWeight: 700, color: 'white', fontFamily: fontFam, lineHeight: 1.3, marginBottom: 2 }}>{ev.title}</div>
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.6)', fontFamily: fontFam }}>📅 {ev.date}</div>
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.5)', fontFamily: fontFam }}>📍 {ev.loc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right sidebar */}
              <div style={{ width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {/* Latest Announcements */}
                <div style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, overflow: 'hidden',
                  backdropFilter: 'blur(12px)',
                }}>
                  <div style={{
                    padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 2, height: 9, borderRadius: 1, background: p.accentColor || '#D69E2E' }} />
                      <span style={{ fontSize: 6, fontWeight: 800, color: 'white', fontFamily: fontFam }}>Latest Announcements</span>
                    </div>
                    <span style={{ fontSize: 5, color: p.accentColor || '#D69E2E', fontWeight: 700 }}>SEE ALL →</span>
                  </div>
                  {[
                    { tag: 'Notice', date: 'Mar 2026', title: 'Free Operation Tuli 2026', color: '#FBBF24' },
                    { tag: 'Notice', date: 'Mar 2026', title: 'Barangay Clean-Up Drive 2026', color: '#FBBF24' },
                    { tag: 'Training & Workshop', date: 'Mar 2026', title: 'SA Leadership Training Program', color: '#A78BFA' },
                    { tag: 'Sports', date: 'Mar 2026', title: 'SK Liga 2026 Opening', color: '#60A5FA' },
                  ].map((ann, i) => (
                    <div key={i} style={{
                      padding: '6px 8px',
                      borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{
                          fontSize: 5, fontWeight: 700, color: ann.color,
                          background: `${ann.color}20`, padding: '1px 4px', borderRadius: 4, fontFamily: IF,
                        }}>{ann.tag}</span>
                        <span style={{ fontSize: 5, color: 'rgba(255,255,255,0.35)', fontFamily: IF }}>{ann.date}</span>
                      </div>
                      <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: fontFam, lineHeight: 1.3 }}>{ann.title}</div>
                      <span style={{ fontSize: 6, color: p.accentColor || '#D69E2E', fontWeight: 700, fontFamily: IF }}>Read More →</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: p.primaryColor || '#1A365D',
              padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10 }}>🏛️</span>
                <div>
                  <div style={{ fontSize: 6, fontWeight: 800, color: 'white', fontFamily: fontFam }}>BAKAKENG CENTRAL</div>
                  <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)' }}>Sangguniang Kabataan</div>
                </div>
              </div>
              <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.3)', fontFamily: IF }}>
                © 2026 Barangay Bakakeng Central. All Rights Reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function ThemeCustomization() {
  const { T } = useAdminTheme()
  const {
    pendingTheme, updateTheme,
    saveTheme, resetTheme, isDirty, saving,
  } = useTheme()

  const [activeTab, setActiveTab] = useState('background')
  const [saved,     setSaved]     = useState(false)
  const bgImageRef                = useRef()
  const fontBgImageRef            = useRef()

  const p   = pendingTheme
  const set = useCallback((key) => (value) => updateTheme({ [key]: value }), [updateTheme])

  const handleSave = async () => {
    await saveTheme()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => updateTheme({ bgImageUrl: ev.target.result, bgMode: 'image' })
    reader.readAsDataURL(file)
  }

  // Separate font-tab background image upload
  const handleFontBgUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => updateTheme({ bgImageUrl: ev.target.result, bgMode: 'image' })
    reader.readAsDataURL(file)
  }

  const TABS = [
    { id: 'background', label: 'Background', icon: Image },
    { id: 'fonts',      label: 'Fonts',      icon: Type  },
    { id: 'ui',         label: 'UI Elements', icon: Layout },
  ]

  const bgMode = p.bgMode || 'color'

  // ── Background tab: which sub-mode (Color vs Image)
  const [bgSubMode, setBgSubMode] = useState(bgMode === 'image' ? 'image' : 'color')
  const effectiveBgMode = bgSubMode

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: T.text, margin: '0 0 4px',
              fontFamily: MF, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 11, background: `${T.navy}15`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>🎨</span>
              Theme Customization
            </h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0, fontFamily: IF }}>
              Changes apply system-wide and sync to all visitors in real-time via Supabase.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={resetTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 9,
                border: `1px solid ${T.border}`, background: T.surface,
                cursor: 'pointer', fontSize: 12, color: T.textMuted,
                fontWeight: 600, fontFamily: IF, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <RotateCcw size={13} /> Reset to Default Palette
            </button>

            <button
              onClick={() => window.open('/dashboard', '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 9,
                border: `1px solid ${T.border}`, background: T.surface,
                cursor: 'pointer', fontSize: 12, color: T.textMuted,
                fontWeight: 600, fontFamily: IF, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <Eye size={13} /> Preview Site (New Tab)
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: saving ? '#9CA3AF' : T.navy,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, color: 'white', fontWeight: 700, fontFamily: IF,
                transition: 'background .15s',
                boxShadow: `0 3px 12px ${T.navy}40`,
              }}
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
          <div style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 8,
            background: `${T.navy}0D`, border: `1px solid ${T.navy}30`,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.navy, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, color: T.navy, fontWeight: 600, fontFamily: IF }}>
              Unsaved changes — click "Apply &amp; Sync" to save and push to all users.
            </span>
          </div>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 22, alignItems: 'start' }}>

        {/* LEFT: controls */}
        <div>
          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 2, marginBottom: 18,
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
                  gap: 7, padding: '10px 12px', borderRadius: 9, border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.id ? T.navy : 'transparent',
                  color: activeTab === tab.id ? 'white' : T.textMuted,
                  fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                  fontFamily: IF, transition: 'all .15s',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════
              BACKGROUND TAB  (Image 1)
          ═══════════════════════════════════════ */}
          {activeTab === 'background' && (
            <Section icon={Image} title="Page Background Customization" T={T}>

              {/* Color / Image toggle pills */}
              <div style={{ marginBottom: 22 }}>
                <div style={{
                  display: 'flex', gap: 0,
                  background: T.navy, borderRadius: 10, overflow: 'hidden',
                  width: 'fit-content',
                }}>
                  {[
                    { val: 'color', label: '⬤ Color' },
                    { val: 'image', label: '🖼 Image' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setBgSubMode(opt.val)
                        updateTheme({ bgMode: opt.val })
                      }}
                      style={{
                        padding: '9px 28px', border: 'none', cursor: 'pointer',
                        background: effectiveBgMode === opt.val ? 'white' : 'transparent',
                        color: effectiveBgMode === opt.val ? T.navy : 'rgba(255,255,255,0.7)',
                        fontSize: 13, fontWeight: effectiveBgMode === opt.val ? 700 : 500,
                        fontFamily: IF, transition: 'all .15s',
                        borderRadius: effectiveBgMode === opt.val ? 8 : 0,
                        margin: effectiveBgMode === opt.val ? 3 : 0,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── COLOR mode ── */}
              {effectiveBgMode === 'color' && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <FieldLabel T={T}>Base Page Color</FieldLabel>
                    {/* Color swatch grid + hex input */}
                    <div style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                    }}>
                      {/* Big swatch preview */}
                      <div style={{ position: 'relative' }}>
                        <div
                          onClick={() => {
                            const el = document.getElementById('bg-color-input')
                            el?.click()
                          }}
                          style={{
                            width: 140, height: 120, borderRadius: 12, cursor: 'pointer',
                            background: p.bgColor || '#F7FAFC',
                            border: `2px solid ${T.border}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }}
                        />
                        <input
                          id="bg-color-input"
                          type="color"
                          value={p.bgColor || '#F7FAFC'}
                          onChange={e => updateTheme({ bgColor: e.target.value })}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        <div style={{
                          marginTop: 6, textAlign: 'center',
                          fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'monospace',
                        }}>
                          {(p.bgColor || '#F7FAFC').toUpperCase()}
                        </div>
                      </div>

                      {/* Quick Presets grid */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, fontFamily: IF, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          Quick Presets
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {[
                            '#FFFFFF', '#F7FAFC', '#10B981', '#1E293B',
                            '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
                            '#065F46', '#D97706', '#F1F5F9', '#DCFCE7',
                          ].map(color => (
                            <button
                              key={color}
                              onClick={() => updateTheme({ bgColor: color })}
                              title={color}
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: color, cursor: 'pointer',
                                border: p.bgColor === color ? `3px solid ${T.navy}` : `2px solid ${T.border}`,
                                transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.1)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── IMAGE mode ── */}
              {effectiveBgMode === 'image' && (
                <div>
                  {/* Upload area */}
                  <div style={{ marginBottom: 20 }}>
                    <FieldLabel T={T}>Upload Image</FieldLabel>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      {/* Thumbnail */}
                      <div
                        onClick={() => bgImageRef.current?.click()}
                        style={{
                          width: 140, height: 120, borderRadius: 12, cursor: 'pointer',
                          border: `2px dashed ${T.border}`, background: T.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', position: 'relative', flexShrink: 0,
                          transition: 'border-color .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
                        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                      >
                        {p.bgImageUrl ? (
                          <img
                            src={p.bgImageUrl} alt="background"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: T.textMuted }}>
                            <Upload size={22} style={{ marginBottom: 5, display: 'block', margin: '0 auto 6px' }} />
                            <div style={{ fontSize: 10, fontFamily: IF, lineHeight: 1.4 }}>
                              Click to upload
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        ref={bgImageRef} type="file" accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleBgImageUpload}
                      />

                      {/* Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                          onClick={() => bgImageRef.current?.click()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '9px 18px', borderRadius: 9,
                            background: T.navy, color: 'white', border: 'none',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: IF,
                            boxShadow: `0 2px 8px ${T.navy}30`,
                          }}
                        >
                          <Upload size={13} />
                          Upload New
                        </button>
                        {p.bgImageUrl && (
                          <button
                            onClick={() => updateTheme({ bgImageUrl: null })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '9px 18px', borderRadius: 9,
                              background: 'transparent', color: T.textMuted,
                              border: `1px solid ${T.border}`,
                              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: IF,
                            }}
                          >
                            <X size={13} />
                            Remove Image
                          </button>
                        )}
                        {/* Fitting selector */}
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 5, fontFamily: IF, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 }}>Fitting</div>
                          <select
                            value={p.bgFitting || 'cover'}
                            onChange={e => updateTheme({ bgFitting: e.target.value })}
                            style={{
                              padding: '7px 12px', borderRadius: 8, fontSize: 12,
                              border: `1px solid ${T.border}`, background: T.surface,
                              color: T.text, fontFamily: IF, cursor: 'pointer', outline: 'none',
                              width: 120,
                            }}
                          >
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
                  <div style={{ marginBottom: 20 }}>
                    <FieldLabel T={T}>Overlay Color</FieldLabel>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <ColorField
                        value={p.bgOverlayColor || '#000000'}
                        onChange={val => updateTheme({ bgOverlayColor: val })}
                        T={T}
                      />
                    </div>
                    {/* Preset overlays */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {OVERLAY_PRESETS.map(color => (
                        <button
                          key={color}
                          onClick={() => updateTheme({ bgOverlayColor: color })}
                          title={color}
                          style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: color, cursor: 'pointer', border: 'none',
                            border: p.bgOverlayColor === color ? `2.5px solid ${T.navy}` : `1.5px solid ${T.border}`,
                            transition: 'all .12s',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opacity slider */}
                  <div style={{ marginBottom: 24 }}>
                    <SliderRow
                      label="Image Overlay Opacity"
                      value={p.bgOpacity ?? 30}
                      min={0} max={80} step={1} unit="%"
                      onChange={val => updateTheme({ bgOpacity: val })}
                      T={T}
                      rightLabel="Dark"
                    />
                  </div>

                  {/* Applies to / sidebar toggle */}
                  <div style={{
                    padding: '16px 18px', borderRadius: 12,
                    background: T.bg, border: `1.5px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: IF, marginBottom: 2 }}>
                        Applies to:
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, fontFamily: IF }}>
                        Main Content Backgrounds
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: T.textMuted, fontFamily: IF, whiteSpace: 'nowrap' }}>
                        Also apply to Sidebar Background
                      </span>
                      <ToggleSwitch
                        value={p.bgApplyToSidebar || false}
                        onChange={val => updateTheme({ bgApplyToSidebar: val })}
                        T={T}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ═══════════════════════════════════════
              FONTS TAB  (Image 2)
          ═══════════════════════════════════════ */}
          {activeTab === 'fonts' && (
            <Section icon={Type} title="Typography" T={T}>

              {/* Font family grid */}
              <div style={{ marginBottom: 24 }}>
                <FieldLabel T={T}>Font Family</FieldLabel>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                  gap: 10,
                }}>
                  {FONT_OPTIONS.map(font => {
                    const sel = p.fontFamily === font.value
                    return (
                      <button
                        key={font.value}
                        onClick={() => updateTheme({ fontFamily: font.value })}
                        style={{
                          padding: '13px 16px',
                          border: `1.5px solid ${sel ? T.navy : T.border}`,
                          borderRadius: 12, cursor: 'pointer',
                          background: sel ? `${T.navy}0E` : T.bg,
                          textAlign: 'left', transition: 'all .15s',
                          boxShadow: sel ? `0 0 0 3px ${T.navy}1A` : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = T.navyLt || T.navy
                            e.currentTarget.style.background = `${T.navy}06`
                          }
                        }}
                        onMouseLeave={e => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = T.border
                            e.currentTarget.style.background = T.bg
                          }
                        }}
                      >
                        <div style={{
                          fontSize: 17, fontWeight: 700, color: T.text,
                          fontFamily: `'${font.value}', sans-serif`,
                          marginBottom: 4,
                        }}>
                          Aa Bb Cc
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: IF }}>
                            {font.label.split(' (')[0]}
                          </span>
                          {sel && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: T.navy,
                              background: `${T.navy}18`, borderRadius: 4,
                              padding: '1px 6px', fontFamily: IF,
                            }}>✓</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Base Font Color (top-level) */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <ColorField
                    label="Base Font Color"
                    value={p.bodyColor || '#2D3748'}
                    onChange={set('bodyColor')}
                    T={T}
                  />
                  <ColorField
                    label="Muted Text Color"
                    value={p.mutedColor || '#718096'}
                    onChange={set('mutedColor')}
                    T={T}
                  />
                </div>
              </div>

              {/* Background section (inside Fonts tab) */}
              <div style={{
                padding: '18px 20px', borderRadius: 12,
                background: T.bg, border: `1.5px solid ${T.border}`,
                marginBottom: 22,
              }}>
                <FieldLabel T={T}>Background</FieldLabel>

                {/* Upload */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, fontFamily: IF, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Upload Image
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Thumbnail */}
                    <div
                      onClick={() => fontBgImageRef.current?.click()}
                      style={{
                        width: 90, height: 70, borderRadius: 10,
                        border: `2px dashed ${T.border}`, background: T.surface,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {p.bgImageUrl ? (
                        <img src={p.bgImageUrl} alt="bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <Upload size={16} style={{ color: T.textMuted }} />
                        </div>
                      )}
                    </div>
                    <input
                      ref={fontBgImageRef} type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFontBgUpload}
                    />
                    {/* Fitting selector */}
                    <div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6, fontFamily: IF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                        Fitting
                      </div>
                      <select
                        value={p.bgFitting || 'cover'}
                        onChange={e => updateTheme({ bgFitting: e.target.value })}
                        style={{
                          padding: '8px 12px', borderRadius: 8, fontSize: 12,
                          border: `1px solid ${T.border}`, background: T.surface,
                          color: T.text, fontFamily: IF, cursor: 'pointer', outline: 'none',
                          minWidth: 140,
                        }}
                      >
                        <option value="cover">Cover, Contain</option>
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Overlay opacity */}
                <SliderRow
                  label="Background Overlay Opacity"
                  value={p.bgOpacity ?? 30}
                  min={0} max={80} step={1} unit="%"
                  onChange={val => updateTheme({ bgOpacity: val })}
                  T={T}
                />
              </div>

              {/* Heading Weight */}
              <div style={{ marginBottom: 22 }}>
                <FieldLabel T={T}>Heading Weight</FieldLabel>
                <ToggleGroup
                  T={T}
                  value={p.headingWeight || '700'}
                  onChange={set('headingWeight')}
                  options={[
                    { value: '500', label: 'Medium' },
                    { value: '600', label: 'Semi-bold' },
                    { value: '700', label: 'Bold' },
                    { value: '800', label: 'Extra Bold' },
                  ]}
                />
              </div>

              {/* Heading Font Color */}
              <div style={{ marginBottom: 22 }}>
                <ColorField
                  label="Heading Font Color"
                  value={p.headingColor || '#1A365D'}
                  onChange={set('headingColor')}
                  T={T}
                />
              </div>

              {/* Typography Preview */}
              <div style={{
                padding: '20px', borderRadius: 12,
                background: T.bg, border: `1.5px dashed ${T.border}`,
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.5px',
                  margin: '0 0 12px', fontFamily: IF,
                }}>
                  Typography Preview
                </p>
                <h2 style={{
                  fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                  fontWeight: parseInt(p.headingWeight || 700),
                  fontSize: 20, color: p.headingColor || '#1A365D', margin: '0 0 8px',
                }}>
                  Barangay Bakakeng Central
                </h2>
                <p style={{
                  fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                  fontWeight: 400, fontSize: 14,
                  color: p.bodyColor || '#2D3748', margin: '0 0 6px', lineHeight: 1.6,
                }}>
                  Stay connected, informed, and engaged with your community.
                </p>
                <p style={{
                  fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                  fontWeight: 400, fontSize: 12,
                  color: p.mutedColor || '#718096', margin: 0,
                }}>
                  Announcements · Events · Projects · Feedback
                </p>
              </div>
            </Section>
          )}

          {/* ═══════════════════════════════════════
              UI ELEMENTS TAB  (Image 3)
          ═══════════════════════════════════════ */}
          {activeTab === 'ui' && (
            <>
              {/* Buttons section */}
              <Section icon={Layout} title="Buttons" T={T}>

                {/* Button Shape */}
                <div style={{ marginBottom: 20 }}>
                  <FieldLabel T={T}>Button Shape</FieldLabel>
                  <div style={{
                    display: 'flex', gap: 8,
                  }}>
                    {[
                      { value: 'rounded', label: 'Rounded', icon: <Circle size={14}/> },
                      { value: 'square',  label: 'Square',  icon: <Square size={14}/> },
                    ].map(opt => {
                      const sel = (p.buttonStyle || 'rounded') === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => updateTheme({ buttonStyle: opt.value })}
                          style={{
                            flex: 1, padding: '12px 18px', borderRadius: 10,
                            border: `2px solid ${sel ? T.navy : T.border}`,
                            background: sel ? T.navy : T.surface,
                            color: sel ? 'white' : T.textMuted,
                            cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 500,
                            fontFamily: IF, transition: 'all .15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          }}
                        >
                          {opt.icon}
                          {opt.label}
                          {sel && <Check size={13} style={{ marginLeft: 2 }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Button Variant */}
                <div style={{ marginBottom: 20 }}>
                  <FieldLabel T={T}>Button Variant</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { value: 'filled',  label: 'Filled',  desc: '■' },
                      { value: 'outline', label: 'Outline', desc: '□' },
                    ].map(opt => {
                      const sel = (p.buttonVariant || 'filled') === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => updateTheme({ buttonVariant: opt.value })}
                          style={{
                            flex: 1, padding: '12px 18px', borderRadius: 10,
                            border: `2px solid ${sel ? T.navy : T.border}`,
                            background: sel ? T.navy : T.surface,
                            color: sel ? 'white' : T.textMuted,
                            cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 500,
                            fontFamily: IF, transition: 'all .15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{opt.desc}</span>
                          {opt.label}
                          {sel && <Check size={13} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Live button preview */}
                <div>
                  <FieldLabel T={T}>Preview</FieldLabel>
                  <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap',
                    padding: '20px 22px', background: T.bg,
                    borderRadius: 12, border: `1px solid ${T.border}`,
                    alignItems: 'center',
                  }}>
                    {[
                      { label: 'Primary',   color: p.primaryColor   || '#1A365D' },
                      { label: 'Secondary', color: p.secondaryColor || '#C53030' },
                    ].map(btn => {
                      const radius  = (p.buttonStyle || 'rounded') === 'rounded' ? 24 : 8
                      const variant = p.buttonVariant || 'filled'
                      return (
                        <div
                          key={btn.label}
                          style={{
                            padding: '10px 24px', borderRadius: radius,
                            background: variant === 'filled' ? btn.color : 'transparent',
                            border: `2px solid ${btn.color}`,
                            color: variant === 'filled' ? 'white' : btn.color,
                            fontSize: 13, fontWeight: 700,
                            fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                            cursor: 'default', transition: 'all .15s',
                          }}
                        >
                          {btn.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Section>

              {/* Cards section */}
              <Section icon={Layout} title="Cards" T={T}>

                {/* Shadow intensity */}
                <div style={{ marginBottom: 22 }}>
                  <FieldLabel T={T}>Shadow Intensity</FieldLabel>
                  <ToggleGroup
                    T={T}
                    value={p.cardShadow || 'moderate'}
                    onChange={set('cardShadow')}
                    options={[
                      { value: 'none',     label: 'None' },
                      { value: 'low',      label: 'Low' },
                      { value: 'moderate', label: 'Moderate' },
                      { value: 'high',     label: 'High' },
                    ]}
                  />
                </div>

                {/* Border radius */}
                <div style={{ marginBottom: 22 }}>
                  <SliderRow
                    label="Border Radius"
                    value={p.cardRadius ?? 12}
                    min={0} max={24} step={1} unit="px"
                    onChange={val => updateTheme({ cardRadius: val })}
                    T={T}
                    rightLabel="Pill"
                  />
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 10, color: T.textSubtle || T.textMuted, fontFamily: IF, marginTop: 6,
                  }}>
                    <span>0px — Sharp</span>
                    <span>24px — Pill</span>
                  </div>
                </div>

                {/* Card preview */}
                <div>
                  <FieldLabel T={T}>Preview</FieldLabel>
                  <div style={{
                    borderRadius: p.cardRadius ?? 12,
                    background: p.cardColor || T.surface,
                    border: `1px solid ${p.borderColor || T.border}`,
                    boxShadow: SHADOW_MAP[p.cardShadow || 'moderate'],
                    padding: '20px 22px',
                    transition: 'border-radius .15s, box-shadow .15s',
                  }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: p.headingColor || T.text,
                      fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                      marginBottom: 6,
                    }}>
                      Sample Card
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: p.mutedColor || T.textMuted,
                      fontFamily: `'${p.fontFamily || 'Plus Jakarta Sans'}', sans-serif`,
                      lineHeight: 1.6,
                    }}>
                      This is how your cards will appear throughout the portal.
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>

        {/* RIGHT: Live preview */}
        <div>
          <LivePreview p={p} T={T} />

          <div style={{
            marginTop: 14, padding: '14px 18px', borderRadius: 12,
            background: T.surface, border: `1px solid ${T.border}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.navy, margin: '0 0 5px', fontFamily: MF }}>
              💾 Sync &amp; Storage
            </p>
            <p style={{ fontSize: 10, color: T.textMuted, margin: 0, fontFamily: IF, lineHeight: 1.6 }}>
              Theme is saved to{' '}
              <code style={{
                background: T.bg, padding: '1px 5px', borderRadius: 4, fontSize: 10,
                border: `1px solid ${T.border}`,
              }}>
                site_settings → settings.theme
              </code>{' '}
              and broadcast to all users in real-time via Supabase.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
      `}</style>
    </div>
  )
}

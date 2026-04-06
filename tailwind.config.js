/** @type {import('tailwindcss').Config} */
// tailwind.config.js
// ─────────────────────────────────────────────────────────────────
// Dynamic theme support via CSS variables.
// All brand colours are driven by CSS custom properties set by
// ThemeContext → applyThemeToDom(), so changing a hex in the Admin
// UI instantly cascades everywhere Tailwind utilities are used.
// ─────────────────────────────────────────────────────────────────

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  // Dark mode is driven by the `.dark` class that ThemeContext
  // adds/removes on <body>, matching AdminThemeContext behaviour.
  darkMode: 'class',

  theme: {
    extend: {
      // ── Brand colour tokens ────────────────────────────────────
      // Every value is a CSS variable reference. Tailwind resolves
      // these at runtime so Tailwind utilities like `bg-primary`,
      // `text-secondary`, `border-accent` etc. always reflect the
      // live admin selection — no rebuild required.
      colors: {
        // Core brand (mapped to --color-* CSS vars set by ThemeContext)
        primary:   'var(--color-primary,   #1A365D)',
        secondary: 'var(--color-secondary, #C53030)',
        accent:    'var(--color-accent,    #D69E2E)',

        // Surfaces / chrome
        bg:        'var(--color-bg,        #F7FAFC)',
        surface:   'var(--color-surface,   #FFFFFF)',
        border:    'var(--color-border,    #E2E8F0)',

        // Text
        'text-base':  'var(--color-text,       #2D3748)',
        'text-head':  'var(--color-text-head,  #1A365D)',
        'text-muted': 'var(--color-text-muted, #718096)',

        // Legacy aliases — keeps existing code unchanged
        navy:    'var(--navy,    #1A365D)',
        crimson: 'var(--crimson, #C53030)',
        gold:    'var(--gold,    #D69E2E)',
      },

      // ── Typography ────────────────────────────────────────────
      fontFamily: {
        // --font-body is injected by ThemeContext (Google Font + fallback)
        body:    ['var(--font-body)',    'Plus Jakarta Sans', 'sans-serif'],
        heading: ['var(--font-heading)', 'Montserrat',        'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // ── Shadows — driven by card-shadow setting ────────────────
      boxShadow: {
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow-md)',
        lg:  'var(--shadow-lg)',
        xl:  'var(--shadow-xl)',
      },

      // ── Border radius — driven by cardRadius slider ───────────
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      // ── Transitions ───────────────────────────────────────────
      // Smooth colour transitions so every theme change animates
      transitionProperty: {
        colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
      },
      transitionDuration: { DEFAULT: '200ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    },
  },

  plugins: [],
}

// ─── HOW THE CSS-VAR BRIDGE WORKS ────────────────────────────────
//
// ThemeContext.jsx calls applyThemeToDom(theme) on every change,
// which writes:
//
//   document.documentElement.style.setProperty('--color-primary', hex)
//   document.documentElement.style.setProperty('--color-secondary', hex)
//   document.documentElement.style.setProperty('--color-accent', hex)
//   … etc.
//
// Tailwind's `bg-primary` compiles to:
//   background-color: var(--color-primary, #1A365D);
//
// So the Admin colour picker → CSS var → Tailwind utility chain
// requires zero re-renders on the consuming components; the browser
// handles the cascade automatically, with CSS transitions applied.
//
// See src/index.css for the :root and body.dark variable blocks.
// ─────────────────────────────────────────────────────────────────

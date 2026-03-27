# 🎨 Theme Customization System — Integration Guide

## What's included

| File | Destination | What it does |
|------|-------------|--------------|
| `ThemeContext.jsx` | `src/contexts/ThemeContext.jsx` | System-wide theme state, CSS var injection, Supabase sync |
| `ThemeCustomization.jsx` | `src/pages/admin/ThemeCustomization.jsx` | Full 4-tab customization panel with live preview |
| `AdminHome.jsx` | `src/pages/admin/AdminHome.jsx` | Updated home with theme CTA card (replaces old hero customizer) |
| `AdminLayout.jsx` | `src/components/AdminLayout.jsx` | Added "Theme" nav item (super_admin only) |
| `App.jsx` | `src/App.jsx` | ThemeProvider wrap + `/admin/theme` route |
| `theme-setup.sql` | Supabase SQL Editor | DB schema, RLS policies, initial data |

---

## Step-by-step integration

### Step 1 — Run the SQL
1. Open your Supabase dashboard → SQL Editor
2. Paste and run `theme-setup.sql`
3. Confirm `site_settings` has a row with id = `'global'`

### Step 2 — Add ThemeContext
Copy `ThemeContext.jsx` → `src/contexts/ThemeContext.jsx`

### Step 3 — Add ThemeCustomization page
Copy `ThemeCustomization.jsx` → `src/pages/admin/ThemeCustomization.jsx`

### Step 4 — Replace App.jsx
Copy `App.jsx` → `src/App.jsx`
(or apply just the diff: add ThemeProvider import, wrap AdminThemeProvider, add /admin/theme route)

### Step 5 — Replace AdminLayout.jsx
Copy `AdminLayout.jsx` → `src/components/AdminLayout.jsx`
(adds Paintbrush nav item visible to super_admin)

### Step 6 — Replace AdminHome.jsx
Copy `AdminHome.jsx` → `src/pages/admin/AdminHome.jsx`
(removes old hero customizer, adds Theme CTA card)

### Step 7 — Update index.css
In your `src/index.css`, ensure these CSS variable names exist in `:root`:
```css
--primary, --secondary, --link-color,
--sidebar-bg, --sidebar-text,
--font-body, --font-heading
```
ThemeContext sets these dynamically. The existing `--navy`, `--gold`, `--bg`, `--surface`,
`--border`, `--text`, `--text-heading`, `--text-muted` are already set by your AdminThemeContext
and are ALSO set by ThemeContext so they stay in sync.

---

## How it works

```
super_admin opens /admin/theme
  → Changes a color in the panel
  → updateTheme() is called
  → applyThemeToDom() sets CSS variables on document.documentElement
  → Every component using var(--primary), var(--bg), etc. updates instantly ✨
  → Click "Save Changes"
  → Saved to Supabase site_settings.settings.theme
  → Supabase Realtime fires
  → ThemeContext on ALL user dashboards receives the update
  → applyThemeToDom() runs for all users instantly 🌐
```

---

## Coexistence with AdminThemeContext

The system uses **both** contexts:
- **AdminThemeContext** — controls the admin UI palette (navy/emerald/violet presets) and admin dark mode. This is unchanged.
- **ThemeContext** (new) — controls the full portal theme (user dashboard + all components via CSS vars). Synced to Supabase.

They overlap on `--navy`, `--gold`, `--bg`, etc. ThemeContext wins for user-facing UI;
AdminThemeContext still drives inline styles in admin components that use `T.navy`, `T.gold`, etc.

---

## Adding theme support to new components

Any React component automatically inherits the theme via CSS variables:

```jsx
// ✅ Automatic — just use CSS vars in your styles
<div style={{ background: 'var(--surface)', color: 'var(--text-heading)' }}>

// ✅ Or use the hook for JS values
import { useTheme } from '../contexts/ThemeContext'
const { theme } = useTheme()
<div style={{ background: theme.cardColor, borderRadius: theme.cardRadius }}>

// ✅ Button that respects theme
const btnRadius = theme.buttonStyle === 'rounded' ? 24 : 7
<button style={{ borderRadius: btnRadius, background: theme.primaryColor }}>
  Click me
</button>
```

---

## Database schema

```
site_settings
  id:          'global'
  settings:    {
    theme: {
      primaryColor, secondaryColor, bgColor, cardColor,
      sidebarColor, borderColor, headingColor, bodyColor,
      mutedColor, linkColor, fontFamily, headingWeight,
      bgType, bgGradientFrom, bgGradientTo, bgImageUrl, bgOverlay,
      buttonStyle, buttonVariant, cardShadow, cardRadius,
      sidebarStyle, darkMode
    },
    heroTitle, heroSubtitle, heroTagline,   ← existing fields
    btn1Label, btn2Label, heroImage,        ← existing fields
    primaryColor, accentColor,              ← existing fields (AdminThemeContext)
  }
  updated_at:  timestamp
```

---

## Preset themes

| Preset | Primary | Secondary | Use case |
|--------|---------|-----------|----------|
| 🏛️ Barangay Official | `#1A365D` | `#D69E2E` | Default government look |
| 🌿 Emerald Green | `#065F46` | `#D97706` | Nature/eco focus |
| 💜 Royal Violet | `#4C1D95` | `#DB2777` | Modern/youth |
| 🌹 Deep Rose | `#9F1239` | `#D97706` | Festive/traditional |

---

## Troubleshooting

**Theme not persisting?**
- Check `site_settings` table exists and RLS allows writes for your admin user
- Check browser console for Supabase errors

**Fonts not loading?**
- ThemeContext injects a `<link>` tag for Google Fonts automatically
- Ensure CSP headers allow `fonts.googleapis.com`

**Live preview not updating?**
- Ensure `ThemeProvider` wraps the component (check App.jsx)
- CSS variables are set on `document.documentElement` so all descendants update

**Dark mode conflict?**
- AdminThemeContext dark mode affects admin panel inline styles
- ThemeContext dark mode affects CSS variables (user portal + CSS-var-based components)
- Both can coexist independently

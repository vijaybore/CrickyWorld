import { createContext, useContext, useState, useEffect } from 'react'

// ── All theme definitions (single source of truth) ───────────────────────────
export const THEMES = [
  {
    id: 'dark',
    name: 'Night Black',
    desc: 'Classic dark mode',
    emoji: '🖤',
    preview: ['#0a0a0a', '#1a1a1a', '#242424', '#ff4444'],
    vars: {
      '--bg':          '#0a0a0a',
      '--surface':     '#111111',
      '--card':        '#1a1a1a',
      '--card2':       '#202020',
      '--border':      'rgba(255,255,255,0.07)',
      '--border2':     'rgba(255,255,255,0.04)',
      '--text':        '#f0f0f0',
      '--text2':       '#c0c0c0',
      '--subtext':     '#777777',
      '--muted':       '#3a3a3a',
      '--accent':      '#ff4444',
      '--accent2':     '#cc0000',
      '--accentBg':    'rgba(204,0,0,0.13)',
      '--accentRing':  'rgba(255,68,68,0.22)',
      '--header':      '#161616',
      '--headerBdr':   'rgba(255,255,255,0.06)',
      '--headerText':  '#f0f0f0',
      '--inputBg':     '#0a0a0a',
      '--shadow':      'rgba(0,0,0,0.5)',
      '--hover':       'rgba(255,255,255,0.05)',
      '--hover2':      'rgba(255,255,255,0.08)',
      '--overlay':     'rgba(0,0,0,0.75)',
      '--cursor':      'default',
      '--scrollbar':   '#2a2a2a',
    }
  },
  {
    id: 'cricbuzz',
    name: 'Cricbuzz Green',
    desc: 'Green & white like Cricbuzz',
    emoji: '🟢',
    preview: ['#ffffff', '#f3f3f3', '#e8f5ee', '#1a7a4a'],
    vars: {
      '--bg':          '#f0f2f0',
      '--surface':     '#ffffff',
      '--card':        '#f7f9f7',
      '--card2':       '#eef2ee',
      '--border':      'rgba(26,122,74,0.15)',
      '--border2':     'rgba(0,0,0,0.06)',
      '--text':        '#111111',
      '--text2':       '#333333',
      '--subtext':     '#777777',
      '--muted':       '#cccccc',
      '--accent':      '#1a7a4a',
      '--accent2':     '#145f39',
      '--accentBg':    'rgba(26,122,74,0.1)',
      '--accentRing':  'rgba(26,122,74,0.22)',
      '--header':      '#1a7a4a',
      '--headerBdr':   'rgba(0,0,0,0.1)',
      '--headerText':  '#ffffff',
      '--inputBg':     '#ffffff',
      '--shadow':      'rgba(0,0,0,0.08)',
      '--hover':       'rgba(0,0,0,0.04)',
      '--hover2':      'rgba(0,0,0,0.08)',
      '--overlay':     'rgba(0,0,0,0.6)',
      '--scrollbar':   '#c0d4c8',
    }
  },
  {
    id: 'blue',
    name: 'Sky Blue',
    desc: 'White & blue clean look',
    emoji: '🔵',
    preview: ['#ffffff', '#f0f5ff', '#e8efff', '#2563eb'],
    vars: {
      '--bg':          '#eef2fb',
      '--surface':     '#ffffff',
      '--card':        '#f5f8ff',
      '--card2':       '#eaeffb',
      '--border':      'rgba(37,99,235,0.14)',
      '--border2':     'rgba(0,0,0,0.06)',
      '--text':        '#0f172a',
      '--text2':       '#1e3a5f',
      '--subtext':     '#6b7fa3',
      '--muted':       '#c8d4ea',
      '--accent':      '#2563eb',
      '--accent2':     '#1d4ed8',
      '--accentBg':    'rgba(37,99,235,0.1)',
      '--accentRing':  'rgba(37,99,235,0.22)',
      '--header':      '#2563eb',
      '--headerBdr':   'rgba(0,0,0,0.1)',
      '--headerText':  '#ffffff',
      '--inputBg':     '#ffffff',
      '--shadow':      'rgba(37,99,235,0.1)',
      '--hover':       'rgba(0,0,0,0.04)',
      '--hover2':      'rgba(37,99,235,0.08)',
      '--overlay':     'rgba(0,0,0,0.6)',
      '--scrollbar':   '#b8cef0',
    }
  },
  {
    id: 'white',
    name: 'Pure White',
    desc: 'Bright clean daylight',
    emoji: '⬜',
    preview: ['#f5f5f5', '#ffffff', '#ebebeb', '#e11d48'],
    vars: {
      '--bg':          '#f0f0f0',
      '--surface':     '#ffffff',
      '--card':        '#f8f8f8',
      '--card2':       '#efefef',
      '--border':      'rgba(0,0,0,0.09)',
      '--border2':     'rgba(0,0,0,0.05)',
      '--text':        '#111111',
      '--text2':       '#333333',
      '--subtext':     '#888888',
      '--muted':       '#cccccc',
      '--accent':      '#e11d48',
      '--accent2':     '#be123c',
      '--accentBg':    'rgba(225,29,72,0.08)',
      '--accentRing':  'rgba(225,29,72,0.2)',
      '--header':      '#ffffff',
      '--headerBdr':   'rgba(0,0,0,0.08)',
      '--headerText':  '#111111',
      '--inputBg':     '#ffffff',
      '--shadow':      'rgba(0,0,0,0.1)',
      '--hover':       'rgba(0,0,0,0.04)',
      '--hover2':      'rgba(0,0,0,0.07)',
      '--overlay':     'rgba(0,0,0,0.5)',
      '--scrollbar':   '#cccccc',
    }
  },
]

// Apply CSS vars to :root
function applyVars(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const root  = document.documentElement
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem('cw-theme') || 'dark'
    // Apply immediately — before first render — to avoid flash of wrong theme
    applyVars(saved)
    return saved
  })

  // Re-apply whenever themeId changes (on user selection)
  useEffect(() => { applyVars(themeId) }, [themeId])

  const setTheme = (id) => {
    localStorage.setItem('cw-theme', id)
    setThemeId(id)
  }

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  return (
    <ThemeContext.Provider value={{ themeId, theme, themes: THEMES, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
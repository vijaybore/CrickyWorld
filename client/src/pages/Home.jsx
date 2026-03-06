import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const tok = () => localStorage.getItem('token')
const H   = () => ({ Authorization: `Bearer ${tok()}` })

export default function Home() {
  const navigate    = useNavigate()
  const [liveCount, setLiveCount] = useState(0)

  // Fetch live match count — works even without login (no auth on matches route)
  useEffect(() => {
    axios.get('/api/matches')
      .then(r => setLiveCount((r.data || []).filter(m => m.status !== 'completed').length))
      .catch(() => {})
  }, [])

  const menuItems = [
    {
      icon: '🏏',
      iconBg: 'linear-gradient(135deg,#7f1d1d,#cc0000)',
      label: 'NEW MATCH',
      sub: 'Start a fresh cricket match',
      path: '/new-match',
    },
    {
      icon: '📂',
      iconBg: 'linear-gradient(135deg,#78350f,#d97706)',
      label: 'OPEN MATCH',
      sub: 'Resume an existing match',
      path: '/matches',
    },
    {
      icon: '🏆',
      iconBg: 'linear-gradient(135deg,#78350f,#ca8a04)',
      label: 'NEW TOURNAMENT',
      sub: 'Create a new tournament',
      path: '/new-tournament',
    },
    {
      icon: '🎯',
      iconBg: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
      label: 'OPEN TOURNAMENT',
      sub: 'Continue a tournament',
      path: '/tournaments',
      highlight: true,
    },
    {
      icon: '👤',
      iconBg: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
      label: 'PLAYERS',
      sub: 'Manage player profiles',
      path: '/players',
    },
    {
      icon: '📊',
      iconBg: 'linear-gradient(135deg,#1e3a5f,#0284c7)',
      label: 'RECORDS',
      sub: 'View stats & records',
      path: '/records',
    },
    {
      icon: '⚙️',
      iconBg: 'linear-gradient(135deg,#1f2937,#374151)',
      label: 'SETTINGS',
      sub: 'Themes, profile & more',
      path: '/settings',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:var(--bg,#0a0a0a); font-family:'Nunito',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:var(--surface,#111); }
        ::-webkit-scrollbar-thumb { background:var(--scrollbar,#2a2a2a); border-radius:2px; }
        .menu-item:hover { background: var(--hover2, rgba(255,255,255,0.08)) !important; }
        .menu-item:active { transform: scale(0.98); }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg,#0a0a0a)', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:500, minHeight:'100vh', background:'var(--surface,#111)', display:'flex', flexDirection:'column' }}>

          {/* ── WELCOME BANNER ── */}
          <div style={{
            padding: '28px 20px 24px',
            background: 'linear-gradient(145deg, var(--card,#1a1a1a) 0%, var(--card2,#202020) 100%)',
            borderBottom: '1px solid var(--border,rgba(255,255,255,0.07))',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* decorative bg */}
            <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'var(--accentBg,rgba(204,0,0,0.08))', pointerEvents:'none' }} />
            <div style={{ position:'absolute', right:20, top:10, fontSize:72, opacity:0.07, pointerEvents:'none', userSelect:'none' }}>🏏</div>

            <div style={{ position:'relative' }}>
              <div style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 26, fontWeight: 700,
                color: 'var(--accent,#ff4444)',
                letterSpacing: 0.5, marginBottom: 4,
              }}>
                Welcome to CrickyWorld 🏏
              </div>
              <div style={{ fontSize: 14, color: 'var(--subtext,#777)', fontWeight: 600, marginBottom: 16 }}>
                Your ball-by-ball cricket scorer
              </div>

              {/* live badge */}
              {liveCount > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 20, padding: '6px 14px',
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 6px #4ade80' }} />
                  <span style={{ fontSize:12, color:'#4ade80', fontWeight:800 }}>
                    {liveCount} Live Match{liveCount > 1 ? 'es' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── MENU LIST ── */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 40px', display:'flex', flexDirection:'column', gap:10 }}>
            {menuItems.map(item => (
              <MenuItem key={item.path} item={item} onClick={() => navigate(item.path)} />
            ))}
          </div>

        </div>
      </div>
    </>
  )
}

function MenuItem({ item, onClick }) {
  return (
    <div
      className="menu-item"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: item.highlight
          ? 'rgba(204,0,0,0.08)'
          : 'var(--card,#1a1a1a)',
        border: `1px solid ${item.highlight ? 'rgba(204,0,0,0.2)' : 'var(--border,rgba(255,255,255,0.07))'}`,
        borderRadius: 16, cursor: 'pointer',
        transition: 'transform 0.1s, background 0.15s',
      }}
    >
      {/* icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: item.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {item.icon}
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 16, fontWeight: 700, letterSpacing: 0.4,
          color: item.highlight ? 'var(--accent,#ff4444)' : 'var(--text,#f0f0f0)',
          marginBottom: 2,
        }}>
          {item.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--subtext,#777)', fontWeight: 600 }}>
          {item.sub}
        </div>
      </div>

      {/* chevron */}
      <span style={{ color: item.highlight ? 'var(--accent,#ff4444)' : 'var(--muted,#3a3a3a)', fontSize: 20, flexShrink: 0 }}>›</span>
    </div>
  )
}
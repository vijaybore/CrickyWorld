import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser]           = useState(null)
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    const token = localStorage.getItem('token')
    axios.get('/api/matches', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLiveCount(r.data.filter(m => m.status === 'innings1' || m.status === 'innings2').length))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const menuItems = [
    { icon:'✏️', iconBg:'rgba(204,0,0,0.18)',      label:'NEW MATCH',        sub:'Start a fresh cricket match',  path:'/create',                active:false },
    { icon:'📂', iconBg:'rgba(234,179,8,0.18)',     label:'OPEN MATCH',       sub:'Resume an existing match',     path:'/matches',               active:false },
    { icon:'🏆', iconBg:'rgba(234,179,8,0.18)',     label:'NEW TOURNAMENT',   sub:'Create a new tournament',      path:'/tournaments?mode=new',  active:false },
    { icon:'🎯', iconBg:'rgba(204,0,0,0.18)',       label:'OPEN TOURNAMENT',  sub:'Continue a tournament',        path:'/tournaments',           active:true  },
    { icon:'👤', iconBg:'rgba(147,51,234,0.18)',    label:'PLAYERS',          sub:'Manage player profiles',       path:'/players',               active:false },
    { icon:'📊', iconBg:'rgba(99,102,241,0.18)',    label:'RECORDS',          sub:'View stats & records',         path:'/records',               active:false },
    { icon:'⚙️', iconBg:'rgba(107,114,128,0.18)',   label:'SETTINGS',         sub:'App preferences',              path:'/settings',              active:false },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:var(--bg,#0a0a0a); font-family:'Nunito',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:var(--surface); }
        ::-webkit-scrollbar-thumb { background:var(--scrollbar,#2a2a2a); border-radius:2px; }
        .menu-row { transition: background 0.15s, transform 0.12s; }
        .menu-row:hover { background:var(--hover2,var(--border)) !important; transform:translateX(3px); }
        .menu-row:active { opacity:0.75; }
        @keyframes livepulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.8); }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:500, minHeight:'100vh', background:'var(--surface)', display:'flex', flexDirection:'column' }}>

          {/* ── Hero Banner ── */}
          <div style={{ margin:'16px 16px 0', background:'linear-gradient(135deg,var(--card),var(--card2))', border:'1px solid var(--accentRing,rgba(255,68,68,0.12))', borderRadius:18, padding:'22px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-10, top:-10, width:110, height:110, borderRadius:'50%', background:'rgba(204,0,0,0.05)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', right:14, top:14, fontSize:60, opacity:0.12, pointerEvents:'none', userSelect:'none' }}>🏟️</div>
            <div style={{ fontSize:11, color:'var(--accent)', fontWeight:800, letterSpacing:2, marginBottom:5 }}>
              WELCOME, {user?.name?.toUpperCase() || 'SPORTY'}
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--text)', lineHeight:1.25, marginBottom:16 }}>
              Ready to<br/>Play Cricket? <span style={{ fontSize:22 }}>🏏</span>
            </div>
            {liveCount > 0 ? (
              <div onClick={() => navigate('/matches')} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(204,0,0,0.2)', border:'1px solid rgba(204,0,0,0.35)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', display:'inline-block', animation:'livepulse 1.5s infinite' }}/>
                <span style={{ fontSize:12, color:'#ff8888', fontWeight:800 }}>⚡ {liveCount} Live Match{liveCount > 1 ? 'es' : ''}</span>
              </div>
            ) : (
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(204,0,0,0.12)', border:'1px solid rgba(204,0,0,0.25)', borderRadius:20, padding:'6px 14px' }}>
                <span style={{ fontSize:12, color:'#ff8888', fontWeight:800 }}>⚡ Live Scoring Available</span>
              </div>
            )}
          </div>

          {/* ── Menu ── */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 24px' }}>
            {menuItems.map((item, i) => (
              <div key={i} className="menu-row" onClick={() => navigate(item.path)}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'14px 16px', marginBottom:8, borderRadius:14, cursor:'pointer',
                  background: item.active ? 'rgba(204,0,0,0.1)' : 'var(--card)',
                  border: item.active ? '1px solid var(--accentRing)' : '1px solid var(--border)',
                }}>
                {/* icon box */}
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, background: item.active ? 'rgba(204,0,0,0.2)' : item.iconBg }}>
                  {item.icon}
                </div>
                {/* text */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, letterSpacing:0.4, color: item.active ? 'var(--accent)' : 'var(--text2)', marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:12, color:'var(--subtext)', fontWeight:600 }}>{item.sub}</div>
                </div>
                {/* arrow */}
                <span style={{ fontSize:18, color: item.active ? 'var(--accent)' : 'var(--muted)', fontWeight:800, flexShrink:0 }}>›</span>
              </div>
            ))}

            {/* Logout */}
            <button onClick={handleLogout}
              style={{ width:'100%', marginTop:6, padding:'15px', borderRadius:14, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7f1d1d,#991b1b)', color:'#ffaaaa', fontFamily:'Nunito,sans-serif', fontSize:14, fontWeight:800, letterSpacing:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              🚪 LOGOUT
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
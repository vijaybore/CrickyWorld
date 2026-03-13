import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'



// ── Proper Cricket Ball ───────────────────────────────────────────────────────
function CricketBall({ size = 60 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      position: 'relative', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 30%, #ff6b6b, #cc0000 45%, #7a0000)',
      boxShadow: '0 8px 32px rgba(204,0,0,0.6), inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,120,120,0.3)',
      animation: 'rotateBall 5s linear infinite',
    }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 100 100">
        {/* Left seam curve */}
        <path d="M50 3 C28 18, 18 38, 50 50 C82 62, 72 82, 50 97"
          fill="none" stroke="rgba(255,210,210,0.4)" strokeWidth="3" strokeLinecap="round"/>
        {/* Right seam curve */}
        <path d="M50 3 C72 18, 82 38, 50 50 C18 62, 28 82, 50 97"
          fill="none" stroke="rgba(255,210,210,0.4)" strokeWidth="3" strokeLinecap="round"/>
        {/* Left stitches */}
        {[16,25,34,43,52,61,70,79].map((y,i) => (
          <line key={`l${i}`}
            x1={i%2===0?19:21} y1={y} x2={i%2===0?23:25} y2={y+5}
            stroke="rgba(255,240,240,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
        ))}
        {/* Right stitches */}
        {[16,25,34,43,52,61,70,79].map((y,i) => (
          <line key={`r${i}`}
            x1={i%2===0?77:75} y1={y} x2={i%2===0?81:79} y2={y+5}
            stroke="rgba(255,240,240,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
        ))}
      </svg>
      {/* Main shine */}
      <div style={{
        position:'absolute', top:'12%', left:'16%',
        width:'32%', height:'24%', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
        transform:'rotate(-30deg)',
      }}/>
      {/* Small shine */}
      <div style={{
        position:'absolute', top:'30%', left:'25%',
        width:'12%', height:'9%', borderRadius:'50%',
        background:'rgba(255,255,255,0.22)',
      }}/>
    </div>
  )
}

// ── Live Date & Clock ─────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h  = now.getHours() % 12 || 12
  const m  = String(now.getMinutes()).padStart(2,'0')
  const ap = now.getHours() >= 12 ? 'PM' : 'AM'
  return (
    <div style={{
      display:'flex', alignItems:'stretch', gap:8, marginTop:14,
    }}>
      {/* Date card */}
      <div style={{
        flex:1, background:'rgba(255,255,255,0.05)',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:12, padding:'8px 12px',
      }}>
        <div style={{ fontSize:9, color:'#555', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>
          📅 Date
        </div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:'#e8e8e8', letterSpacing:1 }}>
          {days[now.getDay()].slice(0,3)}, {now.getDate()} {months[now.getMonth()]} {now.getFullYear()}
        </div>
      </div>
      {/* Time card */}
      <div style={{
        background:'rgba(255,68,68,0.1)',
        border:'1px solid rgba(255,68,68,0.22)',
        borderRadius:12, padding:'8px 16px',
        display:'flex', flexDirection:'column', justifyContent:'center',
      }}>
        <div style={{ fontSize:9, color:'#555', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>
          🕐 Time
        </div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:'#ff5555', letterSpacing:2 }}>
          {h}:{m} <span style={{ fontSize:12 }}>{ap}</span>
        </div>
      </div>
    </div>
  )
}

// ── Bottom Tab Bar ────────────────────────────────────────────────────────────
function BottomTabBar({ active, onNavigate }) {
  const tabs = [
    { id:'home',        emoji:'🏠', label:'Home',       path:'/' },
    { id:'matches',     emoji:'🏏', label:'Matches',    path:'/matches' },
    { id:'tournaments', emoji:'🏆', label:'Trophy',     path:'/tournaments' },
    { id:'players',     emoji:'👥', label:'Players',    path:'/players' },
    { id:'settings',    emoji:'⚙️', label:'Settings',   path:'/settings' },
  ]
  return (
    <div style={{
      position:'fixed', bottom:0,
      left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:500,
      background:'#0a0a0a',
      borderTop:'1px solid rgba(255,255,255,0.06)',
      display:'flex',
      paddingBottom:'env(safe-area-inset-bottom,4px)',
      zIndex:999,
    }}>
      {tabs.map(tab => {
        const on = active === tab.id
        return (
          <button key={tab.id} onClick={() => onNavigate(tab.path)} style={{
            flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            padding:'10px 4px 8px',
            background:'none', border:'none', cursor:'pointer',
            gap:3, WebkitTapHighlightColor:'transparent',
            position:'relative',
          }}>
            {/* Active indicator top */}
            {on && (
              <div style={{
                position:'absolute', top:0, left:'25%', right:'25%',
                height:2.5, borderRadius:'0 0 3px 3px',
                background:'linear-gradient(90deg, #ff4444, #ff8800)',
                boxShadow:'0 2px 8px rgba(255,68,68,0.6)',
              }}/>
            )}
            <div style={{
              width:36, height:36, borderRadius:12,
              background: on ? 'rgba(255,68,68,0.15)' : 'transparent',
              border: on ? '1px solid rgba(255,68,68,0.25)' : '1px solid transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18,
              filter: on ? 'none' : 'grayscale(1) opacity(0.35)',
              transform: on ? 'translateY(-1px)' : 'none',
              transition:'all 0.2s',
            }}>
              {tab.emoji}
            </div>
            <span style={{
              fontSize:9, fontWeight:700, letterSpacing:0.8,
              color: on ? '#ff4444' : '#333',
              textTransform:'uppercase',
              fontFamily:'Poppins,sans-serif',
              transition:'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main Home ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const [liveCount, setLiveCount] = useState(0)
  const [visible, setVisible]     = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/matches`)
      .then(r => setLiveCount((r.data||[]).filter(m=>m.status!=='completed').length))
      .catch(()=>{})
    setTimeout(()=>setVisible(true), 80)
  }, [])

  const menuItems = [
    {
      icon:'🏏', label:'New Match',      sub:'Start a fresh cricket match',
      path:'/new-match',
      gradient:'linear-gradient(135deg,#cc0000,#ff5555)',
      glow:'rgba(204,0,0,0.4)', featured:true,
    },
    {
      icon:'📂', label:'Open Match',     sub:'Resume an existing match',
      path:'/matches',
      gradient:'linear-gradient(135deg,#b45309,#f59e0b)',
      glow:'rgba(245,158,11,0.3)',
    },
    {
      icon:'🏆', label:'New Tournament', sub:'Create a new tournament',
      path:'/new-tournament',
      gradient:'linear-gradient(135deg,#92400e,#d97706)',
      glow:'rgba(217,119,6,0.3)',
    },
    {
      icon:'🎯', label:'Open Tournament',sub:'Continue a tournament',
      path:'/tournaments',
      gradient:'linear-gradient(135deg,#991b1b,#ef4444)',
      glow:'rgba(239,68,68,0.35)',
    },
    {
      icon:'👥', label:'Players',        sub:'Manage player profiles',
      path:'/players',
      gradient:'linear-gradient(135deg,#1e3a8a,#3b82f6)',
      glow:'rgba(59,130,246,0.3)',
    },
    {
      icon:'📊', label:'Records',        sub:'View stats & records',
      path:'/records',
      gradient:'linear-gradient(135deg,#155e75,#0ea5e9)',
      glow:'rgba(14,165,233,0.3)',
    },
    {
      icon:'⚙️', label:'Settings',       sub:'Themes, profile & more',
      path:'/settings',
      gradient:'linear-gradient(135deg,#374151,#6b7280)',
      glow:'rgba(107,114,128,0.25)',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;500;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html,body,#root{
          height:100%; background:#080808;
          font-family:'Poppins',sans-serif;
          -webkit-tap-highlight-color:transparent;
          overscroll-behavior:none;
        }
        @keyframes rotateBall{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,68,68,0.4)}50%{box-shadow:0 0 0 8px rgba(255,68,68,0)}}
        .mcard{transition:transform 0.14s,box-shadow 0.14s;-webkit-tap-highlight-color:transparent;}
        .mcard:active{transform:scale(0.965)!important;}
        ::-webkit-scrollbar{width:2px;}
        ::-webkit-scrollbar-thumb{background:#181818;border-radius:2px;}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#080808', display:'flex', justifyContent:'center' }}>
        <div style={{
          width:'100%', maxWidth:500, minHeight:'100vh',
          background:'#0c0c0c', display:'flex', flexDirection:'column',
          position:'relative',
        }}>

          {/* ── HEADER ── */}
          <div style={{
            position:'relative', overflow:'hidden',
            background:'linear-gradient(160deg,#180000 0%,#0e0e0e 55%)',
            padding:'30px 20px 20px',
            borderBottom:'1px solid rgba(255,255,255,0.05)',
          }}>
            {/* Background glow blob */}
            <div style={{
              position:'absolute', top:-80, right:-80, width:280, height:280,
              borderRadius:'50%',
              background:'radial-gradient(circle,rgba(200,0,0,0.2) 0%,transparent 65%)',
              pointerEvents:'none',
            }}/>
            {/* Bottom gradient line */}
            <div style={{
              position:'absolute', bottom:0, left:0, right:0, height:1,
              background:'linear-gradient(90deg,transparent 0%,#cc0000 30%,#ff6600 70%,transparent 100%)',
            }}/>

            <div style={{
              display:'flex', alignItems:'center',
              justifyContent:'space-between', position:'relative',
            }}>
              {/* Left side */}
              <div style={{ animation: visible?'fadeUp 0.45s ease both':'none' }}>
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  background:'rgba(255,68,68,0.1)',
                  border:'1px solid rgba(255,68,68,0.2)',
                  borderRadius:20, padding:'3px 10px', marginBottom:8,
                }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#ff4444', animation:'blink 1.5s infinite' }}/>
                  <span style={{ fontSize:9, color:'#ff6666', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>
                    Live Cricket Scorer
                  </span>
                </div>

                <div style={{
                  fontFamily:'Bebas Neue,sans-serif',
                  fontSize:44, lineHeight:0.95, letterSpacing:2,
                  background:'linear-gradient(135deg,#ffffff 0%,#ffcccc 35%,#ff4444 70%,#cc2200 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                  backgroundClip:'text',
                }}>
                  Cricky<br/>World
                </div>

                <div style={{ fontSize:11, color:'#444', fontWeight:500, marginTop:5, letterSpacing:0.3 }}>
                  Ball-by-ball cricket scoring
                </div>

                {/* Live match badge */}
                {liveCount > 0 && (
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:7,
                    background:'rgba(74,222,128,0.1)',
                    border:'1px solid rgba(74,222,128,0.25)',
                    borderRadius:20, padding:'5px 12px', marginTop:10,
                    animation:'glowPulse 2s infinite',
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80', animation:'blink 1s infinite' }}/>
                    <span style={{ fontSize:11, color:'#4ade80', fontWeight:700, letterSpacing:0.5 }}>
                      {liveCount} Live Match{liveCount>1?'es':''}
                    </span>
                  </div>
                )}
              </div>

              {/* Cricket Ball */}
              <div style={{
                animation: visible?'fadeUp 0.45s 0.1s ease both':'none',
                opacity: visible?1:0,
                filter:'drop-shadow(0 0 28px rgba(200,0,0,0.55))',
                marginRight:4,
              }}>
                <CricketBall size={80} />
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ animation: visible?'fadeUp 0.45s 0.15s ease both':'none', opacity:visible?1:0 }}>
              <LiveClock />
            </div>
          </div>

          {/* ── QUICK ACTIONS LABEL ── */}
          <div style={{ padding:'14px 20px 6px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
            <span style={{
              fontSize:10, fontWeight:700, letterSpacing:2,
              color:'#2d2d2d', textTransform:'uppercase', fontFamily:'Poppins,sans-serif',
            }}>
              Quick Actions
            </span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
          </div>

          {/* ── MENU CARDS ── */}
          <div style={{
            flex:1, overflowY:'auto',
            padding:'4px 14px 100px',
            display:'flex', flexDirection:'column', gap:8,
          }}>
            {menuItems.map((item, i) => (
              <div
                key={item.path}
                className="mcard"
                onClick={() => navigate(item.path)}
                style={{
                  display:'flex', alignItems:'center', gap:0,
                  background: item.featured
                    ? 'linear-gradient(135deg,rgba(180,0,0,0.2),rgba(255,68,68,0.07))'
                    : 'rgba(255,255,255,0.025)',
                  border:`1px solid ${item.featured?'rgba(255,68,68,0.28)':'rgba(255,255,255,0.05)'}`,
                  borderRadius:16, cursor:'pointer', overflow:'hidden',
                  animation: visible?`fadeUp 0.4s ${0.1+i*0.05}s ease both`:'none',
                  opacity: visible?1:0,
                  boxShadow: item.featured?`0 4px 20px ${item.glow}`:'none',
                  minHeight:64,
                }}
              >
                {/* Left color strip */}
                <div style={{
                  width:4, alignSelf:'stretch', flexShrink:0,
                  background: item.gradient,
                  boxShadow:`2px 0 10px ${item.glow}`,
                }}/>

                {/* Icon */}
                <div style={{
                  width:44, height:44, borderRadius:12, flexShrink:0,
                  background: item.gradient,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, margin:'0 12px',
                  boxShadow:`0 4px 14px ${item.glow}`,
                }}>
                  {item.icon}
                </div>

                {/* Text */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontFamily:'Bebas Neue,sans-serif', fontSize:17, letterSpacing:1,
                    color: item.featured?'#ff7777':'#dddddd', lineHeight:1.2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:11, color:'#383838', fontWeight:500, marginTop:1 }}>
                    {item.sub}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  width:28, height:28, borderRadius:9, flexShrink:0, marginRight:12,
                  background: item.featured?'rgba(255,68,68,0.12)':'rgba(255,255,255,0.04)',
                  border:`1px solid ${item.featured?'rgba(255,68,68,0.25)':'rgba(255,255,255,0.06)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span style={{ color:item.featured?'#ff4444':'#2e2e2e', fontSize:17, fontWeight:700, lineHeight:1 }}>›</span>
                </div>
              </div>
            ))}

            <div style={{
              textAlign:'center', padding:'14px 0 4px',
              fontSize:10, color:'#191919', letterSpacing:2,
              fontFamily:'Bebas Neue,sans-serif',
            }}>
              CRICKYWORLD • v1.0.0 • MADE IN INDIA 🇮🇳
            </div>
          </div>

          {/* ── BOTTOM TAB BAR ── */}
          <BottomTabBar active="home" onNavigate={navigate} />
        </div>
      </div>
    </>
  )
}
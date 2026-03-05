import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const fmt = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`
const crr  = (runs, balls) => balls === 0 ? '0.0' : (runs / (balls / 6)).toFixed(1)
const rrr  = (target, runs, balls, totalOvers) => {
  const remBalls = totalOvers * 6 - balls
  if (remBalls <= 0) return '-'
  return ((target - runs) / (remBalls / 6)).toFixed(1)
}

function BallDot({ ball }) {
  let bg = '#2a2a2a', color = '#888', text = ball.runs.toString()
  if (ball.isWicket)       { bg = '#7f1d1d'; color = '#ff4444'; text = 'W' }
  else if (ball.isWide)    { bg = '#1e3a5f'; color = '#60a5fa'; text = `Wd${ball.runs > 1 ? '+' + (ball.runs-1) : ''}` }
  else if (ball.isNoBall)  { bg = '#3b1f00'; color = '#fb923c'; text = `NB${ball.runs > 1 ? '+' + (ball.runs-1) : ''}` }
  else if (ball.runs === 4){ bg = '#14532d'; color = '#4ade80'; text = '4' }
  else if (ball.runs === 6){ bg = '#3b0764'; color = '#c084fc'; text = '6' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:32, height:32, borderRadius:'50%',
      background: bg, color, fontSize:11, fontWeight:800,
      border:`1px solid ${color}33`, flexShrink:0
    }}>{text}</span>
  )
}

// ─── Player Picker Modal ────────────────────────────────────────────────────
function PlayerPicker({ picker, pickerInput, setPickerInput, innings, striker, nonStriker, currentBowler, onSelect, onClose }) {
  if (!picker) return null

  const isBowler = picker === 'bowler'
  const accentColor = isBowler ? '#fb923c' : '#60a5fa'
  const title = picker === 'striker' ? 'SET STRIKER' : picker === 'nonStriker' ? 'SET NON-STRIKER' : 'SET BOWLER'

  const existing = isBowler
    ? (innings.bowlingStats?.map(p => p.name) || [])
    : (innings.battingStats?.filter(p => !p.isOut).map(p => p.name) || [])

  const filtered = existing.filter(n => n.toLowerCase().includes(pickerInput.toLowerCase()))

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:500, background:'#1a1a1a', borderRadius:'20px 20px 0 0', padding:'20px 16px 36px', border:'1px solid rgba(255,255,255,0.08)' }}
      >
        {/* handle bar */}
        <div style={{ width:40, height:4, background:'#333', borderRadius:2, margin:'0 auto 18px' }} />

        <div style={{ fontSize:12, color:'#555', fontWeight:800, letterSpacing:1.5, marginBottom:14 }}>{title}</div>

        {/* text input */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input
            autoFocus
            value={pickerInput}
            onChange={e => setPickerInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && pickerInput.trim()) onSelect(pickerInput.trim()) }}
            placeholder="Type a new name..."
            style={{ flex:1, background:'#111', border:`1px solid ${accentColor}55`, borderRadius:10, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none' }}
          />
          <button
            onClick={() => { if (pickerInput.trim()) onSelect(pickerInput.trim()) }}
            style={{ padding:'11px 18px', borderRadius:10, background: isBowler ? '#b45309' : '#1d4ed8', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}
          >Set</button>
        </div>

        {/* existing players list */}
        {filtered.length > 0 && (
          <>
            <div style={{ fontSize:10, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>
              {isBowler ? 'EXISTING BOWLERS' : 'ACTIVE BATTERS'}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto' }}>
              {filtered.map(name => {
                const isCurrent =
                  (picker === 'striker' && name === striker) ||
                  (picker === 'nonStriker' && name === nonStriker) ||
                  (picker === 'bowler' && name === currentBowler)
                return (
                  <button
                    key={name}
                    onClick={() => onSelect(name)}
                    style={{
                      padding:'12px 14px', borderRadius:10, textAlign:'left',
                      background: isCurrent ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${isCurrent ? accentColor + '55' : 'rgba(255,255,255,0.07)'}`,
                      color:'#f0f0f0', fontWeight:700, fontSize:14, cursor:'pointer',
                      display:'flex', justifyContent:'space-between', alignItems:'center'
                    }}
                  >
                    <span>{name}</span>
                    {isCurrent && <span style={{ fontSize:11, color: accentColor, fontWeight:800 }}>current</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {filtered.length === 0 && pickerInput.trim() && (
          <div style={{ fontSize:13, color:'#555', textAlign:'center', padding:'12px 0' }}>
            Press Set to add "{pickerInput}" as new player
          </div>
        )}

        <button
          onClick={onClose}
          style={{ marginTop:16, width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#666', fontWeight:700, fontSize:13, cursor:'pointer' }}
        >Cancel</button>
      </div>
    </div>
  )
}

// ─── Tab: Scoring ──────────────────────────────────────────────────────────
function ScoringTab({ match, onBall, onUndo, onEndInnings, loading }) {
  const [extras, setExtras]               = useState({ wide:false, noBall:false, byes:false, legByes:false })
  const [runs, setRuns]                   = useState(null)
  const [wicket, setWicket]               = useState(false)
  const [wicketType, setWicketType]       = useState('Wicket')
  const [assistPlayer, setAssistPlayer]   = useState('')
  const [showWicketMenu, setShowWicketMenu] = useState(false)
  const [batsman, setBatsman]             = useState('')
  const [nonStrikerName, setNonStrikerName] = useState('')
  const [bowler, setBowler]               = useState('')
  const [picker, setPicker]               = useState(null)
  const [pickerInput, setPickerInput]     = useState('')
  const [newBatsmanModal, setNewBatsmanModal] = useState(false)
  const [newBatsmanInput, setNewBatsmanInput] = useState('')
  const [pendingBallData, setPendingBallData] = useState(null)

  const WICKET_TYPES = ['Wicket','Caught','Bowled','Stumped','RunOut(Striker)','RunOut(Non-Striker)','LBW','Hit-Wicket','Obstructing Field','Handling the ball']
  const ASSIST_TYPES = ['Caught','Stumped','RunOut(Striker)','RunOut(Non-Striker)']

  const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2'
  const innings    = match[inningsKey]
  const isInnings2 = match.status === 'innings2'
  const target     = isInnings2 ? match.innings1.runs + 1 : null

  const activeBatters  = innings.battingStats?.filter(p => !p.isOut) || []
  const allPlayers     = innings.battingStats?.map(p => p.name) || []
  const striker        = batsman        || activeBatters[0]?.name || ''
  const nonStriker     = nonStrikerName || activeBatters.find(p => p.name !== striker)?.name || ''
  const currentBowler  = bowler         || innings.bowlingStats?.slice(-1)[0]?.name || ''

  const strikerStats    = innings.battingStats?.find(p => p.name === striker)
  const nonStrikerStats = innings.battingStats?.find(p => p.name === nonStriker)
  const bowlerStats     = innings.bowlingStats?.find(p => p.name === currentBowler)

  const legalBalls = innings.ballByBall?.filter(b => !b.isWide && !b.isNoBall) || []
  const overBalls  = legalBalls.slice(-6)
  const overRuns   = overBalls.reduce((s, b) => s + (b.runs || 0), 0)

  const toggle = (key) => setExtras(e => ({ ...e, [key]: !e[key] }))

  // When wicket is toggled ON, auto-select 0 runs so OK is immediately enabled
  const handleWicketToggle = () => {
    const newVal = !wicket
    setWicket(newVal)
    if (newVal && runs === null) setRuns(0)
    if (!newVal) { setWicketType('Wicket'); setAssistPlayer('') }
  }

  // Close wicket menu on outside click
  useEffect(() => {
    if (!showWicketMenu) return
    const close = () => setShowWicketMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showWicketMenu])

  const handleOK = () => {
    if (runs === null) return
    const isWide   = extras.wide
    const isNoBall = extras.noBall
    const extraRuns = (isWide || isNoBall) ? 1 : 0

    const ballData = {
      runs, isWicket: wicket,
      wicketType: wicket ? wicketType : null,
      assistPlayer: wicket && ASSIST_TYPES.includes(wicketType) ? assistPlayer : null,
      isWide, isNoBall, extraRuns,
      batsmanName: striker, bowlerName: currentBowler
    }

    if (wicket) {
      setPendingBallData(ballData)
      setNewBatsmanInput('')
      setNewBatsmanModal(true)
    } else {
      submitBall(ballData, null)
    }
  }

  const submitBall = (ballData, newBatsmanName) => {
    onBall(ballData)
    const isWide   = ballData.isWide
    const isNoBall = ballData.isNoBall
    const r        = ballData.runs

    if (!isWide && !isNoBall && r % 2 !== 0) {
      const s  = batsman        || activeBatters[0]?.name || ''
      const ns = nonStrikerName || activeBatters.find(p => p.name !== s)?.name || ''
      if (newBatsmanName) { setBatsman(ns); setNonStrikerName(newBatsmanName) }
      else                { setBatsman(ns); setNonStrikerName(s) }
    } else {
      if (newBatsmanName) setBatsman(newBatsmanName)
    }

    setExtras({ wide:false, noBall:false, byes:false, legByes:false })
    setRuns(null)
    setWicket(false)
    setWicketType('Wicket')
    setAssistPlayer('')
    setPendingBallData(null)
  }

  const handleNewBatsmanConfirm = () => {
    const name = newBatsmanInput.trim()
    if (!name) return
    setNewBatsmanModal(false)
    submitBall(pendingBallData, name)
  }

  const handleSwitchBat = () => { setBatsman(nonStriker || ''); setNonStrikerName(striker || '') }

  const handleRetire = () => {
    if (!striker) return
    if (!window.confirm('Retire ' + striker + '?')) return
    setBatsman('')
    openPicker('striker')
  }

  const openPicker   = (type) => { setPicker(type); setPickerInput('') }
  const handlePickerSelect = (name) => {
    if (picker === 'striker')         setBatsman(name)
    else if (picker === 'nonStriker') setNonStrikerName(name)
    else if (picker === 'bowler')     setBowler(name)
    setPicker(null); setPickerInput('')
  }

  const okEnabled = runs !== null && !loading

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, paddingBottom:8 }}>

      {/* ── New Batsman Modal ── */}
      {newBatsmanModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ width:'100%', maxWidth:360, background:'#1c1c1c', borderRadius:20, padding:'28px 20px 24px', border:'1px solid rgba(255,68,68,0.35)', boxShadow:'0 24px 64px rgba(0,0,0,0.8)' }}>
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{ fontSize:40, marginBottom:6 }}>💀</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:22, fontWeight:700, color:'#ff4444', letterSpacing:1 }}>WICKET!</div>
              <div style={{ fontSize:13, color:'#888', marginTop:4 }}>{striker} — {pendingBallData?.wicketType || 'Out'}</div>
              <div style={{ fontSize:12, color:'#555', marginTop:2 }}>Next batsman?</div>
            </div>
            <input autoFocus value={newBatsmanInput} onChange={e => setNewBatsmanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewBatsmanConfirm()}
              placeholder="Enter batsman name..."
              style={{ width:'100%', background:'#111', border:'1.5px solid rgba(255,68,68,0.4)', borderRadius:11, padding:'13px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box', marginBottom:12 }}
            />
            <button onClick={handleNewBatsmanConfirm} disabled={!newBatsmanInput.trim()} style={{
              width:'100%', padding:'14px', borderRadius:11,
              background: newBatsmanInput.trim() ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#2a2a2a',
              border:'none', color: newBatsmanInput.trim() ? '#fff' : '#555',
              fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:800,
              cursor: newBatsmanInput.trim() ? 'pointer' : 'not-allowed',
              boxShadow: newBatsmanInput.trim() ? '0 4px 16px rgba(204,0,0,0.4)' : 'none'
            }}>✓ CONFIRM</button>
          </div>
        </div>
      )}

      {/* Player Picker Modal */}
      <PlayerPicker picker={picker} pickerInput={pickerInput} setPickerInput={setPickerInput}
        innings={innings} striker={striker} nonStriker={nonStriker} currentBowler={currentBowler}
        onSelect={handlePickerSelect} onClose={() => { setPicker(null); setPickerInput('') }} />

      {/* ── SCORE HEADER ── */}
      <div style={{ margin:'10px 12px 0', background:'linear-gradient(135deg,#1c1c1c,#1a1a1a)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:11, color:'#666', fontWeight:800, letterSpacing:0.5, marginBottom:2 }}>
            {innings.battingTeam} • Innings {isInnings2 ? 2 : 1}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:36, fontWeight:700, color:'#fff', lineHeight:1 }}>
              {innings.runs}<span style={{ fontSize:24, color:'#555' }}>/{innings.wickets}</span>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#555', marginTop:3 }}>
            ({fmt(innings.balls)} ov)
            {isInnings2 && target && (
              <span style={{ color:'#60a5fa', marginLeft:6 }}>Need {target - innings.runs} off {match.overs * 6 - innings.balls} balls</span>
            )}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'#ff4444', fontWeight:800, letterSpacing:1 }}>CRR</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:28, fontWeight:700, color:'#fff' }}>
            {crr(innings.runs, innings.balls)}
          </div>
          {isInnings2 && target && (
            <>
              <div style={{ fontSize:10, color:'#facc15', fontWeight:800, letterSpacing:1, marginTop:2 }}>RRR</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color:'#facc15' }}>
                {rrr(target, innings.runs, innings.balls, match.overs)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── BATTER / BOWLER CARD ── */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
        {/* headers */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 38px 38px 44px', padding:'5px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize:10, color:'#444', fontWeight:800, letterSpacing:0.5 }}>BATTER</span>
          {['R','B','SR'].map(h => <span key={h} style={{ fontSize:10, color:'#444', fontWeight:800, textAlign:'center' }}>{h}</span>)}
        </div>
        {/* striker */}
        <div onClick={() => openPicker('striker')} style={{ display:'grid', gridTemplateColumns:'1fr 38px 38px 44px', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center', cursor:'pointer', transition:'background 0.1s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', flexShrink:0, boxShadow:'0 0 6px #4ade8088' }}/>
            <span style={{ fontSize:14, color: striker ? '#fff' : '#3a3a3a', fontWeight:800 }}>
              {striker || 'Set striker'}
              {striker && <span style={{ color:'#4ade80', fontSize:12 }}> *</span>}
            </span>
            {!striker && <span style={{ fontSize:11, color:'#2a2a2a' }}>tap ✎</span>}
          </div>
          <span style={{ fontSize:15, color:'#fff', fontWeight:800, textAlign:'center' }}>{strikerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#777', textAlign:'center' }}>{strikerStats?.balls ?? 0}</span>
          <span style={{ fontSize:12, color:'#666', textAlign:'center' }}>{strikerStats?.balls > 0 ? (strikerStats.runs/strikerStats.balls*100).toFixed(0) : '—'}</span>
        </div>
        {/* non-striker */}
        <div onClick={() => openPicker('nonStriker')} style={{ display:'grid', gridTemplateColumns:'1fr 38px 38px 44px', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#444', flexShrink:0 }}/>
            <span style={{ fontSize:14, color: nonStriker ? '#ccc' : '#3a3a3a', fontWeight:700 }}>
              {nonStriker || 'Set non-striker'}
            </span>
          </div>
          <span style={{ fontSize:15, color:'#ddd', fontWeight:800, textAlign:'center' }}>{nonStrikerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#777', textAlign:'center' }}>{nonStrikerStats?.balls ?? 0}</span>
          <span style={{ fontSize:12, color:'#666', textAlign:'center' }}>{nonStrikerStats?.balls > 0 ? (nonStrikerStats.runs/nonStrikerStats.balls*100).toFixed(0) : '—'}</span>
        </div>
        {/* bowler */}
        <div onClick={() => openPicker('bowler')} style={{ display:'grid', gridTemplateColumns:'1fr 38px 38px 38px 44px', padding:'8px 14px', alignItems:'center', cursor:'pointer', background:'rgba(251,146,60,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:10, color:'#fb923c', fontWeight:800, letterSpacing:0.5 }}>BOWLER</span>
            <span style={{ fontSize:14, color: currentBowler ? '#fb923c' : '#3a3a3a', fontWeight:700 }}>{currentBowler || 'Set bowler'}</span>
          </div>
          <span style={{ fontSize:12, color:'#777', textAlign:'center' }}>{fmt(bowlerStats?.balls ?? 0)}</span>
          <span style={{ fontSize:12, color:'#777', textAlign:'center' }}>{bowlerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#ff4444', fontWeight:800, textAlign:'center' }}>{bowlerStats?.wickets ?? 0}</span>
          <span style={{ fontSize:12, color:'#60a5fa', textAlign:'center' }}>{bowlerStats?.wides ?? 0}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 38px 38px 38px 44px', padding:'2px 14px 5px' }}>
          <span/>
          {['O','R','W','Wd'].map(l => <span key={l} style={{ fontSize:9, color:'#333', fontWeight:800, textAlign:'center' }}>{l}</span>)}
        </div>
      </div>

      {/* ── THIS OVER ── */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'10px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:10, color:'#444', fontWeight:800, letterSpacing:1 }}>THIS OVER</span>
          {overBalls.length > 0 && (
            <span style={{ fontSize:11, color:'#666', fontWeight:700 }}>{overRuns} runs</span>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', minHeight:30 }}>
          {overBalls.length === 0
            ? <span style={{ color:'#2a2a2a', fontSize:12 }}>No balls bowled yet</span>
            : overBalls.map((b,i) => <BallDot key={i} ball={b} />)
          }
        </div>
      </div>

      {/* ── EXTRAS ── */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'10px 14px', display:'flex', gap:0, justifyContent:'space-around' }}>
        {[
          { key:'wide',    label:'Wide',    color:'#60a5fa' },
          { key:'noBall',  label:'No Ball', color:'#fb923c' },
          { key:'byes',    label:'Byes',    color:'#a3e635' },
          { key:'legByes', label:'Leg Byes',color:'#e879f9' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => toggle(key)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:5,
            padding:'6px 10px', borderRadius:10, border:'none', cursor:'pointer',
            background: extras[key] ? color + '18' : 'transparent',
          }}>
            <div style={{
              width:22, height:22, borderRadius:6,
              border:`2px solid ${extras[key] ? color : '#2a2a2a'}`,
              background: extras[key] ? color + '33' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s'
            }}>
              {extras[key] && <span style={{ fontSize:12, color }}>✓</span>}
            </div>
            <span style={{ fontSize:10, color: extras[key] ? color : '#555', fontWeight:800, whiteSpace:'nowrap' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── RUN BUTTONS ── */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:6 }}>
        {[0,1,2,3,4,5,6].map(r => {
          const isSelected = runs === r
          const colors = {
            4: { bg:'#14532d', border:'#4ade80', text:'#4ade80' },
            6: { bg:'#3b0764', border:'#c084fc', text:'#c084fc' },
          }
          const c = colors[r] || { bg:'#cc0000', border:'#ff4444', text:'#fff' }
          return (
            <button key={r} onClick={() => setRuns(r)} style={{
              flex:1, height:46, borderRadius:12,
              background: isSelected ? c.bg : '#1a1a1a',
              border: `2px solid ${isSelected ? c.border : '#2a2a2a'}`,
              color: isSelected ? c.text : '#555',
              fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700,
              cursor:'pointer', transition:'all 0.1s',
              boxShadow: isSelected ? `0 2px 10px ${c.border}44` : 'none'
            }}>{r}</button>
          )
        })}
      </div>

      {/* ── WICKET ROW ── */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8, position:'relative', alignItems:'stretch' }}>
        {/* Wicket toggle */}
        <button onClick={handleWicketToggle} style={{
          width:86, borderRadius:11, flexShrink:0,
          background: wicket ? 'rgba(127,29,29,0.6)' : '#1a1a1a',
          border: `2px solid ${wicket ? '#ff4444' : '#2a2a2a'}`,
          color: wicket ? '#ff4444' : '#555',
          fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700,
          cursor:'pointer', transition:'all 0.15s',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:'8px 0'
        }}>
          <span style={{ fontSize:18 }}>{wicket ? '💀' : '🏏'}</span>
          <span>{wicket ? 'W ON' : 'WICKET'}</span>
        </button>

        {/* Wicket type dropdown */}
        <div style={{ flex:1, position:'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); if (wicket) setShowWicketMenu(s => !s) }} style={{
            width:'100%', height:'100%', minHeight:58, borderRadius:11,
            background: wicket ? 'rgba(127,29,29,0.25)' : '#1a1a1a',
            border: `2px solid ${wicket ? '#ff444444' : '#2a2a2a'}`,
            color: wicket ? '#ff9999' : '#333',
            fontFamily:'Rajdhani,sans-serif', fontSize:14, fontWeight:700,
            cursor: wicket ? 'pointer' : 'default',
            display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px'
          }}>
            <span>{wicketType}</span>
            {wicket && <span style={{ fontSize:10, color:'#ff4444' }}>▼</span>}
          </button>
          {showWicketMenu && wicket && (
            <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:0, right:0, zIndex:300, background:'#1e1e1e', border:'1px solid rgba(255,68,68,0.3)', borderRadius:12, overflow:'hidden', boxShadow:'0 -8px 32px rgba(0,0,0,0.8)' }}>
              {WICKET_TYPES.map(type => (
                <button key={type} onClick={() => { setWicketType(type); setAssistPlayer(''); setShowWicketMenu(false) }} style={{
                  display:'block', width:'100%', padding:'11px 16px', textAlign:'left',
                  background: wicketType===type ? 'rgba(255,68,68,0.15)' : 'transparent',
                  border:'none', borderBottom:'1px solid rgba(255,255,255,0.04)',
                  color: wicketType===type ? '#ff6666' : '#ccc',
                  fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700, cursor:'pointer'
                }}>{type}</button>
              ))}
            </div>
          )}
        </div>

        {/* OK button */}
        <button onClick={handleOK} disabled={!okEnabled} style={{
          width:68, borderRadius:11, flexShrink:0,
          background: okEnabled ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#1a1a1a',
          border: `2px solid ${okEnabled ? '#ff4444' : '#2a2a2a'}`,
          color: okEnabled ? '#fff' : '#333',
          fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:800, letterSpacing:1,
          cursor: okEnabled ? 'pointer' : 'not-allowed',
          boxShadow: okEnabled ? '0 4px 16px rgba(204,0,0,0.5)' : 'none',
          transition:'all 0.15s'
        }}>OK</button>
      </div>

      {/* ── ASSIST (Caught/Stumped/Run Out) ── */}
      {wicket && ASSIST_TYPES.includes(wicketType) && (
        <div style={{ margin:'6px 12px 0', background:'rgba(127,29,29,0.12)', border:'1px solid rgba(255,68,68,0.15)', borderRadius:11, padding:'10px 14px' }}>
          <div style={{ fontSize:10, color:'#ff6666', fontWeight:800, letterSpacing:1, marginBottom:8 }}>
            {wicketType.startsWith('RunOut') ? '⚡ RUN OUT BY' : wicketType === 'Stumped' ? '🧤 STUMPED BY' : '🙌 CAUGHT BY'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={assistPlayer} onChange={e => setAssistPlayer(e.target.value)}
              placeholder="Fielder / keeper name..."
              style={{ flex:1, background:'#111', border:'1px solid rgba(255,68,68,0.25)', borderRadius:9, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }}
            />
          </div>
          {innings.bowlingStats?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {innings.bowlingStats.map(p => (
                <button key={p.name} onClick={() => setAssistPlayer(p.name)} style={{
                  padding:'5px 10px', borderRadius:7,
                  background: assistPlayer===p.name ? 'rgba(255,68,68,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${assistPlayer===p.name ? '#ff444455' : 'rgba(255,255,255,0.07)'}`,
                  color: assistPlayer===p.name ? '#ff9999' : '#777',
                  fontSize:12, fontWeight:700, cursor:'pointer'
                }}>{p.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ margin:'8px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { label:'RETIRE',       fn: handleRetire,  color:'#666' },
          { label:'SWITCH BAT',   fn: handleSwitchBat, color:'#666' },
          { label:'END INNINGS',  fn: onEndInnings,  color:'#666' },
        ].map(({ label, fn, color }) => (
          <button key={label} onClick={fn} style={{
            height:40, borderRadius:10,
            background:'#1a1a1a', border:'1px solid #2a2a2a',
            color, fontFamily:'Rajdhani,sans-serif', fontSize:11, fontWeight:800,
            letterSpacing:0.3, cursor:'pointer'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ margin:'8px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <button onClick={onUndo} style={{
          height:40, borderRadius:10, background:'#1a1a1a', border:'1px solid #2a2a2a',
          color:'#777', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'
        }}>⟲ UNDO</button>
        <button onClick={() => alert('Use UNDO to correct the last ball')} style={{
          height:40, borderRadius:10, background:'rgba(255,68,68,0.06)', border:'1px solid rgba(255,68,68,0.18)',
          color:'#ff6666', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'
        }}>EDIT BALL</button>
      </div>

    </div>
  )
}

// ─── Tab: Scorecard ─────────────────────────────────────────────────────────
function ScorecardTab({ match }) {
  const [activeInnings, setActiveInnings] = useState('innings1')
  const [showOvers, setShowOvers] = useState(false)

  const fmt = (balls) => `${Math.floor(balls/6)}.${balls%6}`

  // Build Fall of Wickets from ballByBall
  const buildFOW = (inn) => {
    if (!inn?.ballByBall) return []
    const fow = []
    let runs = 0, balls = 0, wkts = 0
    inn.ballByBall.forEach(b => {
      runs  += b.runs || 0
      if (!b.isWide && !b.isNoBall) balls++
      if (b.isWicket) {
        wkts++
        fow.push({ score: runs, wicket: wkts, over: fmt(balls), batsmanName: b.batsmanName })
      }
    })
    return fow
  }

  // Build over-by-over summary
  const buildOvers = (inn) => {
    if (!inn?.ballByBall) return []
    const overs = []
    let overBalls = [], overRuns = 0, overWkts = 0, legalCount = 0, overNum = 0
    inn.ballByBall.forEach(b => {
      overBalls.push(b)
      overRuns += b.runs || 0
      if (b.isWicket) overWkts++
      if (!b.isWide && !b.isNoBall) {
        legalCount++
        if (legalCount % 6 === 0) {
          overs.push({ over: overNum + 1, runs: overRuns, wickets: overWkts, balls: [...overBalls] })
          overBalls = []; overRuns = 0; overWkts = 0; overNum++
        }
      }
    })
    if (overBalls.length > 0) overs.push({ over: overNum + 1, runs: overRuns, wickets: overWkts, balls: overBalls })
    return overs
  }

  // Build partnerships
  const buildPartnerships = (inn) => {
    if (!inn?.battingStats || inn.battingStats.length < 2) return []
    const pairs = []
    for (let i = 0; i < inn.battingStats.length - 1; i++) {
      const b1 = inn.battingStats[i]
      const b2 = inn.battingStats[i + 1]
      if (b1 && b2) pairs.push({ b1, b2 })
    }
    return pairs
  }

  const renderInnings = (key) => {
    const inn = match[key]
    if (!inn || (!inn.battingStats?.length && !inn.bowlingStats?.length)) return (
      <div style={{ padding:40, textAlign:'center', color:'#aaa', fontSize:13 }}>No data yet</div>
    )

    const fow          = buildFOW(inn)
    const overs        = buildOvers(inn)
    const partnerships = buildPartnerships(inn)
    const wides        = inn.ballByBall?.filter(b => b.isWide).length   || 0
    const noBalls      = inn.ballByBall?.filter(b => b.isNoBall).length || 0
    const extras       = wides + noBalls
    const teamPlayers  = (key === 'innings1' ? match.team1Players : match.team2Players) || []
    const dnb          = teamPlayers.filter(p => !(inn.battingStats||[]).find(s => s.name === p))

    const dismissalText = (p) => {
      if (!p.isOut) return null
      if (!p.wicketType || p.wicketType === 'Wicket') return 'out'
      const wt = p.wicketType
      if (wt === 'Bowled')              return `b ${p.bowlerName || ''}`
      if (wt === 'LBW')                 return `lbw b ${p.bowlerName || ''}`
      if (wt === 'Caught')              return `c ${p.assistPlayer || ''} b ${p.bowlerName || ''}`
      if (wt === 'Stumped')             return `st ${p.assistPlayer || ''} b ${p.bowlerName || ''}`
      if (wt === 'Hit-Wicket')          return `hit wicket b ${p.bowlerName || ''}`
      if (wt.startsWith('RunOut'))      return `run out (${p.assistPlayer || ''})`
      return wt.toLowerCase()
    }

    const SectionHeader = ({ title, right }) => (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'#1a1a1a', borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize:12, fontWeight:800, color:'#aaa', letterSpacing:0.5 }}>{title}</span>
        {right && <span style={{ fontSize:11, color:'#888' }}>{right}</span>}
      </div>
    )

    return (
      <div style={{ background:'#1a1a1a', paddingBottom:16 }}>

        {/* ── INNINGS HEADER ── */}
        <div style={{ background:'#1a1a1a', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, color:'#aaa', fontWeight:700, marginBottom:2 }}>{key === 'innings1' ? '1st Innings' : '2nd Innings'}</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{inn.battingTeam}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:26, fontWeight:700, color:'#fff', lineHeight:1 }}>
              {inn.runs}-{inn.wickets}
            </div>
            <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>({fmt(inn.balls)} ov)</div>
          </div>
        </div>

        {/* ── BATTING TABLE ── */}
        <SectionHeader title="BATTING" right={`${inn.battingStats?.length || 0} batters`} />
        {/* col headers */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 32px 32px 44px 20px', padding:'5px 14px', background:'#1e1e1e', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:11, color:'#999', fontWeight:700 }}>Batter</div>
          {['R','B','4s','6s','SR',''].map((h,i) => (
            <div key={i} style={{ fontSize:11, color:'#999', fontWeight:700, textAlign:'center' }}>{h}</div>
          ))}
        </div>

        {(inn.battingStats || []).map((p, i) => {
          const sr = p.balls > 0 ? (p.runs/p.balls*100).toFixed(1) : '0.0'
          const dis = dismissalText(p)
          return (
            <div key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 32px 32px 44px 20px', padding:'10px 14px', alignItems:'start' }}>
                {/* name + dismissal */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: dis ? 3 : 0 }}>
                    <span style={{ fontSize:14, color:'#f0f0f0', fontWeight:700 }}>{p.name}</span>
                    {!p.isOut && <span style={{ fontSize:9, color:'#4ade80', fontWeight:800, background:'rgba(74,222,128,0.12)', padding:'2px 6px', borderRadius:3, letterSpacing:0.5 }}>BATTING</span>}
                  </div>
                  {dis && (
                    <div style={{ fontSize:11, color:'#999', lineHeight:1.4, maxWidth:180 }}>{dis}</div>
                  )}
                </div>
                <div style={{ fontSize:14, color:'#f0f0f0', fontWeight:800, textAlign:'center', paddingTop:2 }}>{p.runs}</div>
                <div style={{ fontSize:13, color:'#777', textAlign:'center', paddingTop:2 }}>{p.balls}</div>
                <div style={{ fontSize:13, color:'#777', textAlign:'center', paddingTop:2 }}>{p.fours || 0}</div>
                <div style={{ fontSize:13, color:'#777', textAlign:'center', paddingTop:2 }}>{p.sixes || 0}</div>
                <div style={{ fontSize:12, color:'#888', textAlign:'center', paddingTop:2 }}>{sr}</div>
                <div style={{ fontSize:13, color:'#ccc', textAlign:'center', paddingTop:2 }}>›</div>
              </div>
            </div>
          )
        })}

        {/* Did Not Bat */}
        {dnb.length > 0 && (
          <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:'#181818' }}>
            <span style={{ fontSize:11, color:'#555', fontWeight:700 }}>Did not bat: </span>
            <span style={{ fontSize:12, color:'#666' }}>{dnb.join(', ')}</span>
          </div>
        )}

        {/* Extras row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 32px 32px 44px 20px', padding:'9px 14px', background:'#181818', borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:13, color:'#888' }}>
            Extras
            <span style={{ fontSize:11, color:'#aaa', marginLeft:8 }}>b 0, lb 0, w {wides}, nb {noBalls}, p 0</span>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'#f0f0f0', textAlign:'center' }}>{extras}</div>
          <div/><div/><div/><div/><div/>
        </div>

        {/* ── BOWLING TABLE ── */}
        <SectionHeader title="BOWLING" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 28px 36px 28px 36px', padding:'5px 14px', background:'#1e1e1e', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:11, color:'#999', fontWeight:700 }}>Bowler</div>
          {['O','M','R','W','ER'].map(h => (
            <div key={h} style={{ fontSize:11, color:'#999', fontWeight:700, textAlign:'center' }}>{h}</div>
          ))}
        </div>
        {(inn.bowlingStats || []).map((p, i) => {
          const eco = p.balls > 0 ? (p.runs/(p.balls/6)).toFixed(1) : '0.0'
          return (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 36px 28px 36px 28px 36px', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
              <div style={{ fontSize:14, color:'#f0f0f0', fontWeight:600 }}>{p.name}</div>
              <div style={{ fontSize:13, color:'#777', textAlign:'center' }}>{fmt(p.balls||0)}</div>
              <div style={{ fontSize:13, color:'#aaa', textAlign:'center' }}>0</div>
              <div style={{ fontSize:13, color:'#888', textAlign:'center' }}>{p.runs||0}</div>
              <div style={{ fontSize:14, color:(p.wickets||0)>0?'#cc0000':'#666', fontWeight:(p.wickets||0)>0?800:400, textAlign:'center' }}>{p.wickets||0}</div>
              <div style={{ fontSize:12, color:'#888', textAlign:'center' }}>{eco}</div>
            </div>
          )
        })}

        {/* ── FALL OF WICKETS ── */}
        {fow.length > 0 && (
          <>
            <SectionHeader title="FALL OF WICKETS" />
            <div style={{ padding:'6px 14px 10px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0px', borderBottom:'1px solid rgba(255,255,255,0.04)', padding:'4px 0', marginBottom:2 }}>
                <span style={{ fontSize:10, color:'#aaa', fontWeight:700 }}>Score</span>
                <span style={{ fontSize:10, color:'#aaa', fontWeight:700, textAlign:'right' }}>Over</span>
              </div>
              {fow.map((f, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', alignItems:'center' }}>
                  <div style={{ fontSize:13, color:'#ccc' }}>
                    <span style={{ fontWeight:700 }}>{f.score}-{f.wicket}</span>
                    {f.batsmanName && <span style={{ color:'#999', fontSize:11, marginLeft:6 }}>({f.batsmanName})</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#888', textAlign:'right' }}>{f.over} ov</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PARTNERSHIPS ── */}
        {partnerships.length > 0 && (
          <>
            <SectionHeader title="PARTNERSHIPS" />
            <div style={{ padding:'6px 14px 10px' }}>
              {partnerships.map(({ b1, b2 }, i) => {
                const r1 = b1.runs || 0, r2 = b2.runs || 0
                const total = r1 + r2
                const pct1  = total > 0 ? (r1/total)*100 : 50
                return (
                  <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, marginBottom:6, alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13, color:'#f0f0f0', fontWeight:700 }}>{b1.name}</div>
                        <div style={{ fontSize:11, color:'#888' }}>{b1.runs}({b1.balls})</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:800, color:'#ccc', textAlign:'center', minWidth:28 }}>{total}</div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:13, color:'#f0f0f0', fontWeight:700 }}>{b2.name}</div>
                        <div style={{ fontSize:11, color:'#888' }}>{b2.runs}({b2.balls})</div>
                      </div>
                    </div>
                    {/* split contribution bar */}
                    <div style={{ height:5, borderRadius:3, overflow:'hidden', display:'flex', background:'#252525' }}>
                      <div style={{ width:`${pct1}%`, background:'#60a5fa', transition:'width 0.4s' }}/>
                      <div style={{ flex:1, background:'#cc0000' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                      <span style={{ fontSize:10, color:'#60a5fa', fontWeight:700 }}>{pct1.toFixed(0)}%</span>
                      <span style={{ fontSize:10, color:'#ff4444', fontWeight:700 }}>{(100-pct1).toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── OVER-BY-OVER (collapsible) ── */}
        {overs.length > 0 && (
          <>
            <div
              onClick={() => setShowOvers(s => !s)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', background:'#1a1a1a', borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer' }}
            >
              <span style={{ fontSize:12, fontWeight:800, color:'#aaa', letterSpacing:0.5 }}>OVER BY OVER</span>
              <span style={{ fontSize:12, color:'#888' }}>{showOvers ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {showOvers && (
              <div style={{ padding:'6px 14px 10px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'44px 1fr 52px', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:4 }}>
                  {['Over','Balls','Runs'].map(h => (
                    <div key={h} style={{ fontSize:10, color:'#aaa', fontWeight:700, textAlign: h==='Balls'?'left':'center' }}>{h}</div>
                  ))}
                </div>
                {overs.map(({ over, runs: oRuns, wickets: oWkts, balls: oBalls }, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'44px 1fr 52px', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', alignItems:'center' }}>
                    <div style={{ fontSize:12, color:'#888', fontWeight:700, textAlign:'center' }}>{over}</div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {oBalls.map((b, bi) => {
                        let bg='#e8e8e8', col='#444', text=(b.runs||0).toString()
                        if (b.isWicket)      { bg='rgba(204,0,0,0.2)'; col='#ff4444'; text='W'  }
                        else if (b.isWide)   { bg='rgba(96,165,250,0.15)'; col='#60a5fa'; text='Wd' }
                        else if (b.isNoBall) { bg='rgba(251,146,60,0.15)'; col='#fb923c'; text='NB' }
                        else if (b.runs===4) { bg='rgba(74,222,128,0.15)'; col='#4ade80'; text='4'  }
                        else if (b.runs===6) { bg='rgba(192,132,252,0.15)'; col='#c084fc'; text='6'  }
                        return (
                          <span key={bi} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:26, height:26, borderRadius:'50%', background:bg, color:col, fontSize:10, fontWeight:800, border:`1px solid ${col}44` }}>{text}</span>
                        )
                      })}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color: oWkts>0?'#cc0000':'#333', textAlign:'center' }}>
                      {oRuns}{oWkts>0 && <span style={{ fontSize:11, color:'#ff4444' }}> {oWkts}W</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    )
  }

  const hasInnings2 = match.status === 'innings2' || match.status === 'completed'

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#161616' }}>

      {/* Result banner */}
      {match.status === 'completed' && match.result && (
        <div style={{ background:'#1b5e20', padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>🏆</span>
          <span style={{ fontSize:13, color:'#a5d6a7', fontWeight:700 }}>{match.result}</span>
        </div>
      )}

      {/* Live banner */}
      {(match.status === 'innings1' || match.status === 'innings2') && (
        <div style={{ background:'#0d2137', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#4caf50', display:'inline-block', flexShrink:0 }}/>
          <span style={{ fontSize:12, color:'#90caf9', fontWeight:800 }}>LIVE</span>
          <span style={{ fontSize:12, color:'#5c8ab0' }}>
            {match.status === 'innings2'
              ? `${match.innings2?.battingTeam} need ${Math.max(0,(match.innings1?.runs||0)+1-(match.innings2?.runs||0))} more runs`
              : `${match.innings1?.battingTeam} batting first`}
          </span>
        </div>
      )}

      {/* Innings tab switcher (only when 2nd innings started) */}
      {hasInnings2 && (
        <div style={{ display:'flex', background:'#1a1a1a', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key:'innings1', label: match.innings1?.battingTeam || '1st Innings' },
            { key:'innings2', label: match.innings2?.battingTeam || '2nd Innings' },
          ].map(t => (
            <button key={t.key} onClick={() => { setActiveInnings(t.key); setShowOvers(false) }} style={{
              flex:1, padding:'12px 8px', border:'none', background:'transparent', cursor:'pointer',
              fontSize:13, fontWeight:800, letterSpacing:0.2,
              color: activeInnings===t.key ? '#ff4444' : '#555',
              borderBottom: activeInnings===t.key ? '3px solid #ff4444' : '3px solid transparent',
              transition:'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {renderInnings(hasInnings2 ? activeInnings : 'innings1')}

    </div>
  )
}

// ─── Tab: Points ─────────────────────────────────────────────────────────────
function PointsTab({ match }) {
  const inn1 = match.innings1
  const inn2 = match.innings2
  const isCompleted = match.status === 'completed'
  const team1Score = inn1?.runs ?? 0
  const team2Score = inn2?.runs ?? 0
  const maxScore   = Math.max(team1Score, team2Score, 1)

  return (
    <div style={{ padding:'12px 12px 8px', flex:1, overflowY:'auto' }}>
      {isCompleted && match.result && (
        <div style={{ background:'rgba(250,204,21,0.1)', border:'1px solid rgba(250,204,21,0.25)', borderRadius:14, padding:'14px 16px', marginBottom:14, textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#ca8a04', fontWeight:800, letterSpacing:2, marginBottom:4 }}>RESULT</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:22, fontWeight:700, color:'#facc15' }}>🏆 {match.result}</div>
        </div>
      )}
      <div style={{ background:'#1a1a1a', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:12 }}>
        <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1 }}>SCORE COMPARISON</div>
        </div>
        {[
          { team: match.team1, score: team1Score, wkts: inn1?.wickets??0, balls: inn1?.balls??0 },
          { team: match.team2, score: team2Score, wkts: inn2?.wickets??0, balls: inn2?.balls??0 },
        ].map((t, i) => (
          <div key={i} style={{ padding:'14px 14px', borderBottom: i===0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:14, fontWeight:800, color:'#f0f0f0' }}>{t.team}</span>
              <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color:'#fff' }}>
                {t.score}/{t.wkts}<span style={{ fontSize:12, color:'#555', marginLeft:6 }}>({fmt(t.balls)})</span>
              </span>
            </div>
            <div style={{ height:8, background:'#2a2a2a', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, background: i===0 ? 'linear-gradient(90deg,#cc0000,#ff4444)' : 'linear-gradient(90deg,#1d4ed8,#60a5fa)', width:`${(t.score/maxScore)*100}%`, transition:'width 0.5s ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:'#1a1a1a', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:12 }}>
        <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1 }}>KEY STATS</div>
        </div>
        {[
          { label:'Overs',    v1: fmt(inn1?.balls??0), v2: fmt(inn2?.balls??0) },
          { label:'Run Rate', v1: crr(team1Score, inn1?.balls??0), v2: crr(team2Score, inn2?.balls??0) },
          { label:'Wickets',  v1: inn1?.wickets??0, v2: inn2?.wickets??0 },
          { label:'Extras',   v1: (inn1?.ballByBall||[]).filter(b=>b.isWide||b.isNoBall).length, v2: (inn2?.ballByBall||[]).filter(b=>b.isWide||b.isNoBall).length },
          { label:'Fours',    v1: (inn1?.battingStats||[]).reduce((s,p)=>s+(p.fours||0),0), v2: (inn2?.battingStats||[]).reduce((s,p)=>s+(p.fours||0),0) },
          { label:'Sixes',    v1: (inn1?.battingStats||[]).reduce((s,p)=>s+(p.sixes||0),0), v2: (inn2?.battingStats||[]).reduce((s,p)=>s+(p.sixes||0),0) },
        ].map((row, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#666', fontWeight:700 }}>{row.label}</span>
            <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#ff7070', textAlign:'center' }}>{row.v1}</span>
            <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#60a5fa', textAlign:'center' }}>{row.v2}</span>
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', padding:'6px 14px', background:'rgba(255,255,255,0.02)' }}>
          <span/>
          <span style={{ fontSize:10, color:'#ff4444', fontWeight:800, textAlign:'center' }}>{match.team1}</span>
          <span style={{ fontSize:10, color:'#60a5fa', fontWeight:800, textAlign:'center' }}>{match.team2}</span>
        </div>
      </div>
      {[
        { title:'🏏 Top Scorer', items: [...(inn1?.battingStats||[]),...(inn2?.battingStats||[])].sort((a,b)=>b.runs-a.runs).slice(0,3), key:'runs', suffix:'runs' },
        { title:'🎯 Top Wicket Taker', items: [...(inn1?.bowlingStats||[]),...(inn2?.bowlingStats||[])].sort((a,b)=>b.wickets-a.wickets).slice(0,3), key:'wickets', suffix:'wkts' },
      ].map(section => (
        <div key={section.title} style={{ background:'#1a1a1a', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:12, color:'#aaa', fontWeight:800 }}>{section.title}</div>
          </div>
          {section.items.length === 0
            ? <div style={{ padding:'12px 14px', color:'#444', fontSize:12 }}>No data yet</div>
            : section.items.map((p,i) => (
              <div key={i} style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,68,68,0.15)', color:'#ff4444', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                  <span style={{ fontSize:13, color:'#f0f0f0', fontWeight:700 }}>{p.name}</span>
                </div>
                <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>
                  {p[section.key]} <span style={{ fontSize:11, color:'#555' }}>{section.suffix}</span>
                </span>
              </div>
            ))
          }
        </div>
      ))}
    </div>
  )
}

// ─── Main Scoring Page ──────────────────────────────────────────────────────
export default function Scoring() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [match,   setMatch]   = useState(null)
  const [tab,     setTab]     = useState('scoring')
  const [loading, setLoading] = useState(false)
  const [fetching,setFetching]= useState(true)
  const [error,   setError]   = useState('')

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchMatch = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/matches/${id}`, { headers })
      setMatch(data)
    } catch { setError('Failed to load match') }
    finally { setFetching(false) }
  }, [id])

  useEffect(() => { fetchMatch() }, [fetchMatch])

  const handleBall = async (ballData) => {
    try {
      setLoading(true)
      const { data } = await axios.post(`/api/matches/${id}/ball`, ballData, { headers })
      setMatch(data)
      if (data.status === 'completed') navigate(`/report/${id}`)
    } catch { alert('Failed to record ball') }
    finally { setLoading(false) }
  }

  const handleUndo = async () => {
    try {
      setLoading(true)
      const { data } = await axios.post(`/api/matches/${id}/undo`, {}, { headers })
      setMatch(data)
    } catch { alert('Nothing to undo') }
    finally { setLoading(false) }
  }

  const handleEndInnings = async () => {
    if (!window.confirm('End this innings?')) return
    try {
      setLoading(true)
      const m = { ...match, status: match.status === 'innings1' ? 'innings2' : 'completed' }
      const { data } = await axios.put(`/api/matches/${id}`, m, { headers })
      setMatch(data)
    } catch { await fetchMatch() }
    finally { setLoading(false) }
  }

  if (fetching) return (
    <div style={{ minHeight:'100vh', background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#ff4444', fontFamily:'Rajdhani,sans-serif', fontSize:20 }}>Loading match...</div>
    </div>
  )
  if (error) return (
    <div style={{ minHeight:'100vh', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ color:'#ff4444', fontSize:16 }}>{error}</div>
      <button onClick={() => navigate('/')} style={{ padding:'10px 24px', background:'#cc0000', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer' }}>Go Home</button>
    </div>
  )
  if (!match) return null

  const tabs = [
    { key:'scoring',   icon:'🏏', label:'Scoring'   },
    { key:'scorecard', icon:'📋', label:'Scorecard' },
    { key:'points',    icon:'📊', label:'Points'    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:#0a0a0a; font-family:'Nunito',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
      `}</style>

      <div style={{ minHeight:'100vh', width:'100%', background:'#0a0a0a', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:500, minHeight:'100vh', background:'#111', display:'flex', flexDirection:'column' }}>

          {/* ── Top Header ── */}
          <div style={{ padding:'14px 16px 12px', flexShrink:0, background:'linear-gradient(180deg,#1a1a1a 0%,transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={() => navigate('/')} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#aaa', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
              <div>
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color:'#f0f0f0', letterSpacing:1 }}>
                  {match.team1} <span style={{ color:'#ff4444', fontSize:14 }}>vs</span> {match.team2}
                </div>
                <div style={{ fontSize:10, color:'#555', fontWeight:700 }}>
                  {match.overs} overs • {match.status === 'completed' ? '✅ Completed' : '🟢 Live'}
                </div>
              </div>
            </div>
            <button onClick={handleUndo} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#aaa', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>UNDO</button>
          </div>

          {/* ── Tab Content ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY: tab !== 'scoring' ? 'auto' : 'visible', minHeight:0 }}>
            {tab === 'scoring'   && <ScoringTab   match={match} onBall={handleBall} onUndo={handleUndo} onEndInnings={handleEndInnings} loading={loading} />}
            {tab === 'scorecard' && <ScorecardTab match={match} />}
            {tab === 'points'    && <PointsTab    match={match} />}
          </div>

          {/* ── Bottom Nav ── */}
          <div style={{ flexShrink:0, display:'flex', background:'#161616', borderTop:'1px solid rgba(255,255,255,0.07)', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 0', border:'none', cursor:'pointer', background:'transparent', display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative', transition:'background 0.15s' }}>
                {tab === t.key && (
                  <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:2, background:'linear-gradient(90deg,#cc0000,#ff4444)', borderRadius:'0 0 2px 2px' }} />
                )}
                <span style={{ fontSize:20 }}>{t.icon}</span>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:0.5, color: tab === t.key ? '#ff4444' : '#444', transition:'color 0.15s' }}>{t.label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
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
  // New batsman popup after wicket
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

  const toggle = (key) => setExtras(e => ({ ...e, [key]: !e[key] }))

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
      // Show new batsman popup BEFORE sending ball
      setPendingBallData(ballData)
      setNewBatsmanInput('')
      setNewBatsmanModal(true)
    } else {
      submitBall(ballData, null)
    }
  }

  const submitBall = (ballData, newBatsmanName) => {
    onBall(ballData)
    const isWide = ballData.isWide
    const isNoBall = ballData.isNoBall
    const r = ballData.runs

    // Auto switch ends on odd runs
    if (!isWide && !isNoBall && r % 2 !== 0) {
      const s = batsman || activeBatters[0]?.name || ''
      const ns = nonStrikerName || activeBatters.find(p => p.name !== s)?.name || ''
      if (newBatsmanName) {
        // wicket + odd runs: non-striker becomes striker, new batsman is non-striker
        setBatsman(ns)
        setNonStrikerName(newBatsmanName)
      } else {
        setBatsman(ns)
        setNonStrikerName(s)
      }
    } else {
      if (newBatsmanName) {
        // wicket + even runs: new batsman takes striker position
        setBatsman(newBatsmanName)
      }
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

  const handleSwitchBat = () => {
    setBatsman(nonStriker || '')
    setNonStrikerName(striker || '')
  }

  const handleRetire = () => {
    if (!striker) return
    if (!window.confirm('Retire ' + striker + '?')) return
    setBatsman('')
    openPicker('striker')
  }

  const openPicker = (type) => { setPicker(type); setPickerInput('') }

  const handlePickerSelect = (name) => {
    if (picker === 'striker')         setBatsman(name)
    else if (picker === 'nonStriker') setNonStrikerName(name)
    else if (picker === 'bowler')     setBowler(name)
    setPicker(null)
    setPickerInput('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, flex:1 }}>

      {/* ── New Batsman Modal (appears after wicket) ── */}
      {newBatsmanModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:24 }}>
          <div style={{ width:'100%', maxWidth:380, background:'#1a1a1a', borderRadius:20, padding:'28px 20px 24px', border:'1px solid rgba(255,68,68,0.3)', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
            {/* icon + title */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🏏</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color:'#ff4444', letterSpacing:1 }}>WICKET!</div>
              <div style={{ fontSize:13, color:'#666', marginTop:4 }}>
                {pendingBallData?.wicketType || 'Out'} — {striker}
              </div>
              <div style={{ fontSize:12, color:'#555', marginTop:2 }}>Who's the next batsman?</div>
            </div>

            {/* input */}
            <input
              autoFocus
              value={newBatsmanInput}
              onChange={e => setNewBatsmanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewBatsmanConfirm()}
              placeholder="Enter new batsman name..."
              style={{ width:'100%', background:'#111', border:'1.5px solid rgba(255,68,68,0.4)', borderRadius:11, padding:'13px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box', marginBottom:10 }}
            />

            {/* quick pick from known players not yet batting */}
            {(() => {
              const used = [...activeBatters.map(p=>p.name), striker]
              const suggestions = allPlayers.filter(n => !used.includes(n) && !innings.battingStats?.find(p=>p.name===n)?.isOut === false)
              // players who played before but are available
              const available = innings.battingStats?.filter(p => p.isOut === false && !activeBatters.find(a=>a.name===p.name)) || []
              if (available.length === 0) return null
              return (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:'#444', fontWeight:800, letterSpacing:1, marginBottom:6 }}>OR PICK</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {available.map(p => (
                      <button key={p.name} onClick={() => setNewBatsmanInput(p.name)} style={{
                        padding:'7px 12px', borderRadius:8,
                        background: newBatsmanInput === p.name ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${newBatsmanInput === p.name ? '#ff444466' : 'rgba(255,255,255,0.08)'}`,
                        color:'#ccc', fontSize:13, fontWeight:700, cursor:'pointer'
                      }}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* confirm button */}
            <button
              onClick={handleNewBatsmanConfirm}
              disabled={!newBatsmanInput.trim()}
              style={{
                width:'100%', padding:'14px', borderRadius:11, marginTop:4,
                background: newBatsmanInput.trim() ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#2a2a2a',
                border:'none', color: newBatsmanInput.trim() ? '#fff' : '#555',
                fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:800, letterSpacing:1,
                cursor: newBatsmanInput.trim() ? 'pointer' : 'not-allowed',
                boxShadow: newBatsmanInput.trim() ? '0 4px 16px rgba(204,0,0,0.4)' : 'none'
              }}
            >
              ✓ CONFIRM NEW BATSMAN
            </button>
          </div>
        </div>
      )}

      {/* Score header */}
      <div style={{
        background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:14, margin:'10px 12px 0', padding:'12px 16px',
        display:'flex', justifyContent:'space-between', alignItems:'flex-start'
      }}>
        <div>
          <div style={{ fontSize:13, color:'#888', fontWeight:700, marginBottom:3 }}>
            {innings.battingTeam} — Innings {isInnings2 ? 2 : 1}
          </div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:30, fontWeight:700, color:'#fff', lineHeight:1 }}>
            {innings.runs}/{innings.wickets}
          </div>
          <div style={{ fontSize:12, color:'#666', marginTop:3 }}>
            ({fmt(innings.balls)} ov) {isInnings2 && target && `• Need ${target - innings.runs} off ${match.overs * 6 - innings.balls} balls`}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'#ff4444', fontWeight:800, letterSpacing:1 }}>CRR</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:24, fontWeight:700, color:'#fff' }}>
            {crr(innings.runs, innings.balls)}
          </div>
          {isInnings2 && target && (
            <>
              <div style={{ fontSize:11, color:'#facc15', fontWeight:800, letterSpacing:1, marginTop:4 }}>RRR</div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color:'#facc15' }}>
                {rrr(target, innings.runs, innings.balls, match.overs)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Batsmen + Bowler card ── */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 36px', padding:'6px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize:10, color:'#555', fontWeight:800 }}>BATTER</span>
          <span style={{ fontSize:10, color:'#555', fontWeight:800, textAlign:'center' }}>R</span>
          <span style={{ fontSize:10, color:'#555', fontWeight:800, textAlign:'center' }}>B</span>
          <span style={{ fontSize:10, color:'#555', fontWeight:800, textAlign:'center' }}>SR</span>
        </div>
        {/* striker */}
        <div onClick={() => openPicker('striker')} style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 36px', padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block', flexShrink:0 }}/>
            <span style={{ fontSize:13, color: striker ? '#fff' : '#444', fontWeight:800 }}>
              {striker || 'Tap to set striker'}{striker && <span style={{ color:'#4ade80' }}> *</span>}
            </span>
            <span style={{ fontSize:11, color:'#333' }}>✎</span>
          </div>
          <span style={{ fontSize:13, color:'#f0f0f0', fontWeight:800, textAlign:'center' }}>{strikerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#888', fontWeight:600, textAlign:'center' }}>{strikerStats?.balls ?? 0}</span>
          <span style={{ fontSize:12, color:'#888', fontWeight:600, textAlign:'center' }}>
            {strikerStats?.balls > 0 ? (strikerStats.runs/strikerStats.balls*100).toFixed(0) : '0'}
          </span>
        </div>
        {/* non-striker */}
        <div onClick={() => openPicker('nonStriker')} style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 36px', padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#555', display:'inline-block', flexShrink:0 }}/>
            <span style={{ fontSize:13, color: nonStriker ? '#ccc' : '#444', fontWeight:700 }}>
              {nonStriker || 'Tap to set non-striker'}
            </span>
            <span style={{ fontSize:11, color:'#333' }}>✎</span>
          </div>
          <span style={{ fontSize:13, color:'#f0f0f0', fontWeight:800, textAlign:'center' }}>{nonStrikerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#888', fontWeight:600, textAlign:'center' }}>{nonStrikerStats?.balls ?? 0}</span>
          <span style={{ fontSize:12, color:'#888', fontWeight:600, textAlign:'center' }}>
            {nonStrikerStats?.balls > 0 ? (nonStrikerStats.runs/nonStrikerStats.balls*100).toFixed(0) : '0'}
          </span>
        </div>
        {/* bowler */}
        <div onClick={() => openPicker('bowler')} style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 36px 36px', padding:'7px 14px', background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.05)', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, color:'#fb923c', fontWeight:800 }}>BOWLER</span>
            <span style={{ fontSize:13, color: currentBowler ? '#fb923c' : '#444', fontWeight:700 }}>{currentBowler || 'Tap to set'}</span>
            <span style={{ fontSize:11, color:'#333' }}>✎</span>
          </div>
          <span style={{ fontSize:13, color:'#aaa', fontWeight:600, textAlign:'center' }}>{fmt(bowlerStats?.balls ?? 0)}</span>
          <span style={{ fontSize:13, color:'#aaa', fontWeight:600, textAlign:'center' }}>{bowlerStats?.runs ?? 0}</span>
          <span style={{ fontSize:13, color:'#ff4444', fontWeight:800, textAlign:'center' }}>{bowlerStats?.wickets ?? 0}</span>
          <span style={{ fontSize:13, color:'#60a5fa', fontWeight:600, textAlign:'center' }}>{bowlerStats?.wides ?? 0}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 36px 36px 36px 36px', padding:'2px 14px 6px' }}>
          <span/>{['O','R','W','Wd'].map(l => <span key={l} style={{ fontSize:9, color:'#444', fontWeight:800, textAlign:'center' }}>{l}</span>)}
        </div>
      </div>

      {/* Player Picker Modal */}
      <PlayerPicker picker={picker} pickerInput={pickerInput} setPickerInput={setPickerInput} innings={innings} striker={striker} nonStriker={nonStriker} currentBowler={currentBowler} onSelect={handlePickerSelect} onClose={() => { setPicker(null); setPickerInput('') }} />

      {/* This over */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px' }}>
        <div style={{ fontSize:10, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>THIS OVER</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', minHeight:32 }}>
          {overBalls.length === 0 ? <span style={{color:'#333',fontSize:12}}>No balls yet</span> : overBalls.map((b,i) => <BallDot key={i} ball={b} />)}
        </div>
      </div>

      {/* Extras checkboxes */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px', display:'flex', gap:16, flexWrap:'wrap' }}>
        {[
          { key:'wide', label:'Wide', color:'#60a5fa' },
          { key:'noBall', label:'No Ball', color:'#fb923c' },
          { key:'byes', label:'Byes', color:'#a3e635' },
          { key:'legByes', label:'Leg Byes', color:'#e879f9' },
        ].map(({ key, label, color }) => (
          <label key={key} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <div onClick={() => toggle(key)} style={{ width:20, height:20, borderRadius:5, border:`2px solid ${extras[key] ? color : '#333'}`, background: extras[key] ? color+'33' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', cursor:'pointer' }}>
              {extras[key] && <span style={{fontSize:12, color}}>✓</span>}
            </div>
            <span style={{ fontSize:12, color: extras[key] ? color : '#666', fontWeight:700 }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Run selector */}
      <div style={{ margin:'8px 12px 0', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px', display:'flex', gap:8, justifyContent:'space-between' }}>
        {[0,1,2,3,4,5,6].map(r => (
          <button key={r} onClick={() => setRuns(r)} style={{
            flex:1, height:40, borderRadius:20,
            background: runs===r ? (r===4?'#14532d':r===6?'#3b0764':'#cc0000') : 'rgba(255,255,255,0.05)',
            border: `2px solid ${runs===r ? (r===4?'#4ade80':r===6?'#c084fc':'#ff4444') : 'rgba(255,255,255,0.08)'}`,
            color: runs===r ? '#fff' : '#666',
            fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, cursor:'pointer', transition:'all 0.12s'
          }}>{r}</button>
        ))}
      </div>

      {/* Wicket type row */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8, position:'relative' }}>
        <button onClick={() => setWicket(w => !w)} style={{
          width:90, height:44, borderRadius:11, flexShrink:0,
          background: wicket ? 'rgba(127,29,29,0.5)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${wicket ? '#ff4444' : 'rgba(255,255,255,0.08)'}`,
          color: wicket ? '#ff4444' : '#555',
          fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'
        }}>
          {wicket ? '💀 W ON' : 'WICKET'}
        </button>

        <div style={{ flex:1, position:'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); if (wicket) setShowWicketMenu(s => !s) }} disabled={!wicket} style={{
            width:'100%', height:44, borderRadius:11,
            background: wicket ? 'rgba(127,29,29,0.35)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${wicket ? '#ff444466' : 'rgba(255,255,255,0.06)'}`,
            color: wicket ? '#ff9999' : '#333',
            fontFamily:'Rajdhani,sans-serif', fontSize:14, fontWeight:700,
            cursor: wicket ? 'pointer' : 'default',
            display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px'
          }}>
            <span>{wicketType}</span>
            {wicket && <span style={{fontSize:10}}>▼</span>}
          </button>
          {showWicketMenu && wicket && (
            <div style={{ position:'absolute', bottom:48, left:0, right:0, zIndex:200, background:'#1e1e1e', border:'1px solid rgba(255,68,68,0.25)', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
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

        <button onClick={handleOK} disabled={runs === null || loading} style={{
          width:70, height:44, borderRadius:11, flexShrink:0,
          background: runs !== null ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#1e1e1e',
          border:'none', color: runs !== null ? '#fff' : '#444',
          fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:800, letterSpacing:2,
          cursor: runs !== null ? 'pointer' : 'not-allowed',
          boxShadow: runs !== null ? '0 3px 14px rgba(204,0,0,0.4)' : 'none'
        }}>
          {loading ? '...' : 'OK'}
        </button>
      </div>

      {/* Assist player selector (Caught / Stumped / Run Out) */}
      {wicket && ASSIST_TYPES.includes(wicketType) && (
        <div style={{ margin:'6px 12px 0', background:'rgba(127,29,29,0.15)', border:'1px solid rgba(255,68,68,0.15)', borderRadius:11, padding:'10px 14px' }}>
          <div style={{ fontSize:10, color:'#ff6666', fontWeight:800, letterSpacing:1, marginBottom:8 }}>
            {wicketType.startsWith('RunOut') ? 'RUN OUT BY' : wicketType === 'Stumped' ? 'STUMPED BY' : 'CAUGHT BY'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={assistPlayer}
              onChange={e => setAssistPlayer(e.target.value)}
              placeholder="Fielder / keeper name..."
              style={{ flex:1, background:'#111', border:'1px solid rgba(255,68,68,0.3)', borderRadius:9, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }}
            />
          </div>
          {/* Quick pick from all known fielding team players */}
          {innings.bowlingStats?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {innings.bowlingStats.map(p => (
                <button key={p.name} onClick={() => setAssistPlayer(p.name)} style={{
                  padding:'5px 10px', borderRadius:7,
                  background: assistPlayer===p.name ? 'rgba(255,68,68,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${assistPlayer===p.name ? '#ff444466' : 'rgba(255,255,255,0.08)'}`,
                  color: assistPlayer===p.name ? '#ff9999' : '#888',
                  fontSize:12, fontWeight:700, cursor:'pointer'
                }}>{p.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action row: RETIRE | SWITCH BAT | END INNINGS */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8 }}>
        <button onClick={handleRetire} style={{ flex:1, height:40, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontFamily:'Rajdhani,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>RETIRE</button>
        <button onClick={handleSwitchBat} style={{ flex:1, height:40, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontFamily:'Rajdhani,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>SWITCH BAT</button>
        <button onClick={onEndInnings} style={{ flex:1, height:40, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontFamily:'Rajdhani,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer' }}>END INNINGS</button>
      </div>

      {/* UNDO + EDIT BALL */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8 }}>
        <button onClick={onUndo} style={{ flex:1, height:38, borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#666', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>⟲ UNDO</button>
        <button onClick={() => alert('Use UNDO to correct the last ball')} style={{ flex:1, height:38, borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,68,68,0.2)', color:'#ff6666', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>EDIT BALL</button>
      </div>

    </div>
  )
}

// ─── Tab: Scorecard ─────────────────────────────────────────────────────────
function ScorecardTab({ match }) {
  const renderInnings = (key, label) => {
    const inn = match[key]
    if (!inn) return null
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ background:'linear-gradient(135deg,#1c1c1c,#222)', border:'1px solid rgba(255,68,68,0.18)', borderRadius:12, padding:'10px 14px', marginBottom:8 }}>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#ff4444', letterSpacing:1 }}>{label} — {inn.battingTeam}</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:26, fontWeight:700, color:'#fff' }}>
            {inn.runs}/{inn.wickets} <span style={{fontSize:14,color:'#666'}}>({fmt(inn.balls)} ov)</span>
          </div>
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:8 }}>
          <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px 40px', gap:4 }}>
            {['Batsman','R','B','4s','6s','SR'].map(h => (
              <div key={h} style={{ fontSize:10, color:'#555', fontWeight:800, letterSpacing:0.5, textAlign: h==='Batsman'?'left':'center' }}>{h}</div>
            ))}
          </div>
          {(inn.battingStats || []).map((p,i) => (
            <div key={i} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px 40px', gap:4, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, color: p.isOut ? '#888' : '#fff', fontWeight:700 }}>{p.name}{!p.isOut&&' *'}</div>
                <div style={{ fontSize:10, color:'#444' }}>{p.isOut ? 'out' : 'batting'}</div>
              </div>
              {[p.runs, p.balls, p.fours, p.sixes, p.balls>0?(p.runs/p.balls*100).toFixed(0):0].map((v,j)=>(
                <div key={j} style={{ fontSize:13, color: j===0?'#f0f0f0':'#888', fontWeight: j===0?800:600, textAlign:'center' }}>{v}</div>
              ))}
            </div>
          ))}
          {(!inn.battingStats || inn.battingStats.length === 0) && (
            <div style={{ padding:'14px', color:'#444', fontSize:12, textAlign:'center' }}>No batting data</div>
          )}
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px 40px', gap:4 }}>
            {['Bowler','O','R','W','Wd','NB'].map(h => (
              <div key={h} style={{ fontSize:10, color:'#555', fontWeight:800, letterSpacing:0.5, textAlign: h==='Bowler'?'left':'center' }}>{h}</div>
            ))}
          </div>
          {(inn.bowlingStats || []).map((p,i) => (
            <div key={i} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px 40px', gap:4, alignItems:'center' }}>
              <div style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{p.name}</div>
              {[fmt(p.balls||0), p.runs, p.wickets, p.wides||0, p.noBalls||0].map((v,j)=>(
                <div key={j} style={{ fontSize:13, color: j===2?'#ff4444':'#888', fontWeight: j===2?800:600, textAlign:'center' }}>{v}</div>
              ))}
            </div>
          ))}
          {(!inn.bowlingStats || inn.bowlingStats.length === 0) && (
            <div style={{ padding:'14px', color:'#444', fontSize:12, textAlign:'center' }}>No bowling data</div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding:'12px 12px 8px', overflowY:'auto', flex:1 }}>
      {renderInnings('innings1', 'Innings 1')}
      {(match.status === 'innings2' || match.status === 'completed') && renderInnings('innings2', 'Innings 2')}
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
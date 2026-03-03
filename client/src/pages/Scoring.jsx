import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

// ─── helpers ───────────────────────────────────────────────────────────────
const fmt = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`
const crr  = (runs, balls) => balls === 0 ? '0.0' : (runs / (balls / 6)).toFixed(1)
const rrr  = (target, runs, balls, totalOvers) => {
  const remBalls = totalOvers * 6 - balls
  if (remBalls <= 0) return '-'
  return ((target - runs) / (remBalls / 6)).toFixed(1)
}

// ─── Ball dot ──────────────────────────────────────────────────────────────
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

// ─── Tab: Scoring ──────────────────────────────────────────────────────────
function ScoringTab({ match, onBall, onUndo, onEndInnings, loading }) {
  const [extras, setExtras]     = useState({ wide:false, noBall:false, byes:false, legByes:false })
  const [runs, setRuns]         = useState(null)
  const [wicket, setWicket]     = useState(false)
  const [batsman, setBatsman]   = useState('')
  const [bowler,  setBowler]    = useState('')
  const [newBat,  setNewBat]    = useState('')
  const [newBowl, setNewBowl]   = useState('')
  const [showBatInput,  setShowBatInput]  = useState(false)
  const [showBowlInput, setShowBowlInput] = useState(false)

  const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2'
  const innings    = match[inningsKey]
  const isInnings2 = match.status === 'innings2'
  const target     = isInnings2 ? match.innings1.runs + 1 : null

  // auto-pick current batsmen / bowler from stats
  const activeBatters = innings.battingStats?.filter(p => !p.isOut) || []
  const striker = batsman || activeBatters[0]?.name || ''
  const nonStriker = activeBatters.find(p => p.name !== striker)?.name || ''

  const currentBowler = bowler || innings.bowlingStats?.slice(-1)[0]?.name || ''

  // over balls (last 6 legal)
  const legalBalls = innings.ballByBall?.filter(b => !b.isWide && !b.isNoBall) || []
  const overBalls  = legalBalls.slice(-6)

  const toggle = (key) => setExtras(e => ({ ...e, [key]: !e[key] }))

  const handleOK = () => {
    if (runs === null) return
    const isWide   = extras.wide
    const isNoBall = extras.noBall
    const extraRuns = (isWide || isNoBall) ? 1 : 0
    onBall({
      runs,
      isWicket: wicket,
      isWide, isNoBall,
      extraRuns,
      batsmanName: striker,
      bowlerName: currentBowler,
    })
    setExtras({ wide:false, noBall:false, byes:false, legByes:false })
    setRuns(null)
    setWicket(false)
  }

  const addPlayer = (type) => {
    if (type === 'bat' && newBat.trim()) {
      setBatsman(newBat.trim()); setNewBat(''); setShowBatInput(false)
    }
    if (type === 'bowl' && newBowl.trim()) {
      setBowler(newBowl.trim()); setNewBowl(''); setShowBowlInput(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, flex:1 }}>

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

      {/* Partnership / players row */}
      <div style={{
        margin:'8px 12px 0', background:'#1a1a1a',
        border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
        padding:'10px 14px', display:'flex', justifyContent:'space-between',
        fontSize:12, color:'#888', fontWeight:700
      }}>
        <div>
          <span style={{color:'#555'}}>P'SHIP </span>
          <span style={{color:'#ccc'}}>
            {activeBatters.reduce((s,p)=>s+p.runs,0)}({activeBatters.reduce((s,p)=>s+p.balls,0)})
          </span>
          {activeBatters.slice(0,2).map(p => (
            <span key={p.name} style={{marginLeft:10, color:'#aaa'}}>
              {p.name} <span style={{color:'#fff'}}>{p.runs}({p.balls})</span>
              {p.name === striker ? '*' : ''}
            </span>
          ))}
        </div>
        <div style={{color:'#666', fontSize:11}}>
          {currentBowler && <span>{currentBowler}</span>}
        </div>
      </div>

      {/* This over */}
      <div style={{
        margin:'8px 12px 0', background:'#1a1a1a',
        border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
        padding:'10px 14px'
      }}>
        <div style={{ fontSize:10, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>
          THIS OVER
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', minHeight:32 }}>
          {overBalls.length === 0
            ? <span style={{color:'#333',fontSize:12}}>No balls yet</span>
            : overBalls.map((b,i) => <BallDot key={i} ball={b} />)
          }
        </div>
      </div>

      {/* Extras checkboxes */}
      <div style={{
        margin:'8px 12px 0', background:'#1a1a1a',
        border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
        padding:'10px 14px', display:'flex', gap:16, flexWrap:'wrap'
      }}>
        {[
          { key:'wide',    label:'Wide',     color:'#60a5fa' },
          { key:'noBall',  label:'No Ball',  color:'#fb923c' },
          { key:'byes',    label:'Byes',     color:'#a3e635' },
          { key:'legByes', label:'Leg Byes', color:'#e879f9' },
        ].map(({ key, label, color }) => (
          <label key={key} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <div
              onClick={() => toggle(key)}
              style={{
                width:20, height:20, borderRadius:5,
                border:`2px solid ${extras[key] ? color : '#333'}`,
                background: extras[key] ? color + '33' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.15s', cursor:'pointer'
              }}
            >
              {extras[key] && <span style={{fontSize:12, color}}>✓</span>}
            </div>
            <span style={{ fontSize:12, color: extras[key] ? color : '#666', fontWeight:700 }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Run selector */}
      <div style={{
        margin:'8px 12px 0', background:'#1a1a1a',
        border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
        padding:'10px 14px', display:'flex', gap:8, justifyContent:'space-between'
      }}>
        {[0,1,2,3,4,5,6].map(r => (
          <button key={r} onClick={() => setRuns(r)} style={{
            flex:1, height:40, borderRadius:20,
            background: runs === r ? (r === 4 ? '#14532d' : r === 6 ? '#3b0764' : '#cc0000') : 'rgba(255,255,255,0.05)',
            border: `2px solid ${runs === r ? (r === 4 ? '#4ade80' : r === 6 ? '#c084fc' : '#ff4444') : 'rgba(255,255,255,0.08)'}`,
            color: runs === r ? '#fff' : '#666',
            fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700,
            cursor:'pointer', transition:'all 0.12s'
          }}>{r}</button>
        ))}
      </div>

      {/* Wicket toggle + OK */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8 }}>
        <button onClick={() => setWicket(w => !w)} style={{
          flex:1, height:44, borderRadius:11,
          background: wicket ? 'rgba(127,29,29,0.5)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${wicket ? '#ff4444' : 'rgba(255,255,255,0.08)'}`,
          color: wicket ? '#ff4444' : '#555',
          fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700,
          letterSpacing:1, cursor:'pointer', transition:'all 0.15s'
        }}>
          {wicket ? '💀 WICKET ON' : 'WICKET'}
        </button>
        <button
          onClick={handleOK}
          disabled={runs === null || loading}
          style={{
            flex:1, height:44, borderRadius:11,
            background: runs !== null ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#1e1e1e',
            border:'none', color: runs !== null ? '#fff' : '#444',
            fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:800,
            letterSpacing:2, cursor: runs !== null ? 'pointer' : 'not-allowed',
            boxShadow: runs !== null ? '0 3px 14px rgba(204,0,0,0.4)' : 'none',
            transition:'all 0.15s'
          }}
        >
          {loading ? '...' : 'OK'}
        </button>
      </div>

      {/* Action row */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8 }}>
        {[
          { label:'⟲ UNDO',       fn: onUndo,       color:'#555' },
          { label:'END INNINGS',   fn: onEndInnings, color:'#555' },
        ].map(({ label, fn, color }) => (
          <button key={label} onClick={fn} style={{
            flex:1, height:40, borderRadius:10,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)',
            color, fontFamily:'Rajdhani,sans-serif',
            fontSize:13, fontWeight:700, letterSpacing:0.5,
            cursor:'pointer', transition:'background 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* Add batsman / bowler */}
      <div style={{ margin:'8px 12px 0', display:'flex', gap:8 }}>
        <button onClick={() => setShowBatInput(s=>!s)} style={{
          flex:1, height:38, borderRadius:10,
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
          color:'#60a5fa', fontSize:12, fontWeight:700, cursor:'pointer'
        }}>+ Batsman</button>
        <button onClick={() => setShowBowlInput(s=>!s)} style={{
          flex:1, height:38, borderRadius:10,
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
          color:'#fb923c', fontSize:12, fontWeight:700, cursor:'pointer'
        }}>+ Bowler</button>
      </div>

      {showBatInput && (
        <div style={{ margin:'6px 12px 0', display:'flex', gap:8 }}>
          <input value={newBat} onChange={e=>setNewBat(e.target.value)}
            placeholder="Batsman name" onKeyDown={e=>e.key==='Enter'&&addPlayer('bat')}
            style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:9,
              padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }} />
          <button onClick={()=>addPlayer('bat')} style={{
            padding:'8px 14px', borderRadius:9, background:'#1d4ed8',
            border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer'
          }}>Set</button>
        </div>
      )}
      {showBowlInput && (
        <div style={{ margin:'6px 12px 0', display:'flex', gap:8 }}>
          <input value={newBowl} onChange={e=>setNewBowl(e.target.value)}
            placeholder="Bowler name" onKeyDown={e=>e.key==='Enter'&&addPlayer('bowl')}
            style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:9,
              padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }} />
          <button onClick={()=>addPlayer('bowl')} style={{
            padding:'8px 14px', borderRadius:9, background:'#b45309',
            border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer'
          }}>Set</button>
        </div>
      )}
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
        {/* Innings header */}
        <div style={{
          background:'linear-gradient(135deg,#1c1c1c,#222)',
          border:'1px solid rgba(255,68,68,0.18)', borderRadius:12,
          padding:'10px 14px', marginBottom:8
        }}>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#ff4444', letterSpacing:1 }}>
            {label} — {inn.battingTeam}
          </div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:26, fontWeight:700, color:'#fff' }}>
            {inn.runs}/{inn.wickets} <span style={{fontSize:14,color:'#666'}}>({fmt(inn.balls)} ov)</span>
          </div>
        </div>

        {/* Batting */}
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

        {/* Bowling */}
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

      {/* Match result */}
      {isCompleted && match.result && (
        <div style={{
          background:'rgba(250,204,21,0.1)', border:'1px solid rgba(250,204,21,0.25)',
          borderRadius:14, padding:'14px 16px', marginBottom:14, textAlign:'center'
        }}>
          <div style={{ fontSize:11, color:'#ca8a04', fontWeight:800, letterSpacing:2, marginBottom:4 }}>RESULT</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:22, fontWeight:700, color:'#facc15' }}>
            🏆 {match.result}
          </div>
        </div>
      )}

      {/* Score comparison */}
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
                {t.score}/{t.wkts}
                <span style={{ fontSize:12, color:'#555', marginLeft:6 }}>({fmt(t.balls)})</span>
              </span>
            </div>
            <div style={{ height:8, background:'#2a2a2a', borderRadius:4, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:4,
                background: i===0 ? 'linear-gradient(90deg,#cc0000,#ff4444)' : 'linear-gradient(90deg,#1d4ed8,#60a5fa)',
                width: `${(t.score / maxScore) * 100}%`,
                transition:'width 0.5s ease'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Key stats */}
      <div style={{ background:'#1a1a1a', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', marginBottom:12 }}>
        <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1 }}>KEY STATS</div>
        </div>
        {[
          { label:'Overs',    v1: fmt(inn1?.balls??0), v2: fmt(inn2?.balls??0) },
          { label:'Run Rate', v1: crr(team1Score, inn1?.balls??0), v2: crr(team2Score, inn2?.balls??0) },
          { label:'Wickets',  v1: inn1?.wickets??0, v2: inn2?.wickets??0 },
          { label:'Extras',   v1: (inn1?.ballByBall||[]).filter(b=>b.isWide||b.isNoBall).length,
                              v2: (inn2?.ballByBall||[]).filter(b=>b.isWide||b.isNoBall).length },
          { label:'Fours',    v1: (inn1?.battingStats||[]).reduce((s,p)=>s+(p.fours||0),0),
                              v2: (inn2?.battingStats||[]).reduce((s,p)=>s+(p.fours||0),0) },
          { label:'Sixes',    v1: (inn1?.battingStats||[]).reduce((s,p)=>s+(p.sixes||0),0),
                              v2: (inn2?.battingStats||[]).reduce((s,p)=>s+(p.sixes||0),0) },
        ].map((row, i) => (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'1fr 80px 80px',
            padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)',
            alignItems:'center'
          }}>
            <span style={{ fontSize:12, color:'#666', fontWeight:700 }}>{row.label}</span>
            <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#ff7070', textAlign:'center' }}>{row.v1}</span>
            <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:16, fontWeight:700, color:'#60a5fa', textAlign:'center' }}>{row.v2}</span>
          </div>
        ))}
        {/* header legend */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', padding:'6px 14px', background:'rgba(255,255,255,0.02)' }}>
          <span/>
          <span style={{ fontSize:10, color:'#ff4444', fontWeight:800, textAlign:'center' }}>{match.team1}</span>
          <span style={{ fontSize:10, color:'#60a5fa', fontWeight:800, textAlign:'center' }}>{match.team2}</span>
        </div>
      </div>

      {/* Top performers */}
      {[
        { title:'🏏 Top Scorer', items: [...(inn1?.battingStats||[]), ...(inn2?.battingStats||[])].sort((a,b)=>b.runs-a.runs).slice(0,3), key:'runs', suffix:'runs' },
        { title:'🎯 Top Wicket Taker', items: [...(inn1?.bowlingStats||[]), ...(inn2?.bowlingStats||[])].sort((a,b)=>b.wickets-a.wickets).slice(0,3), key:'wickets', suffix:'wkts' },
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
                  <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,68,68,0.15)', color:'#ff4444', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {i+1}
                  </span>
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
    } catch {
      // fallback: just refetch
      await fetchMatch()
    } finally { setLoading(false) }
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
          <div style={{
            padding:'14px 16px 12px', flexShrink:0,
            background:'linear-gradient(180deg,#1a1a1a 0%,transparent 100%)',
            borderBottom:'1px solid rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'space-between'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={() => navigate('/')} style={{
                width:34, height:34, borderRadius:9,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                color:'#aaa', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
              }}>←</button>
              <div>
                <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color:'#f0f0f0', letterSpacing:1 }}>
                  {match.team1} <span style={{ color:'#ff4444', fontSize:14 }}>vs</span> {match.team2}
                </div>
                <div style={{ fontSize:10, color:'#555', fontWeight:700 }}>
                  {match.overs} overs • {match.status === 'completed' ? '✅ Completed' : '🟢 Live'}
                </div>
              </div>
            </div>
            <button onClick={handleUndo} style={{
              padding:'6px 12px', borderRadius:8,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
              color:'#aaa', fontFamily:'Rajdhani,sans-serif', fontSize:13, fontWeight:700,
              letterSpacing:1, cursor:'pointer'
            }}>UNDO</button>
          </div>

          {/* ── Tab Content ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY: tab !== 'scoring' ? 'auto' : 'visible', minHeight:0 }}>
            {tab === 'scoring'   && <ScoringTab   match={match} onBall={handleBall} onUndo={handleUndo} onEndInnings={handleEndInnings} loading={loading} />}
            {tab === 'scorecard' && <ScorecardTab match={match} />}
            {tab === 'points'    && <PointsTab    match={match} />}
          </div>

          {/* ── Bottom Nav ── */}
          <div style={{
            flexShrink:0, display:'flex',
            background:'#161616', borderTop:'1px solid rgba(255,255,255,0.07)',
            paddingBottom:'env(safe-area-inset-bottom,0px)'
          }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex:1, padding:'12px 0', border:'none', cursor:'pointer',
                background:'transparent', display:'flex', flexDirection:'column',
                alignItems:'center', gap:3, position:'relative',
                transition:'background 0.15s'
              }}>
                {/* active indicator */}
                {tab === t.key && (
                  <div style={{
                    position:'absolute', top:0, left:'20%', right:'20%',
                    height:2, background:'linear-gradient(90deg,#cc0000,#ff4444)',
                    borderRadius:'0 0 2px 2px'
                  }} />
                )}
                <span style={{ fontSize:20 }}>{t.icon}</span>
                <span style={{
                  fontSize:10, fontWeight:800, letterSpacing:0.5,
                  color: tab === t.key ? '#ff4444' : '#444',
                  transition:'color 0.15s'
                }}>{t.label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
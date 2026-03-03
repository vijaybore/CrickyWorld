import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

function Scoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [batsman1, setBatsman1] = useState('')
  const [batsman2, setBatsman2] = useState('')
  const [bowler, setBowler] = useState('')
  const [activeTab, setActiveTab] = useState('score')

  const [showWidePopup, setShowWidePopup] = useState(false)
  const [showNoBallPopup, setShowNoBallPopup] = useState(false)
  const [wideExtraRuns, setWideExtraRuns] = useState(0)
  const [noBallBatsmanRuns, setNoBallBatsmanRuns] = useState(0)

  const [showAddBatsman, setShowAddBatsman] = useState(false)
  const [showAddBowler, setShowAddBowler] = useState(false)
  const [newBatsmanName, setNewBatsmanName] = useState('')
  const [newBowlerName, setNewBowlerName] = useState('')

  useEffect(() => { fetchMatch() }, [])

  const fetchMatch = async () => {
    const res = await axios.get(`http://localhost:5000/api/matches/${id}`)
    setMatch(res.data)
  }

  const addBall = async (runs, extras = {}) => {
    if (!batsman1 || !bowler) {
      alert('Please select Batsman and Bowler first!')
      return
    }
    const res = await axios.post(`http://localhost:5000/api/matches/${id}/ball`, {
      runs,
      isWicket: extras.isWicket || false,
      isWide: extras.isWide || false,
      isNoBall: extras.isNoBall || false,
      extraRuns: extras.extraRuns || 0,
      batsmanName: batsman1,
      bowlerName: bowler,
    })
    setMatch(res.data)
    if (extras.isWicket) setBatsman1('')
  }

  const handleWideSubmit = () => {
    const penalty = match.wideRuns || 0
    addBall(0, { isWide: true, extraRuns: penalty + parseInt(wideExtraRuns) })
    setShowWidePopup(false)
    setWideExtraRuns(0)
  }

  const handleNoBallSubmit = () => {
    const penalty = match.noBallRuns || 0
    addBall(parseInt(noBallBatsmanRuns), { isNoBall: true, extraRuns: penalty })
    setShowNoBallPopup(false)
    setNoBallBatsmanRuns(0)
  }

  const addNewBatsman = async () => {
    if (!newBatsmanName.trim()) return alert('Enter batsman name!')
    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2'
    await axios.post(`http://localhost:5000/api/matches/${id}/add-player`, {
      name: newBatsmanName.trim(), type: 'batting', inningsKey,
    })
    setBatsman1(newBatsmanName.trim())
    setNewBatsmanName('')
    setShowAddBatsman(false)
    fetchMatch()
  }

  const addNewBowler = async () => {
    if (!newBowlerName.trim()) return alert('Enter bowler name!')
    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2'
    await axios.post(`http://localhost:5000/api/matches/${id}/add-player`, {
      name: newBowlerName.trim(), type: 'bowling', inningsKey,
    })
    setBowler(newBowlerName.trim())
    setNewBowlerName('')
    setShowAddBowler(false)
    fetchMatch()
  }

  const undoBall = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/matches/${id}/undo`)
      setMatch(res.data)
    } catch (err) { alert('Nothing to undo!') }
  }

  const getBallClass = (ball) => {
    if (ball.isWicket) return 'ball ball-wicket'
    if (ball.isWide) return 'ball ball-wide'
    if (ball.isNoBall) return 'ball ball-noball'
    if (ball.runs === 4) return 'ball ball-four'
    if (ball.runs === 6) return 'ball ball-six'
    return 'ball ball-normal'
  }

  const getBallLabel = (ball) => {
    if (ball.isWicket) return 'W'
    if (ball.isWide) return 'Wd'
    if (ball.isNoBall) return 'Nb'
    return ball.runs
  }

  const getStrikeRate = (runs, balls) => balls === 0 ? '0.00' : ((runs / balls) * 100).toFixed(1)
  const getEconomy = (runs, balls) => balls === 0 ? '0.00' : ((runs / balls) * 6).toFixed(1)

  const getOverSummary = (ballByBall) => {
    const overs = []
    let overIndex = 0, legalBalls = 0
    let currentOverBalls = [], overRuns = 0, overWickets = 0

    ballByBall.forEach((ball) => {
      currentOverBalls.push(ball)
      overRuns += ball.runs
      if (ball.isWicket) overWickets += 1
      if (!ball.isWide && !ball.isNoBall) legalBalls += 1
      if (legalBalls === 6) {
        overs.push({ overNumber: overIndex + 1, balls: [...currentOverBalls], runs: overRuns, wickets: overWickets, incomplete: false })
        overIndex += 1; legalBalls = 0; currentOverBalls = []; overRuns = 0; overWickets = 0
      }
    })
    if (currentOverBalls.length > 0) {
      overs.push({ overNumber: overIndex + 1, balls: [...currentOverBalls], runs: overRuns, wickets: overWickets, incomplete: true })
    }
    return overs
  }

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.78)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px',
  }

  const popup = {
    background: '#1e293b', borderRadius: '16px', padding: '24px',
    width: '100%', maxWidth: '360px', border: '1px solid #334155',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  }

  const runBtn = (val, selected, color) => ({
    width: '48px', height: '48px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontWeight: '700', fontSize: '18px', transition: 'all 0.15s',
    background: selected ? color : '#0f172a',
    border: `2px solid ${selected ? color : '#334155'}`,
    color: selected ? 'white' : '#94a3b8',
  })

  if (!match) return <div className="card text-center">Loading...</div>

  const inningsKey = match.status === 'innings2' ? 'innings2' : 'innings1'
  const innings = match[inningsKey]
  const currentOver = Math.floor(innings.balls / 6)
  const currentBall = innings.balls % 6
  const targetRuns = match.status === 'innings2' ? match.innings1.runs + 1 : null
  const runsNeeded = targetRuns ? targetRuns - match.innings2.runs : null
  const ballsLeft = match.status === 'innings2' ? (match.overs * 6) - match.innings2.balls : null
  const battingPlayers = innings.battingStats || []
  const bowlingPlayers = innings.bowlingStats || []
  const availableBatsmen = battingPlayers.filter(p => !p.isOut && p.name !== batsman2)
  const overs = getOverSummary(innings.ballByBall || [])

  return (
    <div>

      {/* WIDE POPUP */}
      {showWidePopup && (
        <div style={overlay}>
          <div style={popup}>
            <h3 style={{color:'#d97706', marginBottom:'4px'}}>🟡 Wide Ball</h3>
            <p style={{color:'#94a3b8', fontSize:'13px', marginBottom:'16px'}}>
              Penalty +{match.wideRuns || 1} auto added. Select extra runs scored on this wide:
            </p>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px'}}>
              {[0, 1, 2, 3, 4, 6].map(r => (
                <div key={r} onClick={() => setWideExtraRuns(r)} style={runBtn(r, wideExtraRuns === r, '#d97706')}>
                  {r}
                </div>
              ))}
            </div>
            <div style={{background:'#0f172a', borderRadius:'10px', padding:'12px', marginBottom:'16px', textAlign:'center'}}>
              <p style={{color:'#94a3b8', fontSize:'12px'}}>Total runs added</p>
              <p style={{color:'#d97706', fontSize:'32px', fontWeight:'800', lineHeight:1}}>
                +{(match.wideRuns || 1) + parseInt(wideExtraRuns)}
              </p>
              <p style={{color:'#94a3b8', fontSize:'12px', marginTop:'4px'}}>
                {match.wideRuns || 1} penalty + {wideExtraRuns} extra
              </p>
            </div>
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={() => { setShowWidePopup(false); setWideExtraRuns(0) }}
                style={{flex:1, padding:'12px', background:'#475569', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={handleWideSubmit}
                style={{flex:2, padding:'12px', background:'#d97706', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer', fontSize:'15px'}}>
                ✅ Confirm Wide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO BALL POPUP */}
      {showNoBallPopup && (
        <div style={overlay}>
          <div style={popup}>
            <h3 style={{color:'#ea580c', marginBottom:'4px'}}>🟠 No Ball</h3>
            <p style={{color:'#94a3b8', fontSize:'13px', marginBottom:'16px'}}>
              Penalty +{match.noBallRuns || 1} auto added. Select runs scored by batsman:
            </p>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px'}}>
              {[0, 1, 2, 3, 4, 6].map(r => (
                <div key={r} onClick={() => setNoBallBatsmanRuns(r)} style={runBtn(r, noBallBatsmanRuns === r, '#ea580c')}>
                  {r}
                </div>
              ))}
            </div>
            <div style={{background:'#0f172a', borderRadius:'10px', padding:'12px', marginBottom:'16px', textAlign:'center'}}>
              <p style={{color:'#94a3b8', fontSize:'12px'}}>Total runs added</p>
              <p style={{color:'#ea580c', fontSize:'32px', fontWeight:'800', lineHeight:1}}>
                +{(match.noBallRuns || 1) + parseInt(noBallBatsmanRuns)}
              </p>
              <p style={{color:'#94a3b8', fontSize:'12px', marginTop:'4px'}}>
                {match.noBallRuns || 1} penalty + {noBallBatsmanRuns} batsman runs
              </p>
            </div>
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={() => { setShowNoBallPopup(false); setNoBallBatsmanRuns(0) }}
                style={{flex:1, padding:'12px', background:'#475569', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={handleNoBallSubmit}
                style={{flex:2, padding:'12px', background:'#ea580c', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer', fontSize:'15px'}}>
                ✅ Confirm No Ball
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BATSMAN POPUP */}
      {showAddBatsman && (
        <div style={overlay}>
          <div style={popup}>
            <h3 style={{color:'#16a34a', marginBottom:'16px'}}>🏏 Add New Batsman</h3>
            <input placeholder="Enter batsman name" value={newBatsmanName}
              onChange={e => setNewBatsmanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNewBatsman()}
              autoFocus style={{marginBottom:'16px'}} />
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={() => { setShowAddBatsman(false); setNewBatsmanName('') }}
                style={{flex:1, padding:'12px', background:'#475569', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={addNewBatsman}
                style={{flex:2, padding:'12px', background:'#16a34a', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                ✅ Add Batsman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BOWLER POPUP */}
      {showAddBowler && (
        <div style={overlay}>
          <div style={popup}>
            <h3 style={{color:'#2563eb', marginBottom:'16px'}}>🎯 Add New Bowler</h3>
            <input placeholder="Enter bowler name" value={newBowlerName}
              onChange={e => setNewBowlerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNewBowler()}
              autoFocus style={{marginBottom:'16px'}} />
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={() => { setShowAddBowler(false); setNewBowlerName('') }}
                style={{flex:1, padding:'12px', background:'#475569', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={addNewBowler}
                style={{flex:2, padding:'12px', background:'#2563eb', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', cursor:'pointer'}}>
                ✅ Add Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Header */}
      <div className="card text-center">
        <h2>{match.team1} vs {match.team2}</h2>
        <p className="text-gray">{match.overs} Overs Match</p>
      </div>

      {match.status !== 'completed' ? (
        <>
          {/* Score */}
          <div className="card text-center">
            <p className="text-gray">{innings.battingTeam} Batting</p>
            <div className="score-big">{innings.runs}/{innings.wickets}</div>
            <div className="score-detail">Overs: {currentOver}.{currentBall}</div>
            {match.status === 'innings2' && (
              <p className="text-green" style={{fontSize:'16px'}}>
                Target: {targetRuns} | Need: {runsNeeded} runs in {ballsLeft} balls
              </p>
            )}
            <div className="ball-history" style={{justifyContent:'center', marginTop:'12px'}}>
              {innings.ballByBall.slice(-12).map((ball, i) => (
                <div key={i} className={getBallClass(ball)}>{getBallLabel(ball)}</div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
            {['score','batting','bowling','overs'].map(tab => (
              <button key={tab} className={`btn ${activeTab === tab ? 'btn-green' : 'btn-gray'}`}
                onClick={() => setActiveTab(tab)} style={{flex:1, fontSize:'12px', padding:'8px 4px'}}>
                {tab === 'score' ? '🏏 Score' : tab === 'batting' ? '📊 Batting' : tab === 'bowling' ? '🎯 Bowling' : '📋 Overs'}
              </button>
            ))}
          </div>

          {/* SCORE TAB */}
          {activeTab === 'score' && (
            <>
              <div className="card">
                <h3 style={{marginBottom:'12px'}}>Select Players</h3>
                <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px'}}>
                  <select value={batsman1} onChange={e => setBatsman1(e.target.value)} style={{flex:1, margin:0}}>
                    <option value="">🏏 Striker (Batsman)</option>
                    {availableBatsmen.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                  <button onClick={() => setShowAddBatsman(true)}
                    style={{width:'42px', height:'42px', background:'#16a34a', border:'none', borderRadius:'8px', color:'white', fontWeight:'700', cursor:'pointer', fontSize:'20px'}}>
                    +
                  </button>
                </div>
                <select value={batsman2} onChange={e => setBatsman2(e.target.value)} style={{marginBottom:'8px'}}>
                  <option value="">🏏 Non-Striker</option>
                  {battingPlayers.filter(p => !p.isOut && p.name !== batsman1).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <select value={bowler} onChange={e => setBowler(e.target.value)} style={{flex:1, margin:0}}>
                    <option value="">🎯 Select Bowler</option>
                    {bowlingPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                  <button onClick={() => setShowAddBowler(true)}
                    style={{width:'42px', height:'42px', background:'#2563eb', border:'none', borderRadius:'8px', color:'white', fontWeight:'700', cursor:'pointer', fontSize:'20px'}}>
                    +
                  </button>
                </div>
              </div>

              {(batsman1 || batsman2) && (
                <div className="card">
                  <h3 style={{marginBottom:'10px'}}>At Crease</h3>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
                    <thead>
                      <tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                        <th style={{textAlign:'left', padding:'6px'}}>Batsman</th>
                        <th style={{padding:'6px'}}>R</th><th style={{padding:'6px'}}>B</th>
                        <th style={{padding:'6px'}}>4s</th><th style={{padding:'6px'}}>6s</th>
                        <th style={{padding:'6px'}}>SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[batsman1, batsman2].filter(Boolean).map(name => {
                        const p = battingPlayers.find(x => x.name === name)
                        if (!p) return null
                        return (
                          <tr key={name} style={{borderBottom:'1px solid #1e293b'}}>
                            <td style={{padding:'6px'}}>{name}{name === batsman1 ? ' *' : ''}</td>
                            <td style={{padding:'6px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                            <td style={{padding:'6px', textAlign:'center'}}>{p.balls}</td>
                            <td style={{padding:'6px', textAlign:'center'}}>{p.fours}</td>
                            <td style={{padding:'6px', textAlign:'center'}}>{p.sixes}</td>
                            <td style={{padding:'6px', textAlign:'center'}}>{getStrikeRate(p.runs, p.balls)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="card text-center">
                <h3 style={{marginBottom:'10px'}}>Runs</h3>
                <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'6px', marginBottom:'12px'}}>
                  {[0,1,2,3,4,6].map(run => (
                    <button key={run} onClick={() => addBall(run)}
                      style={{padding:'16px 4px', background:'#2563eb', border:'none', borderRadius:'10px', color:'white', fontSize:'20px', fontWeight:'800', cursor:'pointer'}}>
                      {run}
                    </button>
                  ))}
                </div>
                <button onClick={() => addBall(0, { isWicket: true })}
                  style={{width:'100%', padding:'14px', background:'#dc2626', border:'none', borderRadius:'10px', color:'white', fontSize:'16px', fontWeight:'700', cursor:'pointer', marginBottom:'10px'}}>
                  🔴 WICKET
                </button>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px'}}>
                  <button onClick={() => { setWideExtraRuns(0); setShowWidePopup(true) }}
                    style={{padding:'14px', background:'#d97706', border:'none', borderRadius:'10px', color:'white', fontSize:'15px', fontWeight:'700', cursor:'pointer'}}>
                    🟡 Wide
                  </button>
                  <button onClick={() => { setNoBallBatsmanRuns(0); setShowNoBallPopup(true) }}
                    style={{padding:'14px', background:'#ea580c', border:'none', borderRadius:'10px', color:'white', fontSize:'15px', fontWeight:'700', cursor:'pointer'}}>
                    🟠 No Ball
                  </button>
                </div>
                <button onClick={undoBall}
                  style={{width:'100%', padding:'12px', background:'#475569', border:'none', borderRadius:'10px', color:'white', fontSize:'14px', fontWeight:'700', cursor:'pointer'}}>
                  ↩ UNDO Last Ball
                </button>
              </div>

              {match.status === 'innings2' && (
                <div className="card">
                  <h3>1st Innings: {match.innings1.battingTeam}</h3>
                  <p>{match.innings1.runs}/{match.innings1.wickets} in {match.overs} overs</p>
                </div>
              )}
            </>
          )}

          {/* BATTING TAB */}
          {activeTab === 'batting' && (
            <div className="card">
              <h3 style={{marginBottom:'12px'}}>🏏 {innings.battingTeam} Batting</h3>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                <thead>
                  <tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                    <th style={{textAlign:'left', padding:'8px'}}>Batsman</th>
                    <th style={{padding:'6px'}}>R</th><th style={{padding:'6px'}}>B</th>
                    <th style={{padding:'6px'}}>4s</th><th style={{padding:'6px'}}>6s</th>
                    <th style={{padding:'6px'}}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {battingPlayers.map(p => (
                    <tr key={p.name} style={{borderBottom:'1px solid #1e293b', color: p.isOut ? '#dc2626' : p.balls > 0 ? '#f1f5f9' : '#94a3b8'}}>
                      <td style={{padding:'8px'}}>
                        {p.name}
                        {p.isOut && <span style={{fontSize:'11px', color:'#dc2626'}}> (out)</span>}
                        {!p.isOut && p.balls > 0 && <span style={{fontSize:'11px', color:'#16a34a'}}> *</span>}
                      </td>
                      <td style={{padding:'6px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{p.balls}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{p.fours}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{p.sixes}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{getStrikeRate(p.runs, p.balls)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{borderTop:'2px solid #334155', fontWeight:'700', color:'#16a34a'}}>
                    <td style={{padding:'8px'}}>Total</td>
                    <td style={{padding:'6px', textAlign:'center'}}>{innings.runs}</td>
                    <td colSpan="4" style={{padding:'6px', textAlign:'center', color:'#94a3b8'}}>{innings.wickets} wkts | {currentOver}.{currentBall} ov</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* BOWLING TAB */}
          {activeTab === 'bowling' && (
            <div className="card">
              <h3 style={{marginBottom:'12px'}}>🎯 Bowling Figures</h3>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                <thead>
                  <tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                    <th style={{textAlign:'left', padding:'8px'}}>Bowler</th>
                    <th style={{padding:'6px'}}>O</th><th style={{padding:'6px'}}>R</th>
                    <th style={{padding:'6px'}}>W</th><th style={{padding:'6px'}}>Wd</th>
                    <th style={{padding:'6px'}}>Eco</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlingPlayers.map(p => (
                    <tr key={p.name} style={{borderBottom:'1px solid #1e293b', color: p.balls > 0 ? '#f1f5f9' : '#94a3b8'}}>
                      <td style={{padding:'8px'}}>{p.name}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{Math.floor(p.balls/6)}.{p.balls%6}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{p.runs}</td>
                      <td style={{padding:'6px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>{p.wickets}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{p.wides}</td>
                      <td style={{padding:'6px', textAlign:'center'}}>{getEconomy(p.runs, p.balls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* OVERS TAB */}
          {activeTab === 'overs' && (
            <div>
              {overs.length === 0 ? (
                <div className="card text-center"><p className="text-gray">No overs bowled yet!</p></div>
              ) : (
                overs.map((over, i) => (
                  <div className="card" key={i} style={{marginBottom:'10px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                      <h3>Over {over.overNumber}{over.incomplete && <span style={{fontSize:'12px', color:'#94a3b8'}}> (current)</span>}</h3>
                      <div style={{textAlign:'right'}}>
                        <span style={{color:'#16a34a', fontWeight:'700', fontSize:'18px'}}>{over.runs} runs</span>
                        {over.wickets > 0 && <span style={{color:'#dc2626', marginLeft:'8px', fontWeight:'700'}}>{over.wickets}W</span>}
                      </div>
                    </div>
                    <div className="ball-history">
                      {over.balls.map((ball, j) => (
                        <div key={j} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                          <div className={getBallClass(ball)}>{getBallLabel(ball)}</div>
                          {ball.batsmanName && (
                            <span style={{fontSize:'9px', color:'#94a3b8', maxWidth:'40px', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              {ball.batsmanName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {over.balls[0]?.bowlerName && <p style={{fontSize:'12px', color:'#94a3b8', marginTop:'8px'}}>🎯 {over.balls[0].bowlerName}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="card text-center">
            <h2 className="text-green">🏆 Match Completed!</h2>
            <p style={{fontSize:'22px', margin:'16px 0'}}>{match.result}</p>
          </div>
          <div className="grid-2">
            <div className="card text-center">
              <h3>{match.innings1.battingTeam}</h3>
              <div className="score-big">{match.innings1.runs}/{match.innings1.wickets}</div>
              <p className="text-gray">{match.overs} Overs</p>
            </div>
            <div className="card text-center">
              <h3>{match.innings2.battingTeam}</h3>
              <div className="score-big">{match.innings2.runs}/{match.innings2.wickets}</div>
              <p className="text-gray">{Math.floor(match.innings2.balls/6)}.{match.innings2.balls%6} Overs</p>
            </div>
          </div>
          <div className="card">
            <h3 style={{marginBottom:'12px'}}>🏏 {match.innings1.battingTeam} Batting</h3>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead><tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                <th style={{textAlign:'left', padding:'8px'}}>Batsman</th>
                <th style={{padding:'6px'}}>R</th><th style={{padding:'6px'}}>B</th>
                <th style={{padding:'6px'}}>4s</th><th style={{padding:'6px'}}>6s</th><th style={{padding:'6px'}}>SR</th>
              </tr></thead>
              <tbody>{match.innings1.battingStats.map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'8px'}}>{p.name} {p.isOut ? '(out)' : p.balls > 0 ? '*' : ''}</td>
                  <td style={{padding:'6px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.balls}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.fours}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.sixes}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{((p.runs/Math.max(p.balls,1))*100).toFixed(1)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card">
            <h3 style={{marginBottom:'12px'}}>🎯 {match.innings2.battingTeam} Bowling</h3>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead><tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                <th style={{textAlign:'left', padding:'8px'}}>Bowler</th>
                <th style={{padding:'6px'}}>O</th><th style={{padding:'6px'}}>R</th>
                <th style={{padding:'6px'}}>W</th><th style={{padding:'6px'}}>Eco</th>
              </tr></thead>
              <tbody>{match.innings1.bowlingStats.filter(p => p.balls > 0).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'8px'}}>{p.name}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{Math.floor(p.balls/6)}.{p.balls%6}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.runs}</td>
                  <td style={{padding:'6px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>{p.wickets}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{((p.runs/Math.max(p.balls,1))*6).toFixed(1)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card">
            <h3 style={{marginBottom:'12px'}}>🏏 {match.innings2.battingTeam} Batting</h3>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead><tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                <th style={{textAlign:'left', padding:'8px'}}>Batsman</th>
                <th style={{padding:'6px'}}>R</th><th style={{padding:'6px'}}>B</th>
                <th style={{padding:'6px'}}>4s</th><th style={{padding:'6px'}}>6s</th><th style={{padding:'6px'}}>SR</th>
              </tr></thead>
              <tbody>{match.innings2.battingStats.map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'8px'}}>{p.name} {p.isOut ? '(out)' : p.balls > 0 ? '*' : ''}</td>
                  <td style={{padding:'6px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.balls}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.fours}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.sixes}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{((p.runs/Math.max(p.balls,1))*100).toFixed(1)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card">
            <h3 style={{marginBottom:'12px'}}>🎯 {match.innings1.battingTeam} Bowling</h3>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead><tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                <th style={{textAlign:'left', padding:'8px'}}>Bowler</th>
                <th style={{padding:'6px'}}>O</th><th style={{padding:'6px'}}>R</th>
                <th style={{padding:'6px'}}>W</th><th style={{padding:'6px'}}>Eco</th>
              </tr></thead>
              <tbody>{match.innings2.bowlingStats.filter(p => p.balls > 0).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'8px'}}>{p.name}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{Math.floor(p.balls/6)}.{p.balls%6}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{p.runs}</td>
                  <td style={{padding:'6px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>{p.wickets}</td>
                  <td style={{padding:'6px', textAlign:'center'}}>{((p.runs/Math.max(p.balls,1))*6).toFixed(1)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="text-center mt-16" style={{marginBottom:'24px'}}>
            <button className="btn btn-green" onClick={() => navigate('/')}>← Back to Matches</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Scoring

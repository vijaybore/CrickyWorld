import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const API = '/api/tournaments'
const token = () => localStorage.getItem('token')
const headers = () => ({ Authorization: `Bearer ${token()}` })

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = b => `${Math.floor(b/6)}.${b%6}`

function computePoints(teams, fixtures) {
  const table = {}
  teams.forEach(t => {
    table[t.name] = { name:t.name, logoUrl:t.logoUrl, p:0, w:0, l:0, pts:0, nrr:0, runsFor:0, ballsFor:0, runsAgainst:0, ballsAgainst:0 }
  })
  fixtures.filter(f => f.stage === 'league' && f.status === 'completed' && f.winner).forEach(f => {
    const t1 = table[f.team1], t2 = table[f.team2]
    if (!t1 || !t2) return
    t1.p++; t2.p++
    if (f.winner === f.team1) { t1.w++; t1.pts += 2; t2.l++ }
    else                       { t2.w++; t2.pts += 2; t1.l++ }
    // parse scores for NRR
    const parse = s => {
      if (!s) return null
      const m = s.match(/(\d+)\/(\d+)\s*\(([0-9.]+)\)/)
      if (!m) return null
      const balls = Math.floor(parseFloat(m[3]))*6 + (parseFloat(m[3]) % 1 * 10)
      return { runs: parseInt(m[1]), balls }
    }
    const s1 = parse(f.team1Score), s2 = parse(f.team2Score)
    if (s1 && s2) {
      t1.runsFor += s1.runs;    t1.ballsFor += s1.balls
      t1.runsAgainst += s2.runs; t1.ballsAgainst += s2.balls
      t2.runsFor += s2.runs;    t2.ballsFor += s2.balls
      t2.runsAgainst += s1.runs; t2.ballsAgainst += s1.balls
    }
  })
  Object.values(table).forEach(t => {
    const rr1 = t.ballsFor      > 0 ? t.runsFor      / (t.ballsFor/6)      : 0
    const rr2 = t.ballsAgainst  > 0 ? t.runsAgainst  / (t.ballsAgainst/6)  : 0
    t.nrr = (rr1 - rr2).toFixed(3)
  })
  return Object.values(table).sort((a,b) => b.pts - a.pts || parseFloat(b.nrr) - parseFloat(a.nrr))
}

function computeStats(fixtures, allMatches) {
  const players = {}
  const get = name => {
    if (!players[name]) players[name] = { name, runs:0, balls:0, fours:0, sixes:0, fifties:0, hundreds:0, highScore:0, timesOut:0, wickets:0, oversBowled:0, runsConceded:0, wides:0, bestWickets:0, bestWicketsRuns:999, dotBalls:0, fiveWickets:0, matchesBowled:0 }
    return players[name]
  }
  allMatches.forEach(m => {
    [m.innings1, m.innings2].forEach(inn => {
      if (!inn) return
      ;(inn.battingStats||[]).forEach(p => {
        const pl = get(p.name)
        pl.runs += p.runs||0; pl.balls += p.balls||0; pl.fours += p.fours||0; pl.sixes += p.sixes||0
        if ((p.runs||0) >= 50 && (p.runs||0) < 100) pl.fifties++
        if ((p.runs||0) >= 100) pl.hundreds++
        if ((p.runs||0) > pl.highScore) pl.highScore = p.runs||0
        if (p.isOut) pl.timesOut++
      })
      ;(inn.bowlingStats||[]).forEach(p => {
        const pl = get(p.name)
        const w = p.wickets||0
        const r = p.runs||0
        const b = p.balls||0
        pl.wickets      += w
        pl.oversBowled  += b
        pl.runsConceded += r
        pl.wides        += p.wides||0
        pl.dotBalls     += p.dotBalls||0
        if (b > 0) pl.matchesBowled++
        // best bowling figures: most wickets, then fewest runs
        if (w > pl.bestWickets || (w === pl.bestWickets && r < pl.bestWicketsRuns)) {
          pl.bestWickets = w; pl.bestWicketsRuns = r
        }
        if (w >= 5) pl.fiveWickets++
      })
    })
  })
  return Object.values(players).map(p => ({
    ...p,
    // batting derived
    avg:      p.timesOut > 0 ? (p.runs/p.timesOut).toFixed(1) : p.runs > 0 ? `${p.runs}*` : '0',
    sr:       p.balls > 0 ? (p.runs/p.balls*100).toFixed(1) : '0',
    // bowling derived
    eco:      p.oversBowled > 0 ? (p.runsConceded/(p.oversBowled/6)).toFixed(2) : '0',
    bowlAvg:  p.wickets > 0 ? (p.runsConceded/p.wickets).toFixed(1) : '—',
    bowlSR:   p.wickets > 0 ? (p.oversBowled/p.wickets).toFixed(1) : '—',   // balls per wicket
    bestFig:  p.bestWickets > 0 ? `${p.bestWickets}/${p.bestWicketsRuns}` : '0/0',
    overs:    fmt(p.oversBowled),
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:800,
    background: active ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#1e1e1e',
    color: active ? '#fff' : '#555',
    boxShadow: active ? '0 2px 10px rgba(204,0,0,0.3)' : 'none',
    transition:'all 0.15s', flexShrink:0
  }}>{label}</button>
)

const Card = ({ children, style }) => (
  <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden', ...style }}>{children}</div>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1.5, padding:'14px 16px 8px' }}>{children}</div>
)

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:6 }}>{label}</div>}
    <input {...props} style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', ...props.style }} />
  </div>
)

function ImageUpload({ current, onUpload, label, size=56 }) {
  const ref = useRef()
  const [loading, setLoading] = useState(false)
  const handleFile = async e => {
    const file = e.target.files[0]; if (!file) return
    setLoading(true)
    try {
      const fd = new FormData(); fd.append('image', file)
      const { data } = await axios.post(`${API}/upload`, fd, { headers: { ...headers(), 'Content-Type':'multipart/form-data' } })
      onUpload(data.url)
    } catch { alert('Upload failed') }
    setLoading(false)
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div onClick={() => ref.current.click()} style={{ width:size, height:size, borderRadius:size/2, background:'#111', border:'2px dashed #333', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', flexShrink:0, position:'relative' }}>
        {current ? <img src={current} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:size/3, color:'#444' }}>📷</span>}
        {loading && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>...</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
      {label && <div style={{ fontSize:10, color:'#555', fontWeight:700 }}>{label}</div>}
    </div>
  )
}

// ── TOURNAMENT LIST ───────────────────────────────────────────────────────────
function TournamentList({ onOpen, autoCreate, onAutoCreateDone }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [creating, setCreating]       = useState(false)
  const [form, setForm]               = useState({ name:'' })

  useEffect(() => {
    axios.get(API, { headers: headers() }).then(r => setTournaments(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Auto-open create form when coming from "New Tournament" button
  useEffect(() => {
    if (autoCreate && !loading) {
      setCreating(true)
      onAutoCreateDone?.()
    }
  }, [autoCreate, loading])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    try {
      const { data } = await axios.post(API, { name:form.name.trim() }, { headers: headers() })
      setTournaments(t => [data, ...t])
      setCreating(false)
      setForm({ name:'' })
      onOpen(data._id)
    } catch { alert('Failed to create') }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete tournament?')) return
    await axios.delete(`${API}/${id}`, { headers: headers() })
    setTournaments(t => t.filter(x => x._id !== id))
  }

  const statusColor = { setup:'#fb923c', league:'#4ade80', playoffs:'#c084fc', completed:'#555' }

  return (
    <div style={{ padding:'12px 12px 80px' }}>
      {/* create form */}
      {creating && (
        <Card style={{ padding:16, marginBottom:14, border:'1px solid rgba(255,68,68,0.2)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#f0f0f0', marginBottom:14 }}>New Tournament</div>
          <Input label="TOURNAMENT NAME" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. CrickyWorld T10 League" />
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button onClick={() => setCreating(false)} style={{ flex:1, padding:'12px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>Create Tournament</button>
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#555' }}>Loading...</div>
      ) : tournaments.length === 0 && !creating ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#444' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏆</div>
          <div style={{ fontSize:16, color:'#555', fontWeight:700 }}>No tournaments yet</div>
          <div style={{ fontSize:13, color:'#444', marginTop:4 }}>Tap + to create one</div>
        </div>
      ) : (
        tournaments.map(t => (
          <div key={t._id} onClick={() => onOpen(t._id)} style={{ position:'relative', marginBottom:10, cursor:'pointer' }}>
            <Card style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', marginBottom:4 }}>{t.name}</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:800, color: statusColor[t.status]||'#aaa', background: statusColor[t.status]+'22'||'#1e1e1e', padding:'2px 8px', borderRadius:10 }}>{t.status.toUpperCase()}</span>
                    <span style={{ fontSize:12, color:'#555' }}>{t.teams?.length||0} teams</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color:'#fff' }}>{t.fixtures?.filter(f=>f.status==='completed').length||0}</div>
                    <div style={{ fontSize:10, color:'#555' }}>matches done</div>
                  </div>
                  <button onClick={e=>handleDelete(e,t._id)} style={{ width:28, height:28, borderRadius:7, background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.2)', color:'#ff4444', fontSize:13, cursor:'pointer' }}>✕</button>
                </div>
              </div>
            </Card>
          </div>
        ))
      )}

      {/* FAB */}
      {!creating && (
        <button onClick={() => setCreating(true)} style={{ position:'fixed', bottom:80, right:20, width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontSize:24, cursor:'pointer', boxShadow:'0 4px 20px rgba(204,0,0,0.5)', zIndex:100 }}>+</button>
      )}
    </div>
  )
}

// ── TOURNAMENT DETAIL ─────────────────────────────────────────────────────────
function TournamentDetail({ id, onBack }) {
  const navigate = useNavigate()
  const [t, setT]         = useState(null)
  const [tab, setTab]     = useState('overview')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = () =>
    axios.get(`${API}/${id}`, { headers:headers() }).then(r => setT(r.data)).catch(console.error)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [id])

  // listen for tab-switch events from child tabs (e.g. Overview → Playoffs)
  useEffect(() => {
    const handler = e => setTab(e.detail)
    window.addEventListener('switchTab', handler)
    return () => window.removeEventListener('switchTab', handler)
  }, [])

  // load matches for stats
  useEffect(() => {
    if (!t) return
    const ids = t.fixtures.filter(f=>f.matchId).map(f=>f.matchId)
    Promise.all(ids.map(mid => axios.get(`/api/matches/${mid}`, { headers:headers() }).then(r=>r.data).catch(()=>null)))
      .then(ms => setMatches(ms.filter(Boolean)))
  }, [t?.fixtures?.length])

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#555' }}>Loading...</div>
  if (!t) return null

  const tabs = [
    { key:'overview', label:'Overview' },
    { key:'teams',    label:'Teams' },
    { key:'fixtures', label:'Fixtures' },
    { key:'points',   label:'Points' },
    { key:'stats',    label:'Stats' },
    { key:'results',  label:'Results' },
    { key:'playoffs', label:'Playoffs' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* header */}
      <div style={{ padding:'12px 16px 0', background:'#1a1a1a', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <button onClick={onBack} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#aaa', fontSize:16, cursor:'pointer' }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
            <div style={{ fontSize:11, color:'#555' }}>{t.teams.length} teams • {t.overs} ov • {t.status}</div>
          </div>
        </div>
        {/* tab bar */}
        <div style={{ display:'flex', gap:0, overflowX:'auto', paddingBottom:0 }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', whiteSpace:'nowrap',
              fontSize:12, fontWeight:800, color: tab===tb.key ? '#ff4444' : '#444',
              borderBottom: tab===tb.key ? '2px solid #ff4444' : '2px solid transparent',
              transition:'all 0.15s'
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      {/* tab content */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 0 80px' }}>
        {tab === 'overview'  && <OverviewTab  t={t} setT={setT} refresh={refresh} />}
        {tab === 'teams'     && <TeamsTab     t={t} refresh={refresh} />}
        {tab === 'fixtures'  && <FixturesTab  t={t} refresh={refresh} navigate={navigate} />}
        {tab === 'points'    && <PointsTab    t={t} />}
        {tab === 'stats'     && <StatsTab     t={t} matches={matches} />}
        {tab === 'results'   && <ResultsTab   t={t} />}
        {tab === 'playoffs'  && <PlayoffsTab  t={t} refresh={refresh} navigate={navigate} />}
      </div>
    </div>
  )
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ t, setT, refresh }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ name: t.name })

  const save = async () => {
    const { data } = await axios.patch(`${API}/${t._id}`, form, { headers:headers() })
    setT(data); setEditing(false)
  }

  const genFixtures = async () => {
    if (!window.confirm('This will replace all league fixtures. Continue?')) return
    try {
      await axios.post(`${API}/${t._id}/generate-fixtures`, {}, { headers:headers() })
      refresh()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
  }

  const genPlayoffs = async () => {
    if (!window.confirm('Generate playoff bracket?')) return
    try {
      await axios.post(`${API}/${t._id}/generate-playoffs`, {}, { headers:headers() })
      refresh()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
  }

  const leagueDone = t.fixtures.filter(f=>f.stage==='league').every(f=>f.status==='completed')
  const totalLeague = t.fixtures.filter(f=>f.stage==='league').length
  const doneLeague  = t.fixtures.filter(f=>f.stage==='league'&&f.status==='completed').length

  return (
    <div style={{ padding:'12px 12px 0' }}>
      {/* stats cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
        {[
          { label:'Teams',    value: t.teams.length,       color:'#60a5fa' },
          { label:'Matches',  value: totalLeague,           color:'#4ade80' },
          { label:'Done',     value: doneLeague,            color:'#fb923c' },
        ].map(s => (
          <Card key={s.label} style={{ padding:'12px 10px', textAlign:'center' }}>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:26, fontWeight:700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#555', fontWeight:800 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* edit tournament */}
      <Card style={{ padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: editing ? 14 : 0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#aaa' }}>Tournament Settings</div>
          <button onClick={() => setEditing(e=>!e)} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#aaa', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing && (
          <>
            <Input label="TOURNAMENT NAME" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            <button onClick={save} style={{ width:'100%', padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer' }}>Save Changes</button>
          </>
        )}
        {!editing && (
          <div style={{ marginTop:10, display:'flex', gap:16 }}>
            <div><div style={{ fontSize:11, color:'#555' }}>Name</div><div style={{ fontSize:14, color:'#ddd', fontWeight:700 }}>{t.name}</div></div>
            <div><div style={{ fontSize:11, color:'#555' }}>Status</div><div style={{ fontSize:14, color:'#ff4444', fontWeight:700, textTransform:'capitalize' }}>{t.status}</div></div>
          </div>
        )}
      </Card>

      {/* actions */}
      <Card style={{ padding:'14px 16px', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#aaa', marginBottom:12 }}>Actions</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={genFixtures} style={{ padding:'12px', borderRadius:10, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80', fontWeight:800, fontSize:13, cursor:'pointer' }}>
            🗓 Generate League Fixtures (Round Robin)
          </button>
          {leagueDone && t.teams.length >= 2 && (
            <button onClick={() => window.dispatchEvent(new CustomEvent('switchTab',{detail:'playoffs'}))} style={{ padding:'12px', borderRadius:10, background:'rgba(192,132,252,0.1)', border:'1px solid rgba(192,132,252,0.2)', color:'#c084fc', fontWeight:800, fontSize:13, cursor:'pointer' }}>
              🏆 Set Up Playoffs →
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── TEAMS TAB ─────────────────────────────────────────────────────────────────
function TeamsTab({ t, refresh }) {
  const [addingTeam, setAddingTeam]     = useState(false)
  const [editTeam, setEditTeam]         = useState(null)
  const [teamForm, setTeamForm]         = useState({ name:'', logoUrl:'' })
  const [addingPlayer, setAddingPlayer] = useState(null)
  const [playerForm, setPlayerForm]     = useState({ name:'', imageUrl:'' })
  const [expanded, setExpanded]         = useState({})

  const saveTeam = async () => {
    if (!teamForm.name.trim()) return
    if (editTeam) {
      await axios.patch(`${API}/${t._id}/teams/${editTeam._id}`, teamForm, { headers:headers() })
    } else {
      await axios.post(`${API}/${t._id}/teams`, teamForm, { headers:headers() })
    }
    refresh(); setAddingTeam(false); setEditTeam(null); setTeamForm({ name:'', logoUrl:'' })
  }

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Remove team?')) return
    await axios.delete(`${API}/${t._id}/teams/${teamId}`, { headers:headers() })
    refresh()
  }

  const savePlayer = async (teamId) => {
    if (!playerForm.name.trim()) return
    await axios.post(`${API}/${t._id}/teams/${teamId}/players`, playerForm, { headers:headers() })
    refresh(); setAddingPlayer(null); setPlayerForm({ name:'', imageUrl:'' })
  }

  const deletePlayer = async (teamId, playerId) => {
    await axios.delete(`${API}/${t._id}/teams/${teamId}/players/${playerId}`, { headers:headers() })
    refresh()
  }

  return (
    <div style={{ padding:'12px 12px 0' }}>
      {(addingTeam || editTeam) && (
        <Card style={{ padding:16, marginBottom:12, border:'1px solid rgba(255,68,68,0.2)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#f0f0f0', marginBottom:14 }}>{editTeam ? 'Edit Team' : 'Add Team'}</div>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
            <ImageUpload current={teamForm.logoUrl} onUpload={url => setTeamForm(f=>({...f,logoUrl:url}))} label="Logo" size={60} />
            <div style={{ flex:1 }}>
              <Input label="TEAM NAME" value={teamForm.name} onChange={e=>setTeamForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Royal Challengers" />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setAddingTeam(false); setEditTeam(null); setTeamForm({ name:'', logoUrl:'' }) }} style={{ flex:1, padding:'11px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button onClick={saveTeam} style={{ flex:2, padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>Save Team</button>
          </div>
        </Card>
      )}

      {t.teams.map(team => (
        <Card key={team._id} style={{ marginBottom:10 }}>
          {/* team header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom: expanded[team._id] ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#111', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {team.logoUrl ? <img src={team.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:18 }}>🏏</span>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#f0f0f0' }}>{team.name}</div>
              <div style={{ fontSize:11, color:'#555' }}>{team.players.length} players</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => { setEditTeam(team); setTeamForm({ name:team.name, logoUrl:team.logoUrl||'' }); setAddingTeam(false) }} style={{ width:30, height:30, borderRadius:7, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontSize:13, cursor:'pointer' }}>✎</button>
              <button onClick={() => setExpanded(e=>({...e,[team._id]:!e[team._id]}))} style={{ width:30, height:30, borderRadius:7, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontSize:13, cursor:'pointer' }}>
                {expanded[team._id] ? '▲' : '▼'}
              </button>
              <button onClick={() => deleteTeam(team._id)} style={{ width:30, height:30, borderRadius:7, background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.2)', color:'#ff4444', fontSize:13, cursor:'pointer' }}>✕</button>
            </div>
          </div>

          {/* players */}
          {expanded[team._id] && (
            <div style={{ padding:'8px 14px 12px' }}>
              {team.players.map((p,i) => (
                <div key={p._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'#111', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:14, color:'#555' }}>👤</span>}
                  </div>
                  <div style={{ flex:1, fontSize:13, color:'#ddd', fontWeight:600 }}>{i+1}. {p.name}</div>
                  <button onClick={() => deletePlayer(team._id, p._id)} style={{ width:24, height:24, borderRadius:6, background:'rgba(255,68,68,0.08)', border:'1px solid rgba(255,68,68,0.15)', color:'#ff6666', fontSize:11, cursor:'pointer' }}>✕</button>
                </div>
              ))}

              {/* add player inline */}
              {addingPlayer === team._id ? (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                    <ImageUpload current={playerForm.imageUrl} onUpload={url=>setPlayerForm(f=>({...f,imageUrl:url}))} size={40} />
                    <input value={playerForm.name} onChange={e=>setPlayerForm(f=>({...f,name:e.target.value}))}
                      placeholder="Player name" onKeyDown={e=>e.key==='Enter'&&savePlayer(team._id)}
                      style={{ flex:1, background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none' }} />
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setAddingPlayer(null); setPlayerForm({ name:'', imageUrl:'' }) }} style={{ flex:1, padding:'8px', borderRadius:8, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:700, fontSize:12, cursor:'pointer' }}>Cancel</button>
                    <button onClick={() => savePlayer(team._id)} style={{ flex:2, padding:'8px', borderRadius:8, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.25)', color:'#4ade80', fontWeight:800, fontSize:12, cursor:'pointer' }}>Add Player</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingPlayer(team._id); setPlayerForm({ name:'', imageUrl:'' }) }} style={{ marginTop:8, width:'100%', padding:'8px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.1)', color:'#555', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  + Add Player
                </button>
              )}
            </div>
          )}
        </Card>
      ))}

      <button onClick={() => { setAddingTeam(true); setEditTeam(null); setTeamForm({ name:'', logoUrl:'' }) }} style={{ width:'100%', padding:'13px', borderRadius:12, background:'rgba(255,68,68,0.08)', border:'1px dashed rgba(255,68,68,0.25)', color:'#ff6666', fontWeight:800, fontSize:13, cursor:'pointer', marginTop:4 }}>
        + Add Team
      </button>
    </div>
  )
}

// ── FIXTURES TAB ──────────────────────────────────────────────────────────────
function FixturesTab({ t, refresh, navigate }) {
  const [addingFixture, setAddingFixture] = useState(false)
  const [form, setForm]                   = useState({ team1:'', team2:'', date:'', time:'', venue:'' })
  const [startModal, setStartModal]       = useState(null)
  const [tossForm, setTossForm]           = useState({ tossWinner:'', battingFirst:'' })

  const leagueFixtures  = t.fixtures.filter(f => f.stage === 'league')
  const playoffFixtures = t.fixtures.filter(f => f.stage !== 'league')

  const addFixture = async () => {
    if (!form.team1 || !form.team2 || form.team1===form.team2) return alert('Select 2 different teams')
    await axios.post(`${API}/${t._id}/fixtures`, { ...form, stage:'league', status:'scheduled' }, { headers:headers() })
    refresh(); setAddingFixture(false); setForm({ team1:'', team2:'', date:'', time:'', venue:'' })
  }

  const deleteFixture = async (fid) => {
    if (!window.confirm('Delete fixture?')) return
    await axios.delete(`${API}/${t._id}/fixtures/${fid}`, { headers:headers() })
    refresh()
  }

  const startMatch = async () => {
    if (!tossForm.tossWinner || !tossForm.battingFirst) return alert('Complete toss details')
    try {
      const { data } = await axios.post(`${API}/${t._id}/fixtures/${startModal._id}/start`, tossForm, { headers:headers() })
      setStartModal(null)
      navigate(`/scoring/${data.match._id}`)
    } catch (e) { alert(e.response?.data?.message || 'Failed to start') }
  }

  const syncResult = async (fid) => {
    await axios.post(`${API}/${t._id}/fixtures/${fid}/sync`, {}, { headers:headers() })
    refresh()
  }

  const FixtureCard = ({ f }) => {
    const statusColor = { scheduled:'#555', live:'#4ade80', completed:'#888' }
    return (
      <Card style={{ marginBottom:8, border: f.status==='live' ? '1px solid rgba(74,222,128,0.25)' : undefined }}>
        <div style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:10, fontWeight:800, color: statusColor[f.status], letterSpacing:1 }}>
              {f.status==='live' ? '● LIVE' : f.status.toUpperCase()}
              {f.stage!=='league' && <span style={{ color:'#c084fc', marginLeft:6 }}>
                {f.stage==='sf1'?'SF1':f.stage==='sf2'?'SF2':'FINAL'}
              </span>}
            </span>
            {(f.date || f.time) && <span style={{ fontSize:11, color:'#555' }}>{f.date} {f.time}</span>}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#f0f0f0' }}>{f.team1}</div>
            <div style={{ fontSize:12, color:'#ff4444', fontWeight:800 }}>VS</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#f0f0f0', textAlign:'right' }}>{f.team2}</div>
          </div>

          {f.status === 'completed' && (
            <div style={{ marginTop:6, fontSize:12, color:'#facc15', fontWeight:700 }}>🏆 {f.result}</div>
          )}
          {f.status === 'completed' && f.team1Score && (
            <div style={{ marginTop:4, display:'flex', justifyContent:'space-between', fontSize:11, color:'#555' }}>
              <span>{f.team1Score}</span><span>{f.team2Score}</span>
            </div>
          )}
          {f.venue && <div style={{ fontSize:11, color:'#444', marginTop:4 }}>📍 {f.venue}</div>}

          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            {f.status === 'scheduled' && (
              <button onClick={() => { setStartModal(f); setTossForm({ tossWinner:'', battingFirst:'' }) }} style={{ flex:1, padding:'9px', borderRadius:9, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer' }}>
                ▶ Start Match
              </button>
            )}
            {f.status === 'live' && f.matchId && (
              <>
                <button onClick={() => navigate(`/scoring/${f.matchId}`)} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.25)', color:'#4ade80', fontWeight:800, fontSize:12, cursor:'pointer' }}>
                  🏏 Continue Scoring
                </button>
                <button onClick={() => syncResult(f._id)} style={{ padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#888', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                  Sync
                </button>
              </>
            )}
            {f.status !== 'live' && (
              <button onClick={() => deleteFixture(f._id)} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,68,68,0.08)', border:'1px solid rgba(255,68,68,0.15)', color:'#ff6666', fontSize:13, cursor:'pointer' }}>✕</button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ padding:'12px 12px 0' }}>
      {/* Toss / Start modal */}
      {startModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ width:'100%', maxWidth:360, background:'#1c1c1c', borderRadius:20, padding:'24px 20px', border:'1px solid rgba(255,68,68,0.3)' }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', marginBottom:4 }}>Start Match</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:20 }}>{startModal.team1} vs {startModal.team2}</div>

            <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>TOSS WON BY</div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[startModal.team1, startModal.team2].map(tm => (
                <button key={tm} onClick={() => setTossForm(f=>({...f,tossWinner:tm,battingFirst:''}))} style={{
                  flex:1, padding:'10px', borderRadius:10,
                  background: tossForm.tossWinner===tm ? 'rgba(204,0,0,0.2)' : '#1e1e1e',
                  border: `2px solid ${tossForm.tossWinner===tm ? '#ff4444' : '#2a2a2a'}`,
                  color: tossForm.tossWinner===tm ? '#fff' : '#666', fontWeight:700, fontSize:13, cursor:'pointer'
                }}>{tm}</button>
              ))}
            </div>

            {tossForm.tossWinner && (
              <>
                <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>CHOSE TO BAT</div>
                <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                  {[startModal.team1, startModal.team2].map(tm => (
                    <button key={tm} onClick={() => setTossForm(f=>({...f,battingFirst:tm}))} style={{
                      flex:1, padding:'10px', borderRadius:10,
                      background: tossForm.battingFirst===tm ? 'rgba(74,222,128,0.15)' : '#1e1e1e',
                      border: `2px solid ${tossForm.battingFirst===tm ? '#4ade80' : '#2a2a2a'}`,
                      color: tossForm.battingFirst===tm ? '#4ade80' : '#666', fontWeight:700, fontSize:13, cursor:'pointer'
                    }}>{tm}</button>
                  ))}
                </div>
              </>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setStartModal(null)} style={{ flex:1, padding:'12px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={startMatch} disabled={!tossForm.battingFirst} style={{ flex:2, padding:'12px', borderRadius:10, background: tossForm.battingFirst ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#2a2a2a', border:'none', color: tossForm.battingFirst ? '#fff' : '#555', fontWeight:800, fontSize:13, cursor: tossForm.battingFirst ? 'pointer' : 'not-allowed' }}>
                🏏 Start Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* add fixture form */}
      {addingFixture && (
        <Card style={{ padding:16, marginBottom:12, border:'1px solid rgba(255,68,68,0.2)' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#f0f0f0', marginBottom:14 }}>Add Fixture</div>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'#555', fontWeight:800, marginBottom:6 }}>TEAM 1</div>
              <select value={form.team1} onChange={e=>setForm(f=>({...f,team1:e.target.value}))} style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}>
                <option value="">Select</option>
                {t.teams.map(tm=><option key={tm._id} value={tm.name}>{tm.name}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'#555', fontWeight:800, marginBottom:6 }}>TEAM 2</div>
              <select value={form.team2} onChange={e=>setForm(f=>({...f,team2:e.target.value}))} style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}>
                <option value="">Select</option>
                {t.teams.map(tm=><option key={tm._id} value={tm.name}>{tm.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{ flex:1, background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}/>
            <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={{ flex:1, background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}/>
          </div>
          <input value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} placeholder="Venue (optional)" style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:9, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:12 }}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setAddingFixture(false)} style={{ flex:1, padding:'11px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button onClick={addFixture} style={{ flex:2, padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>Add Fixture</button>
          </div>
        </Card>
      )}

      {leagueFixtures.length === 0 && playoffFixtures.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#444' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🗓</div>
          <div style={{ fontSize:14, color:'#555', fontWeight:700 }}>No fixtures yet</div>
          <div style={{ fontSize:12, color:'#444', marginTop:4 }}>Use Overview → Generate Fixtures or add manually</div>
        </div>
      ) : (
        <>
          {leagueFixtures.length > 0 && (
            <>
              <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, padding:'8px 2px' }}>LEAGUE STAGE</div>
              {leagueFixtures.map(f => <FixtureCard key={f._id} f={f} />)}
            </>
          )}
          {playoffFixtures.length > 0 && (
            <>
              <div style={{ fontSize:11, color:'#c084fc', fontWeight:800, letterSpacing:1, padding:'12px 2px 8px' }}>PLAYOFFS</div>
              {playoffFixtures.map(f => <FixtureCard key={f._id} f={f} />)}
            </>
          )}
        </>
      )}

      {!addingFixture && (
        <button onClick={() => setAddingFixture(true)} style={{ width:'100%', padding:'12px', borderRadius:12, background:'rgba(255,68,68,0.08)', border:'1px dashed rgba(255,68,68,0.25)', color:'#ff6666', fontWeight:800, fontSize:13, cursor:'pointer', marginTop:8 }}>
          + Add Fixture Manually
        </button>
      )}
    </div>
  )
}

// ── POINTS TABLE TAB ──────────────────────────────────────────────────────────
function PointsTab({ t }) {
  const table = computePoints(t.teams, t.fixtures)
  return (
    <div style={{ padding:'12px 12px 0' }}>
      <Card>
        {/* header */}
        <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 32px 28px 28px 40px 56px', padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, color:'#444', fontWeight:800 }}>#</div>
          <div style={{ fontSize:10, color:'#444', fontWeight:800 }}>TEAM</div>
          {['P','W','L','PTS','NRR'].map(h => <div key={h} style={{ fontSize:10, color:'#444', fontWeight:800, textAlign:'center' }}>{h}</div>)}
        </div>
        {table.length === 0 ? (
          <div style={{ padding:'30px', textAlign:'center', color:'#555', fontSize:13 }}>No matches completed yet</div>
        ) : table.map((row, i) => (
          <div key={row.name} style={{ display:'grid', gridTemplateColumns:'28px 1fr 32px 28px 28px 40px 56px', padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center', background: i < 2 ? 'rgba(74,222,128,0.04)' : i < 4 ? 'rgba(96,165,250,0.03)' : 'transparent' }}>
            <div style={{ fontSize:13, color: i===0?'#facc15':i<2?'#4ade80':'#555', fontWeight:800 }}>{i+1}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'#111', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {row.logoUrl ? <img src={row.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:12 }}>🏏</span>}
              </div>
              <span style={{ fontSize:13, color: i<2?'#f0f0f0':'#aaa', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:90 }}>{row.name}</span>
            </div>
            <div style={{ fontSize:13, color:'#888', textAlign:'center' }}>{row.p}</div>
            <div style={{ fontSize:13, color:'#4ade80', fontWeight:700, textAlign:'center' }}>{row.w}</div>
            <div style={{ fontSize:13, color:'#ff4444', fontWeight:700, textAlign:'center' }}>{row.l}</div>
            <div style={{ fontSize:15, color:'#fff', fontWeight:800, textAlign:'center' }}>{row.pts}</div>
            <div style={{ fontSize:12, color: parseFloat(row.nrr)>=0?'#4ade80':'#ff4444', fontWeight:700, textAlign:'center' }}>{row.nrr}</div>
          </div>
        ))}
        {table.length > 0 && (
          <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.02)', display:'flex', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8, height:8, borderRadius:2, background:'rgba(74,222,128,0.4)' }}/><span style={{ fontSize:10, color:'#555' }}>Qualify playoffs</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8, height:8, borderRadius:2, background:'rgba(96,165,250,0.3)' }}/><span style={{ fontSize:10, color:'#555' }}>Possible qualify</span></div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────
function StatsTab({ t, matches }) {
  const [statTab, setStatTab] = useState('batting')
  const stats = computeStats(t.fixtures, matches)

  const batting = [...stats].filter(p => p.balls > 0)
  const bowling = [...stats].filter(p => p.oversBowled > 0)

  // Generic bar-chart stat row — supports ascending sort (lower is better)
  const StatRow = ({ label, players, valueKey, format, color, asc, subtitle }) => {
    const sorted = [...players]
      .filter(p => {
        const v = parseFloat(p[valueKey])
        return !isNaN(v) && p[valueKey] !== '—'
      })
      .sort((a, b) => asc
        ? parseFloat(a[valueKey]) - parseFloat(b[valueKey])
        : parseFloat(b[valueKey]) - parseFloat(a[valueKey])
      )
      .slice(0, 5)

    const vals   = sorted.map(p => parseFloat(p[valueKey]))
    const maxVal = asc ? Math.max(...vals) || 1 : (vals[0] || 1)

    return (
      <Card style={{ marginBottom:10 }}>
        <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#aaa', letterSpacing:0.5 }}>{label}</div>
          {subtitle && <div style={{ fontSize:10, color:'#444', fontWeight:700 }}>{subtitle}</div>}
        </div>
        {sorted.map((p, i) => {
          const raw  = p[valueKey]
          const val  = parseFloat(raw)
          const barW = asc
            ? Math.min(100, (1 - (val - Math.min(...vals)) / (Math.max(...vals) - Math.min(...vals) || 1)) * 100)
            : Math.min(100, (val / maxVal) * 100)
          return (
            <div key={p.name} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:13, color: i===0?color:'#555', fontWeight:800, width:18 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:'#ddd', fontWeight:700, marginBottom:3 }}>{p.name}</div>
                <div style={{ height:4, background:'#2a2a2a', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:2, background: color, width:`${barW}%`, transition:'width 0.4s' }}/>
                </div>
              </div>
              <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:18, fontWeight:700, color: i===0?color:'#888', minWidth:52, textAlign:'right' }}>
                {format ? format(raw) : raw}
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && <div style={{ padding:'16px 14px', fontSize:12, color:'#444' }}>No data yet</div>}
      </Card>
    )
  }

  // Special row for bowling figures (e.g. "5/23") — sort by wickets desc, then runs asc
  const BestFigRow = ({ players }) => {
    const sorted = [...players]
      .filter(p => p.bestWickets > 0)
      .sort((a,b) => b.bestWickets - a.bestWickets || a.bestWicketsRuns - b.bestWicketsRuns)
      .slice(0, 5)
    return (
      <Card style={{ marginBottom:10 }}>
        <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#aaa', letterSpacing:0.5 }}>BEST BOWLING FIGURES</div>
          <div style={{ fontSize:10, color:'#444', fontWeight:700 }}>in a match</div>
        </div>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:13, color: i===0?'#fb923c':'#555', fontWeight:800, width:18 }}>{i+1}</div>
            <div style={{ flex:1, fontSize:13, color:'#ddd', fontWeight:700 }}>{p.name}</div>
            <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color: i===0?'#fb923c':'#888' }}>
              {p.bestWickets}/{p.bestWicketsRuns}
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div style={{ padding:'16px 14px', fontSize:12, color:'#444' }}>No data yet</div>}
      </Card>
    )
  }

  // Section divider
  const Divider = ({ label }) => (
    <div style={{ fontSize:10, color:'#444', fontWeight:800, letterSpacing:1.5, padding:'12px 2px 6px' }}>{label}</div>
  )

  return (
    <div style={{ padding:'12px 12px 0' }}>
      {/* tab switcher */}
      <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
        <Chip label="🏏 Batting" active={statTab==='batting'} onClick={()=>setStatTab('batting')} />
        <Chip label="🎳 Bowling" active={statTab==='bowling'} onClick={()=>setStatTab('bowling')} />
      </div>

      {/* ── BATTING ── */}
      {statTab === 'batting' && (
        <>
          <Divider label="RUNS & SCORING" />
          <StatRow label="MOST RUNS"        players={batting} valueKey="runs"      color="#ff4444" />
          <StatRow label="HIGHEST SCORE"    players={batting} valueKey="highScore" color="#ff6666" subtitle="in an innings" />
          <StatRow label="BEST AVERAGE"     players={batting.filter(p=>p.timesOut>0)} valueKey="avg" color="#60a5fa" subtitle="min 1 dismissal" />

          <Divider label="STRIKE PLAY" />
          <StatRow label="BEST STRIKE RATE" players={batting.filter(p=>p.balls>=6)} valueKey="sr" color="#facc15" subtitle="min 6 balls" />
          <StatRow label="MOST FOURS"       players={batting} valueKey="fours"     color="#4ade80" />
          <StatRow label="MOST SIXES"       players={batting} valueKey="sixes"     color="#c084fc" />

          <Divider label="MILESTONES" />
          <StatRow label="MOST HALF CENTURIES" players={batting} valueKey="fifties"   color="#fb923c" />
          <StatRow label="MOST CENTURIES"      players={batting} valueKey="hundreds"  color="#facc15" />
        </>
      )}

      {/* ── BOWLING ── */}
      {statTab === 'bowling' && (
        <>
          <Divider label="WICKETS" />
          <StatRow label="MOST WICKETS"       players={bowling} valueKey="wickets"     color="#ff4444" />
          <BestFigRow players={bowling} />
          <StatRow label="MOST 5-WICKET HAULS" players={bowling} valueKey="fiveWickets" color="#ff4444" subtitle="5W in an innings" />

          <Divider label="ECONOMY & AVERAGES" />
          <StatRow
            label="BEST ECONOMY"
            players={bowling.filter(p=>p.oversBowled>=6)}
            valueKey="eco"
            color="#4ade80"
            asc
            subtitle="min 1 over · lower is better"
          />
          <StatRow
            label="BEST BOWLING AVERAGE"
            players={bowling.filter(p=>p.wickets>=3)}
            valueKey="bowlAvg"
            color="#60a5fa"
            asc
            subtitle="runs per wicket · lower is better"
          />
          <StatRow
            label="BEST BOWLING STRIKE RATE"
            players={bowling.filter(p=>p.wickets>=3)}
            valueKey="bowlSR"
            color="#38bdf8"
            asc
            subtitle="balls per wicket · lower is better"
          />

          <Divider label="CONTROL" />
          <StatRow label="MOST DOT BALLS"    players={bowling} valueKey="dotBalls"  color="#a3e635" />
          <StatRow label="MOST OVERS BOWLED" players={bowling} valueKey="oversBowled" format={v=>fmt(parseInt(v))} color="#888" />
        </>
      )}
    </div>
  )
}

// ── RESULTS TAB ───────────────────────────────────────────────────────────────
function ResultsTab({ t }) {
  const completed = t.fixtures.filter(f => f.status === 'completed')
  return (
    <div style={{ padding:'12px 12px 0' }}>
      {completed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:'#444' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🏏</div>
          <div style={{ fontSize:14, color:'#555' }}>No completed matches yet</div>
        </div>
      ) : completed.map(f => (
        <Card key={f._id} style={{ marginBottom:10, padding:'14px 16px' }}>
          {f.stage !== 'league' && (
            <div style={{ fontSize:10, color:'#c084fc', fontWeight:800, letterSpacing:1, marginBottom:6 }}>
              {{ sf1:'SEMI FINAL 1', sf2:'SEMI FINAL 2', q1:'QUALIFIER 1', q2:'QUALIFIER 2', elim:'ELIMINATOR', qf1:'QUARTER FINAL 1', qf2:'QUARTER FINAL 2', qf3:'QUARTER FINAL 3', qf4:'QUARTER FINAL 4', final:'FINAL' }[f.stage] || f.stage.toUpperCase()}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ fontSize:15, fontWeight:800, color: f.winner===f.team1?'#f0f0f0':'#666' }}>{f.team1}</div>
            <div style={{ fontSize:11, color:'#ff4444', fontWeight:800 }}>VS</div>
            <div style={{ fontSize:15, fontWeight:800, color: f.winner===f.team2?'#f0f0f0':'#666', textAlign:'right' }}>{f.team2}</div>
          </div>
          {f.team1Score && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#888', marginBottom:6 }}>
              <span style={{ color: f.winner===f.team1?'#fff':'#888', fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700 }}>{f.team1Score}</span>
              <span style={{ color: f.winner===f.team2?'#fff':'#888', fontFamily:'Rajdhani,sans-serif', fontSize:15, fontWeight:700 }}>{f.team2Score}</span>
            </div>
          )}
          <div style={{ fontSize:12, color:'#facc15', fontWeight:700 }}>🏆 {f.result}</div>
          {f.date && <div style={{ fontSize:11, color:'#444', marginTop:4 }}>{f.date} {f.time}</div>}
        </Card>
      ))}
    </div>
  )
}

// ── PLAYOFFS TAB ──────────────────────────────────────────────────────────────

// Format definitions — stages in order, with metadata
const PLAYOFF_FORMATS = {
  simple: {
    label: 'Simple Format',
    desc:  'SF1 → SF2 → Final',
    icon:  '⚡',
    teamsNeeded: 4,
    stages: [
      { key:'sf1',   label:'Semi Final 1',  short:'SF 1',  color:'#c084fc', matchup:'1st vs 4th',  desc:'Top team vs 4th place' },
      { key:'sf2',   label:'Semi Final 2',  short:'SF 2',  color:'#c084fc', matchup:'2nd vs 3rd',  desc:'2nd team vs 3rd place' },
      { key:'final', label:'Final',          short:'FINAL', color:'#facc15', matchup:'SF1W vs SF2W', desc:'SF1 winner vs SF2 winner' },
    ],
  },
  ipl: {
    label: 'IPL Format',
    desc:  'Q1 → Elim → Q2 → Final',
    icon:  '🏆',
    teamsNeeded: 4,
    stages: [
      { key:'q1',    label:'Qualifier 1',   short:'Q1',    color:'#60a5fa', matchup:'1st vs 2nd',  desc:'Top 2 — winner goes straight to Final' },
      { key:'elim',  label:'Eliminator',    short:'ELIM',  color:'#fb923c', matchup:'3rd vs 4th',  desc:'Loser is eliminated' },
      { key:'q2',    label:'Qualifier 2',   short:'Q2',    color:'#4ade80', matchup:'Q1L vs ElimW', desc:'Q1 loser vs Eliminator winner' },
      { key:'final', label:'Final',          short:'FINAL', color:'#facc15', matchup:'Q1W vs Q2W',  desc:'Q1 winner vs Q2 winner' },
    ],
  },
  top2: {
    label: 'Top 2 Final',
    desc:  'Direct Final (2 teams)',
    icon:  '🎯',
    teamsNeeded: 2,
    stages: [
      { key:'final', label:'Final', short:'FINAL', color:'#facc15', matchup:'1st vs 2nd', desc:'Top 2 teams play the Final' },
    ],
  },
  cup: {
    label: 'Cup Format',
    desc:  'QF1/QF2/QF3/QF4 → SF1/SF2 → Final',
    icon:  '🥇',
    teamsNeeded: 8,
    stages: [
      { key:'qf1',   label:'Quarter Final 1', short:'QF1',   color:'#38bdf8', matchup:'1st vs 8th',  desc:'' },
      { key:'qf2',   label:'Quarter Final 2', short:'QF2',   color:'#38bdf8', matchup:'2nd vs 7th',  desc:'' },
      { key:'qf3',   label:'Quarter Final 3', short:'QF3',   color:'#38bdf8', matchup:'3rd vs 6th',  desc:'' },
      { key:'qf4',   label:'Quarter Final 4', short:'QF4',   color:'#38bdf8', matchup:'4th vs 5th',  desc:'' },
      { key:'sf1',   label:'Semi Final 1',    short:'SF1',   color:'#c084fc', matchup:'QF1W vs QF2W', desc:'' },
      { key:'sf2',   label:'Semi Final 2',    short:'SF2',   color:'#c084fc', matchup:'QF3W vs QF4W', desc:'' },
      { key:'final', label:'Final',            short:'FINAL', color:'#facc15', matchup:'SF1W vs SF2W', desc:'' },
    ],
  },
}

// Default teams per stage for each format
const FORMAT_TEAMS = {
  simple: { sf1:['1st','4th'],    sf2:['2nd','3rd'],    final:['SF1W','SF2W'] },
  ipl:    { q1:['1st','2nd'],     elim:['3rd','4th'],   q2:['Q1L','ElimW'],    final:['Q1W','Q2W'] },
  top2:   { final:['1st','2nd'] },
  cup:    { qf1:['1st','8th'], qf2:['2nd','7th'], qf3:['3rd','6th'], qf4:['4th','5th'], sf1:['QF1W','QF2W'], sf2:['QF3W','QF4W'], final:['SF1W','SF2W'] },
}

function PlayoffsTab({ t, refresh, navigate }) {
  const table   = computePoints(t.teams, t.fixtures)
  const playoffFixtures = t.fixtures.filter(f => f.stage !== 'league')

  // detect current format from existing fixtures
  const detectFormat = () => {
    const stages = new Set(playoffFixtures.map(f => f.stage))
    if (stages.has('q1') || stages.has('elim')) return 'ipl'
    if (stages.has('qf1') || stages.has('qf2')) return 'cup'
    if (stages.has('sf1') || stages.has('sf2')) return 'simple'
    if (stages.has('final') && playoffFixtures.length === 1) return 'top2'
    return null
  }

  const [formatPicker, setFormatPicker] = useState(false)
  const [editingFixture, setEditingFixture] = useState(null) // fixture being edited (teams/date)
  const [editForm, setEditForm]             = useState({})
  const [startModal, setStartModal]         = useState(null)
  const [tossForm, setTossForm]             = useState({ tossWinner:'', battingFirst:'' })
  const currentFormat = detectFormat()
  const formatDef = currentFormat ? PLAYOFF_FORMATS[currentFormat] : null

  // ── Generate playoffs with chosen format ──
  const generatePlayoffs = async (formatKey) => {
    const fmt    = PLAYOFF_FORMATS[formatKey]
    const fmtTeams = FORMAT_TEAMS[formatKey]
    const ranked = table.map(r => r.name)

    const fixtures = fmt.stages.map(s => {
      const [t1key, t2key] = fmtTeams[s.key] || ['TBD', 'TBD']
      const resolveTeam = key => {
        const ordinals = { '1st':0,'2nd':1,'3rd':2,'4th':3,'5th':4,'6th':5,'7th':6,'8th':7 }
        if (ordinals[key] !== undefined) return ranked[ordinals[key]] || `TBD (${key})`
        return `TBD (${key})`
      }
      return { team1: resolveTeam(t1key), team2: resolveTeam(t2key), stage: s.key, status:'scheduled', date:'', time:'', venue:'' }
    })

    try {
      await axios.post(`${API}/${t._id}/generate-playoffs`, { format: formatKey, fixtures }, { headers:headers() })
      refresh()
      setFormatPicker(false)
    } catch(e) { alert(e.response?.data?.message || 'Failed') }
  }

  // ── Start match ──
  const startMatch = async () => {
    if (!tossForm.battingFirst) return
    try {
      const { data } = await axios.post(`${API}/${t._id}/fixtures/${startModal._id}/start`, tossForm, { headers:headers() })
      setStartModal(null)
      navigate(`/scoring/${data.match._id}`)
    } catch(e) { alert('Failed to start') }
  }

  const syncResult = async (fid) => {
    await axios.post(`${API}/${t._id}/fixtures/${fid}/sync`, {}, { headers:headers() })
    refresh()
  }

  // ── Save fixture edit (teams + schedule) ──
  const saveFixtureEdit = async () => {
    await axios.patch(`${API}/${t._id}/fixtures/${editingFixture._id}`, editForm, { headers:headers() })
    refresh(); setEditingFixture(null); setEditForm({})
  }

  // ── Reusable toss modal ──
  const TossModal = () => (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ width:'100%', maxWidth:360, background:'#1c1c1c', borderRadius:20, padding:'24px 20px', border:'1px solid rgba(255,68,68,0.3)' }}>
        <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', marginBottom:4 }}>
          {formatDef?.stages.find(s=>s.key===startModal?.stage)?.label || 'Match'}
        </div>
        <div style={{ fontSize:13, color:'#666', marginBottom:20 }}>{startModal?.team1} vs {startModal?.team2}</div>

        <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>TOSS WON BY</div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[startModal?.team1, startModal?.team2].map(tm => (
            <button key={tm} onClick={()=>setTossForm(f=>({...f,tossWinner:tm,battingFirst:''}))} style={{ flex:1, padding:'10px', borderRadius:10, background:tossForm.tossWinner===tm?'rgba(204,0,0,0.2)':'#1e1e1e', border:`2px solid ${tossForm.tossWinner===tm?'#ff4444':'#2a2a2a'}`, color:tossForm.tossWinner===tm?'#fff':'#666', fontWeight:700, fontSize:13, cursor:'pointer' }}>{tm}</button>
          ))}
        </div>
        {tossForm.tossWinner && (
          <>
            <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>BATTING FIRST</div>
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {[startModal?.team1, startModal?.team2].map(tm => (
                <button key={tm} onClick={()=>setTossForm(f=>({...f,battingFirst:tm}))} style={{ flex:1, padding:'10px', borderRadius:10, background:tossForm.battingFirst===tm?'rgba(74,222,128,0.15)':'#1e1e1e', border:`2px solid ${tossForm.battingFirst===tm?'#4ade80':'#2a2a2a'}`, color:tossForm.battingFirst===tm?'#4ade80':'#666', fontWeight:700, fontSize:13, cursor:'pointer' }}>{tm}</button>
              ))}
            </div>
          </>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setStartModal(null)} style={{ flex:1, padding:'12px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={startMatch} disabled={!tossForm.battingFirst} style={{ flex:2, padding:'12px', borderRadius:10, background:tossForm.battingFirst?'linear-gradient(135deg,#cc0000,#ff4444)':'#2a2a2a', border:'none', color:tossForm.battingFirst?'#fff':'#555', fontWeight:800, fontSize:13, cursor:tossForm.battingFirst?'pointer':'not-allowed' }}>🏏 Start Match</button>
        </div>
      </div>
    </div>
  )

  // ── Edit fixture modal ──
  const EditFixtureModal = () => (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ width:'100%', maxWidth:380, background:'#1c1c1c', borderRadius:20, padding:'24px 20px', border:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', marginBottom:20 }}>
          Edit — {formatDef?.stages.find(s=>s.key===editingFixture?.stage)?.label}
        </div>

        {/* Team selectors */}
        <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>TEAM 1</div>
        <select value={editForm.team1||''} onChange={e=>setEditForm(f=>({...f,team1:e.target.value}))}
          style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', marginBottom:12 }}>
          <option value="">-- Select team --</option>
          {t.teams.map(tm=><option key={tm._id} value={tm.name}>{tm.name}</option>)}
          <option value="TBD">TBD</option>
        </select>

        <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:8 }}>TEAM 2</div>
        <select value={editForm.team2||''} onChange={e=>setEditForm(f=>({...f,team2:e.target.value}))}
          style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', marginBottom:12 }}>
          <option value="">-- Select team --</option>
          {t.teams.map(tm=><option key={tm._id} value={tm.name}>{tm.name}</option>)}
          <option value="TBD">TBD</option>
        </select>

        {/* Schedule */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:6 }}>DATE</div>
            <input type="date" value={editForm.date||''} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))}
              style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:6 }}>TIME</div>
            <input type="time" value={editForm.time||''} onChange={e=>setEditForm(f=>({...f,time:e.target.value}))}
              style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}/>
          </div>
        </div>

        <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:6 }}>VENUE</div>
        <input value={editForm.venue||''} onChange={e=>setEditForm(f=>({...f,venue:e.target.value}))} placeholder="e.g. Wankhede Stadium"
          style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:20 }}/>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{setEditingFixture(null);setEditForm({})}} style={{ flex:1, padding:'12px', borderRadius:10, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={saveFixtureEdit} style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>Save Changes</button>
        </div>
      </div>
    </div>
  )

  // ── Single bracket card ──
  const BracketCard = ({ fixture, stageDef }) => {
    if (!fixture || !stageDef) return null
    const isFinal = stageDef.key === 'final'
    const isTBD   = fixture.team1?.startsWith('TBD') || fixture.team2?.startsWith('TBD')
    const borderColor = fixture.status==='live' ? 'rgba(74,222,128,0.3)' : isFinal ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)'

    return (
      <div style={{ marginBottom:10 }}>
        {/* stage label bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:3, height:20, borderRadius:2, background: stageDef.color }}/>
            <span style={{ fontSize:12, fontWeight:800, color: stageDef.color, letterSpacing:0.5 }}>{stageDef.label.toUpperCase()}</span>
            <span style={{ fontSize:10, color:'#444', fontWeight:700 }}>{stageDef.matchup}</span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {fixture.status==='live' && <span style={{ fontSize:10, color:'#4ade80', fontWeight:800 }}>● LIVE</span>}
            {fixture.status==='completed' && <span style={{ fontSize:10, color:'#555', fontWeight:800 }}>✓ DONE</span>}
            {/* edit button — always available unless live */}
            {fixture.status !== 'live' && (
              <button onClick={()=>{ setEditingFixture(fixture); setEditForm({ team1:fixture.team1, team2:fixture.team2, date:fixture.date||'', time:fixture.time||'', venue:fixture.venue||'' }) }}
                style={{ padding:'4px 10px', borderRadius:7, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#666', fontSize:11, fontWeight:700, cursor:'pointer' }}>✎ Edit</button>
            )}
          </div>
        </div>

        <div style={{ background:'#1a1a1a', border:`1px solid ${borderColor}`, borderRadius:13, overflow:'hidden' }}>
          {/* match header */}
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginBottom: (fixture.team1Score || fixture.status==='completed') ? 10 : 0 }}>
              {/* team 1 */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:'#111', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {t.teams.find(tm=>tm.name===fixture.team1)?.logoUrl
                      ? <img src={t.teams.find(tm=>tm.name===fixture.team1).logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span style={{ fontSize:12 }}>🏏</span>}
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color: fixture.winner===fixture.team1?'#fff': isTBD?'#555':'#ccc' }}>{fixture.team1}</span>
                  {fixture.winner===fixture.team1 && <span style={{ fontSize:14 }}>🏆</span>}
                </div>
                {fixture.team1Score && <div style={{ fontSize:13, color: fixture.winner===fixture.team1?'#f0f0f0':'#888', fontFamily:'Rajdhani,sans-serif', fontWeight:700, paddingLeft:35 }}>{fixture.team1Score}</div>}
              </div>

              {/* VS */}
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:'#ff4444', fontWeight:800, letterSpacing:1 }}>VS</div>
                {fixture.date && <div style={{ fontSize:9, color:'#444', marginTop:2, whiteSpace:'nowrap' }}>{fixture.date}</div>}
                {fixture.time && <div style={{ fontSize:9, color:'#444' }}>{fixture.time}</div>}
              </div>

              {/* team 2 */}
              <div style={{ textAlign:'right' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:7, marginBottom:2 }}>
                  {fixture.winner===fixture.team2 && <span style={{ fontSize:14 }}>🏆</span>}
                  <span style={{ fontSize:14, fontWeight:800, color: fixture.winner===fixture.team2?'#fff': isTBD?'#555':'#ccc' }}>{fixture.team2}</span>
                  <div style={{ width:28, height:28, borderRadius:7, background:'#111', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {t.teams.find(tm=>tm.name===fixture.team2)?.logoUrl
                      ? <img src={t.teams.find(tm=>tm.name===fixture.team2).logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span style={{ fontSize:12 }}>🏏</span>}
                  </div>
                </div>
                {fixture.team2Score && <div style={{ fontSize:13, color: fixture.winner===fixture.team2?'#f0f0f0':'#888', fontFamily:'Rajdhani,sans-serif', fontWeight:700, paddingRight:35 }}>{fixture.team2Score}</div>}
              </div>
            </div>

            {fixture.status==='completed' && fixture.result && (
              <div style={{ fontSize:12, color:'#facc15', fontWeight:700, textAlign:'center', paddingTop:4, borderTop:'1px solid rgba(255,255,255,0.05)' }}>🏆 {fixture.result}</div>
            )}
            {fixture.venue && (
              <div style={{ fontSize:11, color:'#444', marginTop:6 }}>📍 {fixture.venue}</div>
            )}

            {/* action buttons */}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              {fixture.status==='scheduled' && !isTBD && (
                <button onClick={()=>{ setStartModal(fixture); setTossForm({tossWinner:'',battingFirst:''}) }}
                  style={{ flex:1, padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#cc0000,#ff4444)', border:'none', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  ▶ Start Match
                </button>
              )}
              {fixture.status==='scheduled' && isTBD && (
                <div style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)', color:'#444', fontWeight:700, fontSize:12, textAlign:'center' }}>
                  Awaiting teams — tap ✎ Edit to assign
                </div>
              )}
              {fixture.status==='live' && fixture.matchId && (
                <>
                  <button onClick={()=>navigate(`/scoring/${fixture.matchId}`)}
                    style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.3)', color:'#4ade80', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                    🏏 Continue Scoring
                  </button>
                  <button onClick={()=>syncResult(fixture._id)}
                    style={{ padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#777', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    ↻ Sync
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Format picker modal ──
  const FormatPickerModal = () => (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000 }}>
      <div style={{ width:'100%', maxWidth:500, background:'#161616', borderRadius:'20px 20px 0 0', padding:'20px 16px 36px', border:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#333', margin:'0 auto 20px' }}/>
        <div style={{ fontSize:16, fontWeight:800, color:'#f0f0f0', marginBottom:4 }}>Choose Playoff Format</div>
        <div style={{ fontSize:12, color:'#555', marginBottom:20 }}>This will replace any existing playoff fixtures</div>

        {Object.entries(PLAYOFF_FORMATS).map(([key, fmt]) => {
          const isCurrent = key === currentFormat
          const canUse    = t.teams.length >= fmt.teamsNeeded
          return (
            <button key={key} onClick={() => canUse && generatePlayoffs(key)} disabled={!canUse}
              style={{ width:'100%', marginBottom:10, padding:'14px 16px', borderRadius:14, textAlign:'left', cursor: canUse?'pointer':'not-allowed', border:`2px solid ${isCurrent?'#ff4444':'rgba(255,255,255,0.07)'}`, background: isCurrent?'rgba(204,0,0,0.1)':'#1a1a1a', opacity: canUse?1:0.4, transition:'all 0.15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>{fmt.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color: isCurrent?'#ff4444':'#f0f0f0' }}>{fmt.label}</div>
                    <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{fmt.desc}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'#444', fontWeight:700 }}>{fmt.teamsNeeded} teams</div>
                  {isCurrent && <div style={{ fontSize:10, color:'#ff4444', fontWeight:800, marginTop:2 }}>ACTIVE</div>}
                </div>
              </div>
              {/* stage pills */}
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {fmt.stages.map(s => (
                  <span key={s.key} style={{ fontSize:10, fontWeight:800, color: s.color, background: s.color+'18', padding:'3px 8px', borderRadius:6 }}>{s.short}</span>
                ))}
              </div>
            </button>
          )
        })}

        <button onClick={()=>setFormatPicker(false)} style={{ width:'100%', padding:'13px', marginTop:4, borderRadius:12, background:'#1e1e1e', border:'1px solid #2a2a2a', color:'#666', fontWeight:800, fontSize:14, cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  // ── Main render ──
  return (
    <div style={{ padding:'12px 12px 0' }}>
      {startModal    && <TossModal />}
      {editingFixture && <EditFixtureModal />}
      {formatPicker  && <FormatPickerModal />}

      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          {formatDef ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>{formatDef.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:'#f0f0f0' }}>{formatDef.label}</div>
                <div style={{ fontSize:11, color:'#555' }}>{formatDef.desc}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:14, color:'#555' }}>No playoff format set</div>
          )}
        </div>
        <button onClick={()=>setFormatPicker(true)}
          style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,68,68,0.1)', border:'1px solid rgba(255,68,68,0.25)', color:'#ff6666', fontWeight:800, fontSize:12, cursor:'pointer' }}>
          {currentFormat ? '⚙ Change Format' : '+ Set Format'}
        </button>
      </div>

      {/* Qualified teams strip */}
      {table.length > 0 && (
        <Card style={{ padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:'#555', fontWeight:800, letterSpacing:1, marginBottom:10 }}>
            STANDINGS — TOP {Math.min(formatDef?.teamsNeeded ?? 4, table.length)}
          </div>
          <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
            {table.slice(0, formatDef?.teamsNeeded ?? 4).map((row, i) => (
              <div key={row.name} style={{ flexShrink:0, textAlign:'center', width:64 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#111', overflow:'hidden', margin:'0 auto 6px', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${i===0?'#facc15':i===1?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.06)'}` }}>
                  {row.logoUrl ? <img src={row.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:16 }}>🏏</span>}
                </div>
                <div style={{ fontSize:11, color: i<2?'#f0f0f0':'#888', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:64 }}>{row.name}</div>
                <div style={{ fontSize:10, color: i===0?'#facc15':'#555', fontWeight:800 }}>#{i+1} • {row.pts}pts</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!currentFormat && (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏆</div>
          <div style={{ fontSize:14, color:'#555', fontWeight:700, marginBottom:6 }}>No playoff format selected</div>
          <div style={{ fontSize:12, color:'#444' }}>Tap "Set Format" above to choose IPL, Semi-Finals, or another format</div>
        </div>
      )}

      {/* Bracket — rendered in stage order */}
      {formatDef && formatDef.stages.map(stageDef => {
        const fixture = playoffFixtures.find(f => f.stage === stageDef.key)
        return <BracketCard key={stageDef.key} fixture={fixture} stageDef={stageDef} />
      })}
    </div>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function Tournaments({ mode: modeProp }) {
  const navigate   = useNavigate()
  const { id }     = useParams()                          // present when /tournaments/:id
  const [openId, setOpenId] = useState(id || null)

  // Support both prop-based mode (from App.jsx route) and query string mode
  const qMode = new URLSearchParams(window.location.search).get('mode')
  const [autoCreate, setAutoCreate] = useState(modeProp === 'new' || qMode === 'new')

  // Keep URL in sync
  const handleOpen = (tid) => {
    setOpenId(tid)
    navigate(`/tournaments/${tid}`, { replace: true })
  }

  const handleBack = () => {
    setOpenId(null)
    navigate('/tournaments', { replace: true })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:#0a0a0a; font-family:'Nunito',sans-serif; }
        select option { background:#1a1a1a; color:#fff; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
      `}</style>
      <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:500, minHeight:'100vh', background:'#111', display:'flex', flexDirection:'column' }}>
          {openId ? (
            <TournamentDetail id={openId} onBack={handleBack} />
          ) : (
            <>
              {/* header */}
              <div style={{ padding:'16px 16px 0', background:'#1a1a1a', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <button onClick={() => navigate('/')} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'#aaa', fontSize:16, cursor:'pointer', flexShrink:0 }}>←</button>
                  <div>
                    <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:22, fontWeight:700, color:'#ff4444', letterSpacing:1 }}>🏆 Tournaments</div>
                    <div style={{ fontSize:11, color:'#555', marginTop:1 }}>Create and manage local cricket tournaments</div>
                  </div>
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                <TournamentList onOpen={handleOpen} autoCreate={autoCreate} onAutoCreateDone={() => setAutoCreate(false)} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
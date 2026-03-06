import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const tok = () => localStorage.getItem('token')
const H   = () => ({ Authorization: `Bearer ${tok()}` })
const fmtOv = b => `${Math.floor(b / 6)}.${b % 6}`

// ── Build career stats from matches ──────────────────────────────────────────
function buildStats(matches) {
  const map = {}
  const ensure = name => {
    if (!name) return null
    if (!map[name]) map[name] = {
      name, matchIds: new Set(),
      runs:0, balls:0, fours:0, sixes:0, nineties:0,
      timesOut:0, highScore:0, highScoreNO:false,
      fifties:0, hundreds:0, ducks:0, notOuts:0,
      wkts:0, ballsBowled:0, runsConceded:0,
      wides:0, noBalls:0, fiveWickets:0, threeWickets:0,
      bestW:0, bestR:999,
      catches:0, stumpings:0, runOuts:0,
    }
    return map[name]
  }
  matches.forEach(m => {
    ;[m.innings1, m.innings2].forEach(inn => {
      if (!inn) return
      ;(inn.battingStats||[]).forEach(p => {
        if (!p.name) return
        const s = ensure(p.name)
        s.matchIds.add(m._id)
        const r = p.runs||0
        s.runs  += r
        s.balls += p.balls||0
        s.fours += p.fours||0
        s.sixes += p.sixes||0
        if (r > s.highScore) { s.highScore = r; s.highScoreNO = !p.isOut }
        if (p.isOut) { s.timesOut++; if (r===0) s.ducks++ } else s.notOuts++
        if (r>=100) s.hundreds++
        else if (r>=90) s.nineties++
        else if (r>=50) s.fifties++
      })
      ;(inn.bowlingStats||[]).forEach(p => {
        if (!p.name) return
        const s = ensure(p.name)
        s.matchIds.add(m._id)
        const w=p.wickets||0, r=p.runs||0
        s.wkts        += w
        s.ballsBowled += p.balls||0
        s.runsConceded+= r
        s.wides       += p.wides||0
        s.noBalls     += p.noBalls||0
        if (w>=5) s.fiveWickets++
        if (w>=3) s.threeWickets++
        if (w>s.bestW||(w===s.bestW&&r<s.bestR&&w>0)){s.bestW=w;s.bestR=r}
      })
      ;(inn.ballByBall||[]).forEach(b => {
        if (!b.isWicket||!b.assistPlayer) return
        const s = ensure(b.assistPlayer)
        if (!s) return
        s.matchIds.add(m._id)
        if (b.wicketType==='Caught') s.catches++
        else if (b.wicketType==='Stumped') s.stumpings++
        else if (b.wicketType?.startsWith('RunOut')) s.runOuts++
      })
    })
  })
  return Object.values(map).map(s => {
    const batAvgN = s.timesOut>0 ? s.runs/s.timesOut : null
    const ecoN    = s.ballsBowled>0 ? s.runsConceded/(s.ballsBowled/6) : null
    const bAvgN   = s.wkts>0 ? s.runsConceded/s.wkts : null
    const bSRN    = s.wkts>0 ? s.ballsBowled/s.wkts : null
    const batSRN  = s.balls>0 ? s.runs/s.balls*100 : null
    return {
      ...s,
      matches:    s.matchIds.size,
      batAvg:     batAvgN!=null ? +batAvgN.toFixed(2) : null,
      batAvgD:    batAvgN!=null ? batAvgN.toFixed(2) : s.runs>0?`${s.runs}*`:'—',
      batSR:      batSRN!=null  ? +batSRN.toFixed(2)  : null,
      batSRD:     batSRN!=null  ? batSRN.toFixed(2)   : '—',
      eco:        ecoN!=null    ? +ecoN.toFixed(2)     : null,
      ecoD:       ecoN!=null    ? ecoN.toFixed(2)      : '—',
      bowlAvg:    bAvgN!=null   ? +bAvgN.toFixed(2)    : null,
      bowlAvgD:   bAvgN!=null   ? bAvgN.toFixed(2)     : '—',
      bowlSR:     bSRN!=null    ? +bSRN.toFixed(2)     : null,
      bowlSRD:    bSRN!=null    ? bSRN.toFixed(2)      : '—',
      bestFig:    s.bestW>0 ? `${s.bestW}/${s.bestR}` : '—',
      hsD:        s.highScore>0 ? `${s.highScore}${s.highScoreNO?'*':''}` : '0',
      overs:      fmtOv(s.ballsBowled),
      totalDis:   s.catches+s.stumpings+s.runOuts,
    }
  })
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const BG=['#7f1d1d','#1e3a5f','#064e3b','#78350f','#3b0764','#134e4a','#422006','#0c4a6e']
function Avatar({p,size=36}){
  const ini=(p.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const bg=BG[(p.name||'').charCodeAt(0)%BG.length]
  return(
    <div style={{width:size,height:size,borderRadius:'50%',flexShrink:0,overflow:'hidden',border:'2px solid #2a2a2a'}}>
      {p.photoUrl
        ?<img src={p.photoUrl} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        :<div style={{width:'100%',height:'100%',background:bg,display:'flex',alignItems:'center',
          justifyContent:'center',fontFamily:'Rajdhani,sans-serif',fontSize:size*0.36,fontWeight:700,color:'var(--text)'}}>{ini}</div>
      }
    </div>
  )
}

// ── Player Detail Sheet ───────────────────────────────────────────────────────
const SR2=({label,value,color='var(--text2)',hi=false})=>(
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
    padding:'9px 14px',borderBottom:'1px solid var(--border2)',
    background:hi?'rgba(255,68,68,0.05)':'transparent'}}>
    <span style={{fontSize:12,color:'var(--subtext)',fontWeight:700}}>{label}</span>
    <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:16,fontWeight:700,color}}>{value??'—'}</span>
  </div>
)
const SecH2=({children,color='var(--subtext)'})=>(
  <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color,padding:'12px 14px 5px',
    background:'var(--bg)',borderBottom:'1px solid var(--border2)',textTransform:'uppercase'}}>
    {children}
  </div>
)

function PlayerDetail({p,onClose}){
  const hasBat=p.balls>0||p.runs>0
  const hasBowl=p.ballsBowled>0||p.wkts>0
  const hasFld=p.totalDis>0
  return(
    <div style={{position:'fixed',inset:0,zIndex:5000,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div style={{position:'absolute',inset:0,background:'var(--overlay)'}} onClick={onClose}/>
      <div style={{position:'relative',background:'var(--bg)',borderRadius:'22px 22px 0 0',
        maxHeight:'92vh',overflowY:'auto',border:'1px solid var(--border)',
        boxShadow:'0 -12px 48px rgba(0,0,0,0.9)'}}>
        <div style={{width:36,height:4,background:'#2e2e2e',borderRadius:2,margin:'12px auto 0'}}/>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',
          display:'flex',gap:14,alignItems:'center',background:'linear-gradient(180deg,#1c1c1c,#141414)'}}>
          <Avatar p={p} size={58}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)'}}>{p.name}</div>
            <div style={{fontSize:12,color:'var(--subtext)',marginTop:2}}>{p.matches} {p.matches===1?'match':'matches'}</div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:8,background:'var(--border)',border:'none',color:'var(--subtext)',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderBottom:'1px solid var(--border2)'}}>
          {[{v:p.runs,l:'RUNS',c:'var(--accent)'},{v:p.wkts,l:'WICKETS',c:'#c084fc'},{v:p.totalDis,l:'DISMIS.',c:'#4ade80'}].map((s,i)=>(
            <div key={s.l} style={{padding:'12px 6px',textAlign:'center',borderRight:i<2?'1px solid var(--border2)':'none'}}>
              <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:26,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:9,color:'var(--muted)',fontWeight:800,letterSpacing:1,marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{paddingBottom:36}}>
          {hasBat&&<>
            <SecH2 color="#ff5555">🏏 Batting</SecH2>
            <SR2 label="Matches"        value={p.matches}/>
            <SR2 label="Runs"           value={p.runs}       color="#ff4444" hi/>
            <SR2 label="Highest Score"  value={p.hsD}        color="#ff6666"/>
            <SR2 label="Average"        value={p.batAvgD}    color="#60a5fa"/>
            <SR2 label="Strike Rate"    value={p.batSRD}     color="#facc15"/>
            <SR2 label="Balls Faced"    value={p.balls}/>
            <SR2 label="Fours (4s)"     value={p.fours}      color="#4ade80"/>
            <SR2 label="Sixes (6s)"     value={p.sixes}      color="#c084fc"/>
            <SR2 label="Centuries"      value={p.hundreds}   color="#facc15"/>
            <SR2 label="Nineties"       value={p.nineties}   color="#fde68a"/>
            <SR2 label="Half Centuries" value={p.fifties}    color="#fb923c"/>
            <SR2 label="Ducks"          value={p.ducks}      color="#f87171"/>
            <SR2 label="Not Outs"       value={p.notOuts}/>
          </>}
          {hasBowl&&<>
            <SecH2 color="#c084fc">🎳 Bowling</SecH2>
            <SR2 label="Wickets"        value={p.wkts}       color="#c084fc" hi/>
            <SR2 label="Best Figures"   value={p.bestFig}    color="#ff4444"/>
            <SR2 label="Economy"        value={p.ecoD}       color="#4ade80"/>
            <SR2 label="Average"        value={p.bowlAvgD}   color="#60a5fa"/>
            <SR2 label="Strike Rate"    value={p.bowlSRD}    color="#38bdf8"/>
            <SR2 label="Overs Bowled"   value={p.overs}/>
            <SR2 label="Runs Conceded"  value={p.runsConceded}/>
            <SR2 label="Wides"          value={p.wides}      color="#f87171"/>
            <SR2 label="No Balls"       value={p.noBalls}    color="#fb923c"/>
            <SR2 label="5-Wicket Hauls" value={p.fiveWickets} color="#ff4444"/>
            <SR2 label="3-Wicket Hauls" value={p.threeWickets} color="#f97316"/>
          </>}
          {hasFld&&<>
            <SecH2 color="#4ade80">🧤 Fielding</SecH2>
            <SR2 label="Total Dismissals"    value={p.totalDis}    color="#4ade80" hi/>
            <SR2 label="Catches"             value={p.catches}     color="#4ade80"/>
            <SR2 label="Stumpings"           value={p.stumpings}   color="#a78bfa"/>
            <SR2 label="Run Outs"            value={p.runOuts}     color="#fb923c"/>
          </>}
        </div>
      </div>
    </div>
  )
}

// ── Dropdown filter ───────────────────────────────────────────────────────────
function Dropdown({label,value,options,onChange}){
  const [open,setOpen]=useState(false)
  return(
    <div style={{position:'relative',flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        padding:'8px 12px',borderRadius:10,border:'1px solid var(--border)',
        background: value!=='all'?'rgba(255,68,68,0.12)':'var(--header)',
        color: value!=='all'?'var(--accent)':'var(--subtext)',
        cursor:'pointer',fontSize:12,fontWeight:800,
        display:'flex',flexDirection:'column',alignItems:'flex-start',gap:1,minWidth:70}}>
        <span style={{fontSize:9,color:'var(--subtext)',letterSpacing:1}}>{label}</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}>
          {value==='all'?'ALL':String(value).toUpperCase().slice(0,8)}
          <span style={{fontSize:10,color:'var(--subtext)'}}>▾</span>
        </span>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:100}} onClick={()=>setOpen(false)}/>
          <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:200,
            background:'var(--header)',border:'1px solid var(--border)',borderRadius:10,
            minWidth:130,boxShadow:'0 8px 24px rgba(0,0,0,0.6)',overflow:'hidden'}}>
            {options.map(opt=>(
              <button key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false)}}
                style={{width:'100%',padding:'10px 14px',border:'none',cursor:'pointer',
                  textAlign:'left',fontSize:12,fontWeight:700,
                  background: value===opt.value?'rgba(255,68,68,0.15)':'transparent',
                  color: value===opt.value?'var(--accent)':'var(--text2)',
                  borderBottom:'1px solid var(--border2)'}}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Record category list row ──────────────────────────────────────────────────
function CategoryRow({icon,label,onClick}){
  return(
    <div onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
      borderBottom:'1px solid var(--border2)',cursor:'pointer',
      transition:'background 0.12s'}}
      onMouseOver={e=>e.currentTarget.style.background='var(--header)'}
      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
      <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
      <span style={{flex:1,fontSize:14,fontWeight:700,color:'var(--text2)'}}>{label}</span>
      <span style={{fontSize:16,color:'var(--text2)'}}>›</span>
    </div>
  )
}

// ── Leaderboard view for a specific category ──────────────────────────────────
function CategoryLeaderboard({title,icon,players,valueKey,valueFn,valueLabel,asc=false,minFn,onTap,onBack}){
  const filtered = players
    .filter(p => {
      if (minFn && !minFn(p)) return false
      const v = valueFn ? valueFn(p) : p[valueKey]
      return v != null && v !== '—' && parseFloat(v) >= 0
    })
    .sort((a,b)=>{
      const va = parseFloat(valueFn ? valueFn(a) : a[valueKey]) || 0
      const vb = parseFloat(valueFn ? valueFn(b) : b[valueKey]) || 0
      return asc ? va-vb : vb-va
    })

  const medals=['🥇','🥈','🥉']

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column'}}>
      {/* sub-header */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',
        display:'flex',alignItems:'center',gap:10,background:'var(--header)',flexShrink:0}}>
        <button onClick={onBack} style={{width:30,height:30,borderRadius:8,background:'var(--border)',
          border:'none',color:'var(--text2)',fontSize:16,cursor:'pointer',flexShrink:0}}>←</button>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:18,fontWeight:700,color:'var(--text)'}}>
          {icon} {title}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',paddingBottom:60}}>
        {filtered.length===0?(
          <div style={{padding:'60px 20px',textAlign:'center',color:'var(--muted)'}}>
            <div style={{fontSize:36,marginBottom:10}}>📊</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--subtext)'}}>No data yet</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Play matches to see records here</div>
          </div>
        ):filtered.map((p,i)=>{
          const rawVal = valueFn ? valueFn(p) : p[valueKey]
          const numVal = parseFloat(rawVal)||0
          const maxVal = parseFloat(valueFn?valueFn(filtered[0]):filtered[0]?.[valueKey])||1
          const minVal = asc ? parseFloat(valueFn?valueFn(filtered[0]):filtered[0]?.[valueKey])||0 : 0
          const barW   = asc
            ? Math.round((1-(numVal-minVal)/(maxVal-minVal||1))*100)
            : Math.round((numVal/maxVal)*100)

          return(
            <div key={p.name} onClick={()=>onTap(p)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
                borderBottom:'1px solid var(--border2)',cursor:'pointer',
                background:i===0?'rgba(255,68,68,0.04)':i%2===0?'var(--card)':'var(--card)',
                transition:'background 0.1s'}}
              onMouseOver={e=>e.currentTarget.style.background='var(--card2)'}
              onMouseOut={e=>e.currentTarget.style.background=i===0?'rgba(255,68,68,0.04)':i%2===0?'var(--card)':'var(--card)'}>
              {/* rank */}
              <div style={{width:26,textAlign:'center',flexShrink:0,
                fontSize:i<3?16:12,fontWeight:800,color:i<3?'var(--text)':'var(--muted)'}}>
                {i<3?medals[i]:i+1}
              </div>
              <Avatar p={p} size={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:i===0?'var(--text)':'var(--text2)',
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:4}}>
                  {p.name}
                </div>
                {/* progress bar */}
                <div style={{height:3,background:'var(--muted)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${barW}%`,borderRadius:2,
                    background:i===0?'var(--accent)':'rgba(255,68,68,0.35)',transition:'width 0.4s'}}/>
                </div>
              </div>
              {/* value */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:60}}>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:i===0?22:17,
                  fontWeight:700,color:i===0?'var(--accent)':'var(--subtext)'}}>
                  {rawVal??'—'}
                </div>
                <div style={{fontSize:9,color:'var(--muted)',fontWeight:800,letterSpacing:0.5}}>{valueLabel}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Records(){
  const navigate=useNavigate()
  const [matches,  setMatches]  = useState([])
  const [photoMap, setPhotoMap] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)   // player detail
  const [category, setCategory] = useState(null)   // active leaderboard

  // filters
  const [yearF, setYearF]   = useState('all')
  const [teamF, setTeamF]   = useState('all')
  const [oppF,  setOppF]    = useState('all')

  useEffect(()=>{
    Promise.all([
      axios.get('/api/matches',{headers:H()}),
      axios.get('/api/players',{headers:H()}).catch(()=>({data:[]})),
    ]).then(([mr,pr])=>{
      setMatches(mr.data||[])
      const pm={}
      ;(pr.data||[]).forEach(p=>{pm[p.name]=p.photoUrl||''})
      setPhotoMap(pm)
    }).catch(console.error).finally(()=>setLoading(false))
  },[])

  // ── Derived filter options ──
  const years = useMemo(()=>{
    const ys=new Set()
    matches.forEach(m=>{ const y=new Date(m.createdAt).getFullYear(); if(!isNaN(y)) ys.add(y) })
    return [{value:'all',label:'All Years'},...Array.from(ys).sort((a,b)=>b-a).map(y=>({value:String(y),label:String(y)}))]
  },[matches])

  const teams = useMemo(()=>{
    const ts=new Set()
    matches.forEach(m=>{ if(m.team1) ts.add(m.team1); if(m.team2) ts.add(m.team2) })
    return [{value:'all',label:'All Teams'},...Array.from(ts).sort().map(t=>({value:t,label:t}))]
  },[matches])

  const opponents = useMemo(()=>{
    if(teamF==='all') return [{value:'all',label:'All Opponents'}]
    const ts=new Set()
    matches.forEach(m=>{
      if(m.team1===teamF) ts.add(m.team2)
      if(m.team2===teamF) ts.add(m.team1)
    })
    return [{value:'all',label:'All Opponents'},...Array.from(ts).sort().map(t=>({value:t,label:t}))]
  },[matches,teamF])

  // ── Apply filters ──
  const filteredMatches = useMemo(()=>{
    return matches.filter(m=>{
      if(yearF!=='all' && String(new Date(m.createdAt).getFullYear())!==yearF) return false
      if(teamF!=='all' && m.team1!==teamF && m.team2!==teamF) return false
      if(oppF!=='all'){
        const opp = m.team1===teamF ? m.team2 : m.team1
        if(opp!==oppF) return false
      }
      return true
    })
  },[matches,yearF,teamF,oppF])

  const stats = useMemo(()=>{
    const raw=buildStats(filteredMatches)
    return raw.map(s=>({...s,photoUrl:photoMap[s.name]||''}))
  },[filteredMatches,photoMap])

  const batPlayers   = stats.filter(p=>p.balls>0||p.runs>0)
  const bowlPlayers  = stats.filter(p=>p.ballsBowled>0||p.wkts>0)
  const fieldPlayers = stats.filter(p=>p.totalDis>0)

  const isFiltered = yearF!=='all'||teamF!=='all'||oppF!=='all'

  const totRuns  = stats.reduce((s,p)=>s+p.runs,0)
  const totWkts  = stats.reduce((s,p)=>s+p.wkts,0)
  const totSixes = stats.reduce((s,p)=>s+p.sixes,0)

  // ── Category definitions ──
  const BATTING_CATS = [
    { icon:'🏏', label:'Most Runs',              valueKey:'runs',      valueLabel:'RUNS',     players:batPlayers },
    { icon:'🎯', label:'Highest Scores',         valueFn:p=>p.highScore, valueLabel:'HS',     players:batPlayers },
    { icon:'📈', label:'Best Batting Average',   valueKey:'batAvg',    valueLabel:'AVG',      players:batPlayers.filter(p=>p.timesOut>0) },
    { icon:'⚡', label:'Best Batting Strike Rate',valueKey:'batSR',    valueLabel:'SR',       players:batPlayers.filter(p=>p.balls>=6) },
    { icon:'💯', label:'Most Hundreds',          valueKey:'hundreds',  valueLabel:'100s',     players:batPlayers },
    { icon:'🔸', label:'Most Nineties',          valueKey:'nineties',  valueLabel:'90s',      players:batPlayers },
    { icon:'5️⃣0️⃣',label:'Most Fifties',         valueKey:'fifties',   valueLabel:'50s',      players:batPlayers },
    { icon:'🟩', label:'Most Fours',             valueKey:'fours',     valueLabel:'4s',       players:batPlayers },
    { icon:'💥', label:'Most Sixes',             valueKey:'sixes',     valueLabel:'6s',       players:batPlayers },
  ]
  const BOWLING_CATS = [
    { icon:'🎳', label:'Most Wickets',           valueKey:'wkts',      valueLabel:'WKTS',     players:bowlPlayers },
    { icon:'📉', label:'Best Bowling Average',   valueKey:'bowlAvg',   valueLabel:'AVG',      players:bowlPlayers.filter(p=>p.wkts>=3), asc:true },
    { icon:'🏆', label:'Best Bowling Figures',   valueFn:p=>p.bestFig, valueLabel:'BEST',     players:bowlPlayers, sortKey:'bestW' },
    { icon:'🔥', label:'Most 5-Wicket Hauls',    valueKey:'fiveWickets',valueLabel:'5W',      players:bowlPlayers },
    { icon:'🔒', label:'Best Economy',           valueKey:'eco',       valueLabel:'ECO',      players:bowlPlayers.filter(p=>p.ballsBowled>=6), asc:true },
    { icon:'⏱', label:'Best Bowling Strike Rate',valueKey:'bowlSR',   valueLabel:'SR',       players:bowlPlayers.filter(p=>p.wkts>=3), asc:true },
  ]
  const FIELDING_CATS = [
    { icon:'🧤', label:'Most Dismissals',        valueKey:'totalDis',  valueLabel:'DIS',      players:fieldPlayers },
    { icon:'🙌', label:'Most Catches',           valueKey:'catches',   valueLabel:'CT',       players:fieldPlayers },
    { icon:'🥊', label:'Most Stumpings',         valueKey:'stumpings', valueLabel:'ST',       players:fieldPlayers },
    { icon:'🏃', label:'Most Run Outs',          valueKey:'runOuts',   valueLabel:'RO',       players:fieldPlayers },
  ]

  if(loading) return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'var(--muted)',fontFamily:'Nunito,sans-serif'}}>
        <div style={{fontSize:40,marginBottom:10}}>📊</div>
        <div style={{fontWeight:700}}>Loading records…</div>
      </div>
    </div>
  )

  // ── If a category is selected, show its leaderboard ──
  if(category){
    const allCats=[...BATTING_CATS,...BOWLING_CATS,...FIELDING_CATS]
    const cat=allCats.find(c=>c.label===category)
    if(cat) return(
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}html,body,#root{height:100%;background:var(--bg,#0a0a0a);font-family:'Nunito',sans-serif;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--scrollbar,#2a2a2a);border-radius:2px;}`}</style>
        <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',justifyContent:'center'}}>
          <div style={{width:'100%',maxWidth:500,minHeight:'100vh',background:'var(--surface)',display:'flex',flexDirection:'column'}}>
            {/* filter strip inside category view */}
            <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'10px 12px',flexShrink:0}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:800,letterSpacing:1,marginBottom:8}}>APPLIED FILTERS</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Dropdown label="YEAR"  value={yearF} options={years}     onChange={v=>{setYearF(v)}}/>
                <Dropdown label="TEAM"  value={teamF} options={teams}     onChange={v=>{setTeamF(v);setOppF('all')}}/>
                <Dropdown label="OPPN"  value={oppF}  options={opponents} onChange={v=>setOppF(v)}/>
                {isFiltered&&<button onClick={()=>{setYearF('all');setTeamF('all');setOppF('all')}}
                  style={{padding:'8px 12px',borderRadius:10,border:'none',cursor:'pointer',
                    fontSize:11,fontWeight:800,background:'rgba(255,68,68,0.1)',color:'var(--accent)',alignSelf:'flex-end'}}>
                  ✕ Reset
                </button>}
              </div>
            </div>
            <CategoryLeaderboard
              title={cat.label} icon={cat.icon}
              players={cat.players}
              valueKey={cat.sortKey||cat.valueKey}
              valueFn={cat.valueFn}
              valueLabel={cat.valueLabel}
              asc={cat.asc||false}
              onTap={setSelected}
              onBack={()=>setCategory(null)}
            />
          </div>
        </div>
        {selected&&<PlayerDetail p={selected} onClose={()=>setSelected(null)}/>}
      </>
    )
  }

  return(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}html,body,#root{height:100%;background:var(--bg,#0a0a0a);font-family:'Nunito',sans-serif;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--scrollbar,#2a2a2a);border-radius:2px;}`}</style>

      <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',justifyContent:'center'}}>
        <div style={{width:'100%',maxWidth:500,minHeight:'100vh',background:'var(--surface)',display:'flex',flexDirection:'column'}}>

          {/* ── HEADER ── */}
          <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
            <div style={{padding:'14px 16px 10px',display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>navigate('/')} style={{width:34,height:34,borderRadius:9,
                background:'var(--border)',border:'1px solid var(--border)',
                color:'var(--text2)',fontSize:16,cursor:'pointer',flexShrink:0}}>←</button>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)',letterSpacing:1}}>
                  📊 Records
                </div>
                <div style={{fontSize:11,color:'var(--subtext)',fontWeight:600,marginTop:1}}>
                  {filteredMatches.length} matches · {stats.length} players
                  {isFiltered&&<span style={{color:'var(--accent)'}}> · filtered</span>}
                </div>
              </div>
            </div>

            {/* ── FILTER DROPDOWNS ── */}
            <div style={{padding:'0 12px 12px',borderTop:'1px solid var(--border2)'}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:800,letterSpacing:1,padding:'10px 0 8px'}}>APPLIED FILTERS</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Dropdown label="YEAR"  value={yearF} options={years}     onChange={v=>{setYearF(v)}}/>
                <Dropdown label="TEAM"  value={teamF} options={teams}     onChange={v=>{setTeamF(v);setOppF('all')}}/>
                <Dropdown label="OPPN"  value={oppF}  options={opponents} onChange={v=>setOppF(v)}/>
                {isFiltered&&<button onClick={()=>{setYearF('all');setTeamF('all');setOppF('all')}}
                  style={{padding:'8px 12px',borderRadius:10,border:'none',cursor:'pointer',
                    fontSize:11,fontWeight:800,background:'rgba(255,68,68,0.1)',color:'var(--accent)'}}>
                  ✕ Reset
                </button>}
              </div>
            </div>

            {/* summary strip */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderTop:'1px solid var(--border2)'}}>
              {[{l:'TOTAL RUNS',v:totRuns,c:'var(--accent)'},{l:'WICKETS',v:totWkts,c:'#c084fc'},{l:'SIXES',v:totSixes,c:'#facc15'}].map((s,i)=>(
                <div key={s.l} style={{padding:'9px 4px',textAlign:'center',borderRight:i<2?'1px solid var(--border2)':'none'}}>
                  <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:20,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:8,color:'var(--muted)',fontWeight:800,letterSpacing:0.8,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CATEGORY LIST ── */}
          <div style={{flex:1,overflowY:'auto',paddingBottom:60}}>

            {/* BATTING */}
            <div style={{padding:'14px 16px 6px',background:'var(--header)',
              borderBottom:'1px solid var(--border2)',
              fontSize:11,fontWeight:800,color:'var(--subtext)',letterSpacing:2}}>
              🏏 BATTING
            </div>
            {BATTING_CATS.map(cat=>(
              <CategoryRow key={cat.label} icon={cat.icon} label={cat.label} onClick={()=>setCategory(cat.label)}/>
            ))}

            {/* BOWLING */}
            <div style={{padding:'14px 16px 6px',background:'var(--header)',
              borderBottom:'1px solid var(--border2)',marginTop:8,
              fontSize:11,fontWeight:800,color:'var(--subtext)',letterSpacing:2}}>
              🎳 BOWLING
            </div>
            {BOWLING_CATS.map(cat=>(
              <CategoryRow key={cat.label} icon={cat.icon} label={cat.label} onClick={()=>setCategory(cat.label)}/>
            ))}

            {/* FIELDING */}
            <div style={{padding:'14px 16px 6px',background:'var(--header)',
              borderBottom:'1px solid var(--border2)',marginTop:8,
              fontSize:11,fontWeight:800,color:'var(--subtext)',letterSpacing:2}}>
              🧤 FIELDING
            </div>
            {FIELDING_CATS.map(cat=>(
              <CategoryRow key={cat.label} icon={cat.icon} label={cat.label} onClick={()=>setCategory(cat.label)}/>
            ))}

          </div>
        </div>
      </div>

      {selected&&<PlayerDetail p={selected} onClose={()=>setSelected(null)}/>}
    </>
  )
}
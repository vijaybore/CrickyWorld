import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

// ─── Theme — matches CrickyWorld app palette ──────────────────────────────────
const T = {
  bg:          '#0b0f1a',
  surface:     '#111827',
  card:        '#151e2e',
  cardHover:   '#1a2540',
  border:      '#1f2d42',
  border2:     '#162032',
  accent:      '#10b981',   // emerald green
  accentDim:   '#064e3b',
  accentGlow:  '#10b98130',
  gold:        '#f59e0b',
  goldDim:     '#78350f',
  red:         '#ef4444',
  redDim:      '#7f1d1d',
  orange:      '#fb923c',
  orangeDim:   '#431407',
  blue:        '#3b82f6',
  sky:         '#38bdf8',
  purple:      '#c084fc',
  purpleDim:   '#3b0764',
  text:        '#f1f5f9',
  text2:       '#cbd5e1',
  subtext:     '#94a3b8',
  muted:       '#475569',
  faint:       '#1e293b',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtOvers  = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`
const calcCRR   = (runs, balls) => balls === 0 ? '0.0' : (runs / (balls / 6)).toFixed(1)
const calcRRR   = (target, runs, balls, totalOvers) => {
  const rem = totalOvers * 6 - balls
  return rem <= 0 ? '—' : ((target - runs) / (rem / 6)).toFixed(1)
}

// ─── BallDot ─────────────────────────────────────────────────────────────────
function BallDot({ ball, size = 32 }) {
  let bg = T.faint, color = T.muted, text = (ball.runs ?? 0).toString()
  if (ball.isWicket)        { bg = T.redDim;    color = T.red;    text = 'W' }
  else if (ball.isWide)     { bg = '#1e3a5f';   color = T.sky;    text = ball.runs > 1 ? `+${ball.runs}` : 'Wd' }
  else if (ball.isNoBall)   { bg = T.orangeDim; color = T.orange; text = ball.runs > 0 ? `+${ball.runs}` : 'NB' }
  else if (ball.runs === 4) { bg = T.accentDim; color = T.accent; text = '4' }
  else if (ball.runs === 6) { bg = T.purpleDim; color = T.purple; text = '6' }
  else if (ball.runs === 0) { bg = T.border2;   color = T.muted;  text = '·' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: bg, color, fontSize: size < 30 ? 10 : 11, fontWeight: 800,
      border: `1px solid ${color}33`, flexShrink: 0,
    }}>{text}</span>
  )
}

// ─── PlayerProfileModal ───────────────────────────────────────────────────────
function PlayerProfileModal({ open, onClose, playerName, match, allPlayersData = [] }) {
  if (!open || !playerName) return null

  // Gather this-match stats from both innings
  const getMatchBatStats = () => {
    const stats = []
    ;['innings1', 'innings2'].forEach(key => {
      const inn = match[key]
      if (!inn?.battingStats) return
      const s = inn.battingStats.find(p => p.name === playerName)
      if (s) stats.push({ ...s, inningsKey: key, team: inn.battingTeam })
    })
    return stats
  }
  const getMatchBowlStats = () => {
    const stats = []
    ;['innings1', 'innings2'].forEach(key => {
      const inn = match[key]
      if (!inn?.bowlingStats) return
      const s = inn.bowlingStats.find(p => p.name === playerName)
      if (s) stats.push({ ...s, inningsKey: key, team: inn.battingTeam })
    })
    return stats
  }

  const batStats  = getMatchBatStats()
  const bowlStats = getMatchBowlStats()

  // Career stats from global player registry
  const careerData = allPlayersData.find(p => p.name === playerName)

  // Aggregate this-match totals
  const matchRuns   = batStats.reduce((s, p) => s + (p.runs || 0), 0)
  const matchBalls  = batStats.reduce((s, p) => s + (p.balls || 0), 0)
  const matchFours  = batStats.reduce((s, p) => s + (p.fours || 0), 0)
  const matchSixes  = batStats.reduce((s, p) => s + (p.sixes || 0), 0)
  const matchWkts   = bowlStats.reduce((s, p) => s + (p.wickets || 0), 0)
  const matchBowlB  = bowlStats.reduce((s, p) => s + (p.balls || 0), 0)
  const matchBowlR  = bowlStats.reduce((s, p) => s + (p.runs || 0), 0)

  const matchSR     = matchBalls > 0 ? (matchRuns / matchBalls * 100).toFixed(1) : '—'
  const matchEco    = matchBowlB > 0 ? (matchBowlR / (matchBowlB / 6)).toFixed(2) : '—'

  // Initials avatar
  const initials = playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const hue = (playerName.charCodeAt(0) * 37 + (playerName.charCodeAt(1) || 0) * 13) % 360
  const avatarBg = `hsl(${hue}, 65%, 22%)`
  const avatarBorder = `hsl(${hue}, 65%, 45%)`

  const isBatter = batStats.length > 0
  const isBowler = bowlStats.length > 0

  const Stat = ({ label, value, sub, accent }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center', flex: 1, minWidth: 70 }}>
      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: accent || T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.subtext, marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
    </div>
  )

  const SectionLabel = ({ title, color = T.subtext }) => (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color, marginBottom: 8, marginTop: 18 }}>{title}</div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500, background: T.surface,
          borderRadius: '22px 22px 0 0', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${T.border}`, borderBottom: 'none',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: T.muted, borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 16px 40px' }}>

          {/* ── HERO ── */}
          <div style={{
            background: `linear-gradient(135deg, ${avatarBg}, #1a1a1a)`,
            border: `1px solid ${avatarBorder}44`,
            borderRadius: 18, padding: '20px 20px 18px',
            marginBottom: 4, position: 'relative', overflow: 'hidden',
          }}>
            {/* subtle pattern */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '8px 8px', borderRadius: 18 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
              {/* Avatar */}
              <div style={{
                width: 68, height: 68, borderRadius: 18,
                background: avatarBg, border: `2.5px solid ${avatarBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: `0 4px 20px ${avatarBorder}55`,
              }}>
                <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: avatarBorder }}>{initials}</span>
              </div>
              {/* Name + badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: 0.5, lineHeight: 1.1 }}>{playerName}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {isBatter && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 20, background: 'rgba(74,222,128,0.15)', color: T.accent, border: '1px solid rgba(74,222,128,0.3)' }}>🏏 BATTER</span>
                  )}
                  {isBowler && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 20, background: 'rgba(251,146,60,0.15)', color: T.orange, border: '1px solid rgba(251,146,60,0.3)' }}>⚡ BOWLER</span>
                  )}
                  {careerData && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 20, background: 'rgba(250,204,21,0.12)', color: T.gold, border: '1px solid rgba(250,204,21,0.25)' }}>⭐ {careerData.totalMatches}M</span>
                  )}
                </div>
              </div>
              {/* Close */}
              <button onClick={onClose} style={{ position: 'absolute', top: -4, right: -4, width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: `1px solid ${T.border}`, color: T.text2, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>

          {/* ── THIS MATCH ── */}
          {(isBatter || isBowler) && (
            <>
              <SectionLabel title="THIS MATCH" color={T.red} />

              {/* Batting this match */}
              {isBatter && (
                <>
                  <div style={{ fontSize: 10, color: T.accent, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>BATTING</div>
                  {batStats.map((s, i) => {
                    const sr = s.balls > 0 ? (s.runs / s.balls * 100).toFixed(1) : '0.0'
                    const innLabel = s.inningsKey === 'innings1' ? '1st Inn' : '2nd Inn'
                    return (
                      <div key={i} style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 14, padding: '14px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: T.subtext, fontWeight: 700 }}>{innLabel} · {s.team}</span>
                          {!s.isOut && <span style={{ fontSize: 9, color: T.accent, fontWeight: 800, background: 'rgba(74,222,128,0.12)', padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>NOT OUT</span>}
                          {s.isOut && <span style={{ fontSize: 9, color: T.red, fontWeight: 800, background: 'rgba(255,107,107,0.1)', padding: '2px 7px', borderRadius: 4 }}>OUT</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Stat label="RUNS" value={s.runs} accent={T.gold} />
                          <Stat label="BALLS" value={s.balls} />
                          <Stat label="SR" value={sr} />
                          <Stat label="4s" value={s.fours || 0} accent={T.accent} />
                          <Stat label="6s" value={s.sixes || 0} accent={T.purple} />
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Bowling this match */}
              {isBowler && (
                <>
                  <div style={{ fontSize: 10, color: T.orange, fontWeight: 800, letterSpacing: 1, marginBottom: 6, marginTop: isBatter ? 12 : 0 }}>BOWLING</div>
                  {bowlStats.map((s, i) => {
                    const eco = s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(2) : '0.00'
                    const innLabel = s.inningsKey === 'innings1' ? '1st Inn' : '2nd Inn'
                    return (
                      <div key={i} style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 14, padding: '14px 14px', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: T.subtext, fontWeight: 700, marginBottom: 10 }}>{innLabel} · {s.team}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Stat label="OVERS" value={fmtOvers(s.balls || 0)} />
                          <Stat label="RUNS" value={s.runs} />
                          <Stat label="WKTS" value={s.wickets} accent={T.red} />
                          <Stat label="ECO" value={eco} accent={T.sky} />
                          <Stat label="Wd" value={s.wides || 0} />
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}

          {/* ── CAREER STATS ── */}
          {careerData && (
            <>
              <SectionLabel title="CAREER STATS" color={T.gold} />
              <div style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.06), rgba(250,204,21,0.02))', border: '1px solid rgba(250,204,21,0.15)', borderRadius: 16, padding: '16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'Matches', value: careerData.totalMatches || 0 },
                    { label: 'Runs', value: careerData.totalRuns || 0, accent: T.gold },
                    { label: 'Wickets', value: careerData.totalWickets || 0, accent: T.red },
                  ].map(({ label, value, accent }) => (
                    <div key={label} style={{ background: T.surface, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${T.border2}` }}>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: accent || T.text, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Highest', value: careerData.highestScore || 0, accent: T.accent },
                    { label: 'Balls Faced', value: careerData.totalBallsFaced || 0 },
                    { label: 'Balls Bowled', value: careerData.totalBallsBowled || 0 },
                  ].map(({ label, value, accent }) => (
                    <div key={label} style={{ background: T.surface, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${T.border2}` }}>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: accent || T.text2, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {careerData.totalBallsFaced > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, background: T.surface, borderRadius: 12, padding: '10px', textAlign: 'center', border: `1px solid ${T.border2}` }}>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: T.sky }}>
                        {(careerData.totalRuns / careerData.totalBallsFaced * 100).toFixed(1)}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>Career SR</div>
                    </div>
                    {careerData.totalBallsBowled > 0 && (
                      <div style={{ flex: 1, background: T.surface, borderRadius: 12, padding: '10px', textAlign: 'center', border: `1px solid ${T.border2}` }}>
                        <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: T.orange }}>
                          {(careerData.totalRuns / (careerData.totalBallsBowled / 6)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>Career ECO</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* If no data at all */}
          {!isBatter && !isBowler && !careerData && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏏</div>
              No stats recorded yet for this player.
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── PlayerPickerSheet ────────────────────────────────────────────────────────
// Bottom-sheet that shows known players + free-type for new ones
function PlayerPickerSheet({ open, onClose, onSelect, title, accentColor = T.sky, knownPlayers = [] }) {
  const [query, setQuery]  = useState('')
  const inputRef           = useRef(null)

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80) }
  }, [open])

  if (!open) return null

  const filtered = knownPlayers.filter(n => n.toLowerCase().includes(query.toLowerCase()))
  const canAddNew = query.trim() && !knownPlayers.some(n => n.toLowerCase() === query.trim().toLowerCase())

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 16px 36px', border: `1px solid ${T.border}`, borderBottom: 'none', maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: T.muted, borderRadius: 2, margin: '0 auto 16px', flexShrink: 0 }} />

        {/* Title */}
        <div style={{ fontSize: 11, color: accentColor, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12, flexShrink: 0 }}>{title}</div>

        {/* Search / type input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) onSelect(query.trim()) }}
            placeholder="Search or type new name…"
            style={{
              flex: 1, background: T.surface, border: `1.5px solid ${accentColor}55`,
              borderRadius: 10, padding: '10px 13px', color: T.text, fontSize: 14, outline: 'none',
            }}
          />
          {query.trim() && (
            <button
              onClick={() => onSelect(query.trim())}
              style={{ padding: '10px 16px', borderRadius: 10, background: accentColor + '22', border: `1.5px solid ${accentColor}55`, color: accentColor, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
            >Set</button>
          )}
        </div>

        {/* Players list */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {canAddNew && (
            <button
              onClick={() => onSelect(query.trim())}
              style={{ padding: '11px 14px', borderRadius: 10, textAlign: 'left', background: accentColor + '12', border: `1px solid ${accentColor}44`, color: accentColor, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 16 }}>＋</span>
              <span>Add "<strong>{query.trim()}</strong>" as new player</span>
            </button>
          )}
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              style={{ padding: '12px 14px', borderRadius: 10, textAlign: 'left', background: T.border2, border: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >{name}</button>
          ))}
          {filtered.length === 0 && !canAddNew && (
            <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '20px 0' }}>No players found. Type a name above to add.</div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 14, padding: '11px', borderRadius: 10, background: T.border2, border: `1px solid ${T.border}`, color: T.subtext, fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
        >Cancel</button>
      </div>
    </div>
  )
}

// ─── NewBatsmanModal ──────────────────────────────────────────────────────────
function NewBatsmanModal({ open, outName, wicketType, knownPlayers, onConfirm }) {
  const [query, setQuery]  = useState('')
  const inputRef           = useRef(null)

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80) }
  }, [open])

  if (!open) return null

  const filtered   = knownPlayers.filter(n => n.toLowerCase().includes(query.toLowerCase()))
  const canAddNew  = query.trim() && !knownPlayers.some(n => n.toLowerCase() === query.trim().toLowerCase())

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: T.surface, borderRadius: 20, padding: '24px 18px 20px', border: '1px solid rgba(255,68,68,0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 18, flexShrink: 0 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>💀</div>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: T.red, letterSpacing: 1 }}>WICKET!</div>
          <div style={{ fontSize: 13, color: T.subtext, marginTop: 4 }}>{outName} — {wicketType || 'Out'}</div>
          <div style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>Select next batsman</div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim()) onConfirm(query.trim()) }}
          placeholder="Search or type name…"
          style={{ width: '100%', background: T.surface, border: '1.5px solid rgba(255,68,68,0.35)', borderRadius: 11, padding: '12px 13px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10, flexShrink: 0 }}
        />

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {canAddNew && (
            <button
              onClick={() => onConfirm(query.trim())}
              style={{ padding: '10px 13px', borderRadius: 9, textAlign: 'left', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >＋ Add "{query.trim()}"</button>
          )}
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => onConfirm(name)}
              style={{ padding: '11px 13px', borderRadius: 9, textAlign: 'left', background: T.border2, border: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >{name}</button>
          ))}
        </div>

        {query.trim() && (
          <button
            onClick={() => onConfirm(query.trim())}
            disabled={!query.trim()}
            style={{ width: '100%', padding: '13px', borderRadius: 11, background: query.trim() ? 'linear-gradient(135deg,#10b981,#10b981)' : T.muted, border: 'none', color: T.text, fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 800, cursor: query.trim() ? 'pointer' : 'not-allowed', boxShadow: query.trim() ? '0 4px 16px rgba(204,0,0,0.4)' : 'none', flexShrink: 0 }}
          >✓ CONFIRM</button>
        )}
      </div>
    </div>
  )
}

// ─── OverChangeBowlerModal ────────────────────────────────────────────────────
function OverChangeBowlerModal({ open, knownBowlers, lastBowler, onConfirm, onSkip }) {
  const [query, setQuery]  = useState('')
  const inputRef           = useRef(null)

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80) }
  }, [open])

  if (!open) return null

  const filtered  = knownBowlers.filter(n => n !== lastBowler && n.toLowerCase().includes(query.toLowerCase()))
  const canAddNew = query.trim() && !knownBowlers.some(n => n.toLowerCase() === query.trim().toLowerCase())

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: T.surface, borderRadius: 20, padding: '24px 18px 20px', border: '1px solid rgba(251,146,60,0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 18, flexShrink: 0 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏏</div>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: T.orange, letterSpacing: 1 }}>OVER COMPLETE</div>
          <div style={{ fontSize: 12, color: T.subtext, marginTop: 4 }}>Select bowler for next over</div>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim()) onConfirm(query.trim()) }}
          placeholder="Search or type bowler name…"
          style={{ width: '100%', background: T.surface, border: '1.5px solid rgba(251,146,60,0.35)', borderRadius: 11, padding: '12px 13px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10, flexShrink: 0 }}
        />

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {canAddNew && (
            <button
              onClick={() => onConfirm(query.trim())}
              style={{ padding: '10px 13px', borderRadius: 9, textAlign: 'left', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: T.orange, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >＋ Add "{query.trim()}"</button>
          )}
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => onConfirm(name)}
              style={{ padding: '11px 13px', borderRadius: 9, textAlign: 'left', background: T.border2, border: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >{name}</button>
          ))}
          {filtered.length === 0 && !canAddNew && (
            <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: 16 }}>
              {lastBowler ? `${lastBowler} cannot bowl consecutive overs. Type a new name.` : 'Type a bowler name above.'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onSkip}
            style={{ flex: 1, padding: '12px', borderRadius: 11, background: T.border2, border: `1px solid ${T.border}`, color: T.subtext, fontFamily: 'Rajdhani,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >Skip</button>
          {query.trim() && (
            <button
              onClick={() => onConfirm(query.trim())}
              style={{ flex: 2, padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#b45309,#fb923c)', border: 'none', color: '#fff', fontFamily: 'Rajdhani,sans-serif', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
            >✓ SET BOWLER</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── OversDotMenu (⋮) ─────────────────────────────────────────────────────────
function OversMenu({ open, currentOvers, onClose, onSave }) {
  const [val, setVal] = useState(String(currentOvers))
  const inputRef      = useRef(null)

  useEffect(() => {
    if (open) { setVal(String(currentOvers)); setTimeout(() => inputRef.current?.focus(), 60) }
  }, [open, currentOvers])

  if (!open) return null

  const n = parseInt(val)
  const valid = !isNaN(n) && n >= 1 && n <= 50

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: T.card, borderRadius: '18px 18px 0 0', padding: '18px 18px 36px', border: `1px solid ${T.border}` }}>
        <div style={{ width: 36, height: 4, background: T.muted, borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ fontSize: 11, color: T.subtext, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>EDIT MATCH OVERS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="number"
            min="1" max="50"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && valid) onSave(n) }}
            style={{ flex: 1, background: T.surface, border: `1.5px solid {T.border}`, borderRadius: 10, padding: '11px 14px', color: T.text, fontSize: 18, fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, outline: 'none', textAlign: 'center' }}
          />
          <button
            disabled={!valid}
            onClick={() => onSave(n)}
            style={{ padding: '11px 22px', borderRadius: 10, background: valid ? T.redDim : T.muted, border: 'none', color: valid ? T.text : T.subtext, fontWeight: 800, fontSize: 14, cursor: valid ? 'pointer' : 'not-allowed' }}
          >Save</button>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>Current: {currentOvers} overs · Change takes effect immediately</div>
      </div>
    </div>
  )
}

// ─── ScoringTab ───────────────────────────────────────────────────────────────
function ScoringTab({ match, allPlayers, allPlayersData, onBall, onUndo, onEndInnings, onUpdateOvers, loading }) {
  const inningsKey     = match.status === 'innings1' ? 'innings1' : 'innings2'
  const innings        = match[inningsKey]
  const isInnings2     = match.status === 'innings2'
  const target         = isInnings2 ? match.innings1.runs + 1 : null

  // Player state
  const [striker,    setStriker]    = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowlerName, setBowlerName] = useState('')

  // Scoring state
  const [runs,        setRuns]        = useState(null)
  const [wicket,      setWicket]      = useState(false)
  const [wicketType,  setWicketType]  = useState('Wicket')
  const [assistName,  setAssistName]  = useState('')
  const [extras,      setExtras]      = useState({ wide: false, noBall: false })
  const [showWktMenu, setShowWktMenu] = useState(false)

  // Modals
  const [picker,         setPicker]         = useState(null) // 'striker'|'nonStriker'|'bowler'
  const [newBatsmanOpen, setNewBatsmanOpen] = useState(false)
  const [pendingBall,    setPendingBall]    = useState(null)
  const [overChangerOpen, setOverChangerOpen] = useState(false)
  const [oversMenuOpen,  setOversMenuOpen]  = useState(false)
  const [retireOpen,       setRetireOpen]       = useState(false)  // retire batsman modal
  const [retiringPlayer,   setRetiringPlayer]   = useState(null)   // 'striker' | 'nonStriker'
  const [midOverBowlerOpen, setMidOverBowlerOpen] = useState(false) // mid-over injury bowler change

  // Player profile modal
  const [profilePlayer, setProfilePlayer] = useState(null)

  // Track previous ball count to detect over completion
  const prevBallsRef = useRef(innings.balls)

  // Auto-init players from first available
  useEffect(() => {
    const active = innings.battingStats?.filter(p => !p.isOut) || []
    if (!striker && active[0]) setStriker(active[0].name)
    if (!nonStriker && active[1]) setNonStriker(active[1].name)
    if (!bowlerName && innings.bowlingStats?.length) setBowlerName(innings.bowlingStats.slice(-1)[0].name)
  }, [innings])

  const WICKET_TYPES   = ['Wicket','Caught','Bowled','Stumped','RunOut(Striker)','RunOut(Non-Striker)','LBW','Hit-Wicket']
  const ASSIST_TYPES   = ['Caught','Stumped','RunOut(Striker)','RunOut(Non-Striker)']

  // Derive known players for picker
  const battingTeamPlayers  = innings.battingTeam === match.team1 ? match.team1Players : match.team2Players
  const bowlingTeamPlayers  = innings.battingTeam === match.team1 ? match.team2Players : match.team1Players
  const knownBatters        = [...new Set([
    ...(battingTeamPlayers || []),
    ...(innings.battingStats?.map(p => p.name) || []),
    ...allPlayers,
  ])].filter(Boolean)
  const knownBowlers        = [...new Set([
    ...(bowlingTeamPlayers || []),
    ...(innings.bowlingStats?.map(p => p.name) || []),
    ...allPlayers,
  ])].filter(Boolean)
  const knownBowlersExisting = innings.bowlingStats?.map(p => p.name) || []

  // Current-over balls (legal balls only for over counter)
  const legalBalls   = innings.ballByBall?.filter(b => !b.isWide && !b.isNoBall) || []
  const overBallNum  = legalBalls.length % 6
  // Balls in THIS over = all balls since last complete over (including wides/noballs)
  const completedLegalOvers = Math.floor(legalBalls.length / 6)
  let thisBalls = []
  let legalCount = 0
  for (let i = innings.ballByBall.length - 1; i >= 0; i--) {
    const b = innings.ballByBall[i]
    thisBalls.unshift(b)
    if (!b.isWide && !b.isNoBall) {
      legalCount++
      if (legalCount >= overBallNum && overBallNum > 0) break
      if (overBallNum === 0) break
    }
  }
  // If overBallNum === 0 means we're at the start of a fresh over — show last over or empty
  const currentOverBalls = overBallNum === 0 ? [] : thisBalls

  const strikerStats    = innings.battingStats?.find(p => p.name === striker)
  const nonStrikerStats = innings.battingStats?.find(p => p.name === nonStriker)
  const bowlerStats     = innings.bowlingStats?.find(p => p.name === bowlerName)

  const overRunsThisOver = currentOverBalls.reduce((s, b) => s + (b.runs || 0), 0)
  const overWktsThisOver = currentOverBalls.filter(b => b.isWicket).length

  // ── Submit ball ──
  const submitBall = useCallback((ballData, nextBatsman) => {
    const legalBeforeThisBall = legalBalls.length
    const isLegal = !ballData.isWide && !ballData.isNoBall

    onBall(ballData)

    // Rotate strike after odd runs (not wide)
    if (isLegal && ballData.runs % 2 !== 0) {
      setStriker(nonStriker)
      setNonStriker(striker)
    }
    // After wicket, set next batsman
    if (ballData.isWicket) {
      setStriker(nextBatsman || '')
    }
    // Detect over end: if this ball is legal and it's the 6th of the over
    if (isLegal && (legalBeforeThisBall + 1) % 6 === 0) {
      // Rotate strike at over end
      setStriker(prev => {
        const s = prev
        setNonStriker(s)
        return nonStriker
      })
      setOverChangerOpen(true)
    }

    setRuns(null)
    setWicket(false)
    setWicketType('Wicket')
    setAssistName('')
    setExtras({ wide: false, noBall: false })
  }, [legalBalls, striker, nonStriker, onBall])

  const handleOK = () => {
    if (runs === null) return
    const ballData = {
      runs,
      isWicket: wicket,
      wicketType: wicket ? wicketType : null,
      assistPlayer: wicket && ASSIST_TYPES.includes(wicketType) ? assistName : null,
      isWide:   extras.wide,
      isNoBall: extras.noBall,
      extraRuns: extras.wide || extras.noBall ? (match.wideRuns || match.noBallRuns || 1) : 0,
      batsmanName: striker,
      bowlerName:  bowlerName,
    }
    if (wicket) {
      setPendingBall(ballData)
      setNewBatsmanOpen(true)
    } else {
      submitBall(ballData, null)
    }
  }

  const handleNewBatsman = (name) => {
    setNewBatsmanOpen(false)
    submitBall(pendingBall, name)
    setPendingBall(null)
  }

  const handleOverBowlerChange = (name) => {
    setBowlerName(name)
    setOverChangerOpen(false)
  }

  const handleUpdateOvers = (n) => {
    setOversMenuOpen(false)
    onUpdateOvers(n)
  }

  const okEnabled = runs !== null && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: 8 }}>

      {/* Profile Modal */}
      <PlayerProfileModal
        open={!!profilePlayer} onClose={() => setProfilePlayer(null)}
        playerName={profilePlayer} match={match} allPlayersData={allPlayersData}
      />

      {/* Modals */}
      <PlayerPickerSheet
        open={picker === 'striker'} onClose={() => setPicker(null)}
        onSelect={n => { setStriker(n); setPicker(null) }}
        title="SET STRIKER" accentColor={T.accent} knownPlayers={knownBatters}
      />
      <PlayerPickerSheet
        open={picker === 'nonStriker'} onClose={() => setPicker(null)}
        onSelect={n => { setNonStriker(n); setPicker(null) }}
        title="SET NON-STRIKER" accentColor={T.sky} knownPlayers={knownBatters}
      />
      <PlayerPickerSheet
        open={picker === 'bowler'} onClose={() => setPicker(null)}
        onSelect={n => { setBowlerName(n); setPicker(null) }}
        title="SET BOWLER" accentColor={T.orange} knownPlayers={knownBowlers}
      />
      <NewBatsmanModal
        open={newBatsmanOpen}
        outName={striker}
        wicketType={pendingBall?.wicketType}
        knownPlayers={knownBatters.filter(n => n !== striker && n !== nonStriker)}
        onConfirm={handleNewBatsman}
      />
      <OverChangeBowlerModal
        open={overChangerOpen}
        knownBowlers={knownBowlersExisting.length ? knownBowlersExisting : knownBowlers}
        lastBowler={bowlerName}
        onConfirm={handleOverBowlerChange}
        onSkip={() => setOverChangerOpen(false)}
      />
      {/* Mid-over injury bowler change */}
      <PlayerPickerSheet
        open={midOverBowlerOpen} onClose={() => setMidOverBowlerOpen(false)}
        onSelect={n => { setBowlerName(n); setMidOverBowlerOpen(false) }}
        title="🤕 INJURY SUB — NEW BOWLER" accentColor={T.red} knownPlayers={knownBowlers}
      />
      <OversMenu
        open={oversMenuOpen}
        currentOvers={match.overs}
        onClose={() => setOversMenuOpen(false)}
        onSave={handleUpdateOvers}
      />

      {/* ── SCORE HEADER ── */}
      <div style={{ margin: '10px 12px 0', background: 'linear-gradient(135deg,#0f1929,#111827)', border: `1px solid ${T.border}`, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: T.subtext, fontWeight: 800, letterSpacing: 0.5, marginBottom: 2 }}>
              {innings.battingTeam} · Innings {isInnings2 ? 2 : 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 38, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                {innings.runs}
              </span>
              <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, color: T.subtext }}>/{innings.wickets}</span>
            </div>
            <div style={{ fontSize: 11, color: T.subtext, marginTop: 3 }}>
              ({fmtOvers(innings.balls)} ov)
              {isInnings2 && target && (
                <span style={{ color: T.sky, marginLeft: 8 }}>Need {Math.max(0, target - innings.runs)} off {match.overs * 6 - innings.balls} balls</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: T.red, fontWeight: 800, letterSpacing: 1 }}>CRR</div>
              <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: T.text }}>{calcCRR(innings.runs, innings.balls)}</div>
              {isInnings2 && target && (
                <>
                  <div style={{ fontSize: 10, color: T.gold, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>RRR</div>
                  <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: T.gold }}>{calcRRR(target, innings.runs, innings.balls, match.overs)}</div>
                </>
              )}
            </div>
            {/* ⋮ Three-dot menu */}
            <button
              onClick={() => setOversMenuOpen(true)}
              style={{ width: 30, height: 30, borderRadius: 8, background: T.border2, border: `1px solid ${T.border}`, color: T.text2, fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 }}
              title="Edit overs"
            >⋮</button>
          </div>
        </div>
      </div>

      {/* ── BATTER / BOWLER CARD ── */}
      <div style={{ margin: '8px 12px 0', background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* col headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 44px', padding: '4px 14px', background: T.border2, borderBottom: `1px solid ${T.border2}` }}>
          <span style={{ fontSize: 10, color: T.muted, fontWeight: 800 }}>BATTER</span>
          {['R','B','SR'].map(h => <span key={h} style={{ fontSize: 10, color: T.muted, fontWeight: 800, textAlign: 'center' }}>{h}</span>)}
        </div>

        {/* Striker */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 44px 30px', padding: '10px 14px', borderBottom: `1px solid ${T.border2}`, alignItems: 'center' }}
        >
          <div onClick={() => setPicker('striker')} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, flexShrink: 0, boxShadow: '0 0 6px #4ade8088' }} />
            <span style={{ fontSize: 14, color: striker ? T.text : T.muted, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {striker || <span style={{ color: T.muted, fontSize: 13 }}>Tap to set striker ✎</span>}
              {striker && <span style={{ color: T.accent, fontSize: 12 }}> *</span>}
            </span>
          </div>
          <span style={{ fontSize: 15, color: T.text, fontWeight: 800, textAlign: 'center' }}>{strikerStats?.runs ?? 0}</span>
          <span style={{ fontSize: 13, color: T.subtext, textAlign: 'center' }}>{strikerStats?.balls ?? 0}</span>
          <span style={{ fontSize: 12, color: T.subtext, textAlign: 'center' }}>
            {strikerStats?.balls > 0 ? (strikerStats.runs / strikerStats.balls * 100).toFixed(0) : '—'}
          </span>
          {striker && (
            <button onClick={() => setProfilePlayer(striker)} style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: T.accent, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</button>
          )}
        </div>

        {/* Non-Striker */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 44px 30px', padding: '10px 14px', borderBottom: `1px solid ${T.border2}`, alignItems: 'center' }}
        >
          <div onClick={() => setPicker('nonStriker')} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: nonStriker ? T.text2 : T.muted, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nonStriker || <span style={{ fontSize: 13 }}>Tap to set non-striker ✎</span>}
            </span>
          </div>
          <span style={{ fontSize: 15, color: T.text2, fontWeight: 800, textAlign: 'center' }}>{nonStrikerStats?.runs ?? 0}</span>
          <span style={{ fontSize: 13, color: T.subtext, textAlign: 'center' }}>{nonStrikerStats?.balls ?? 0}</span>
          <span style={{ fontSize: 12, color: T.subtext, textAlign: 'center' }}>
            {nonStrikerStats?.balls > 0 ? (nonStrikerStats.runs / nonStrikerStats.balls * 100).toFixed(0) : '—'}
          </span>
          {nonStriker && (
            <button onClick={() => setProfilePlayer(nonStriker)} style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: T.sky, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</button>
          )}
        </div>

        {/* Bowler */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px 44px 30px', padding: '8px 14px', alignItems: 'center', background: 'rgba(251,146,60,0.04)' }}
        >
          <div onClick={() => setPicker('bowler')} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, color: T.orange, fontWeight: 800, letterSpacing: 0.5, flexShrink: 0 }}>BOWL</span>
            <span style={{ fontSize: 14, color: bowlerName ? T.orange : T.muted, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bowlerName || <span style={{ fontSize: 13 }}>Tap to set bowler ✎</span>}
            </span>
          </div>
          <span style={{ fontSize: 12, color: T.subtext, textAlign: 'center' }}>{fmtOvers(bowlerStats?.balls ?? 0)}</span>
          <span style={{ fontSize: 12, color: T.subtext, textAlign: 'center' }}>{bowlerStats?.runs ?? 0}</span>
          <span style={{ fontSize: 13, color: T.red, fontWeight: 800, textAlign: 'center' }}>{bowlerStats?.wickets ?? 0}</span>
          <span style={{ fontSize: 12, color: T.sky, textAlign: 'center' }}>{bowlerStats?.wides ?? 0}</span>
          {bowlerName && (
            <button onClick={() => setProfilePlayer(bowlerName)} style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: T.orange, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px 44px 30px', padding: '2px 14px 5px' }}>
          <span />{['O','R','W','Wd'].map(l => <span key={l} style={{ fontSize: 9, color: T.text2, fontWeight: 800, textAlign: 'center' }}>{l}</span>)}<span />
        </div>
      </div>

      {/* ── THIS OVER ── */}
      <div style={{ margin: '8px 12px 0', background: T.card, border: `1px solid ${T.border2}`, borderRadius: 12, padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: T.muted, fontWeight: 800, letterSpacing: 1 }}>
            THIS OVER · {fmtOvers(innings.balls)}
          </span>
          {currentOverBalls.length > 0 && (
            <span style={{ fontSize: 11, color: T.subtext, fontWeight: 700 }}>
              {overRunsThisOver}R{overWktsThisOver > 0 ? ` · ${overWktsThisOver}W` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 32 }}>
          {currentOverBalls.length === 0
            ? <span style={{ color: T.muted, fontSize: 12 }}>No balls bowled yet</span>
            : currentOverBalls.map((b, i) => <BallDot key={i} ball={b} />)
          }
        </div>
      </div>

      {/* ── EXTRAS ── */}
      <div style={{ margin: '8px 12px 0', background: T.card, border: `1px solid ${T.border2}`, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 0, justifyContent: 'space-around' }}>
        {[
          { key: 'wide',   label: 'Wide',    color: T.sky },
          { key: 'noBall', label: 'No Ball', color: T.orange },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setExtras(e => ({ ...e, [key]: !e[key] }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: extras[key] ? color + '18' : 'transparent' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${extras[key] ? color : T.muted}`, background: extras[key] ? color + '33' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {extras[key] && <span style={{ fontSize: 13, color }}>✓</span>}
            </div>
            <span style={{ fontSize: 11, color: extras[key] ? color : T.subtext, fontWeight: 800 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── RUN BUTTONS ── */}
      <div style={{ margin: '8px 12px 0', display: 'flex', gap: 6 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(r => {
          const selected = runs === r
          const c4 = { bg: T.accentDim, br: T.accent, tx: T.accent }
          const c6 = { bg: T.purpleDim, br: T.purple, tx: T.purple }
          const cc = r === 4 ? c4 : r === 6 ? c6 : { bg: T.redDim, br: T.red, tx: T.text }
          return (
            <button key={r} onClick={() => setRuns(r)} style={{
              flex: 1, height: 46, borderRadius: 12,
              background: selected ? cc.bg : T.card,
              border: `2px solid ${selected ? cc.br : T.muted}`,
              color: selected ? cc.tx : T.subtext,
              fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.1s',
              boxShadow: selected ? `0 2px 10px ${cc.br}44` : 'none',
            }}>{r}</button>
          )
        })}
      </div>

      {/* ── WICKET ROW ── */}
      <div style={{ margin: '8px 12px 0', display: 'flex', gap: 8, position: 'relative', alignItems: 'stretch' }}>
        {/* Wicket toggle */}
        <button onClick={() => { setWicket(w => !w); if (!wicket && runs === null) setRuns(0) }} style={{
          width: 82, borderRadius: 11, flexShrink: 0,
          background: wicket ? 'rgba(127,29,29,0.7)' : T.card,
          border: `2px solid ${wicket ? T.red : T.muted}`,
          color: wicket ? T.red : T.subtext,
          fontFamily: 'Rajdhani,sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '8px 0',
          transition: 'all 0.15s',
        }}>
          <span style={{ fontSize: 18 }}>{wicket ? '💀' : '🏏'}</span>
          <span>{wicket ? 'W ON' : 'WICKET'}</span>
        </button>

        {/* Wicket type dropdown */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); if (wicket) setShowWktMenu(s => !s) }}
            style={{
              width: '100%', height: '100%', minHeight: 58, borderRadius: 11,
              background: wicket ? 'rgba(127,29,29,0.25)' : T.card,
              border: `2px solid ${wicket ? '#10b98144' : T.muted}`,
              color: wicket ? '#ef4444' : T.text2,
              fontFamily: 'Rajdhani,sans-serif', fontSize: 14, fontWeight: 700,
              cursor: wicket ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
            }}
          >
            <span>{wicketType}</span>
            {wicket && <span style={{ fontSize: 10, color: T.red }}>▼</span>}
          </button>
          {showWktMenu && wicket && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 300, background: T.surface, border: '1px solid rgba(255,68,68,0.3)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.8)' }}>
              {WICKET_TYPES.map(type => (
                <button key={type} onClick={() => { setWicketType(type); setAssistName(''); setShowWktMenu(false) }}
                  style={{ display: 'block', width: '100%', padding: '11px 16px', textAlign: 'left', background: wicketType === type ? 'rgba(255,68,68,0.15)' : 'transparent', border: 'none', borderBottom: `1px solid ${T.border2}`, color: wicketType === type ? T.red : T.text2, fontFamily: 'Rajdhani,sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OK */}
        <button onClick={handleOK} disabled={!okEnabled} style={{
          width: 64, borderRadius: 11, flexShrink: 0,
          background: okEnabled ? 'linear-gradient(135deg,#10b981,#10b981)' : T.card,
          border: `2px solid ${okEnabled ? T.red : T.muted}`,
          color: okEnabled ? T.text : T.text2,
          fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 800,
          cursor: okEnabled ? 'pointer' : 'not-allowed',
          boxShadow: okEnabled ? '0 4px 16px rgba(204,0,0,0.5)' : 'none',
          transition: 'all 0.15s',
        }}>OK</button>
      </div>

      {/* ── ASSIST ── */}
      {wicket && ASSIST_TYPES.includes(wicketType) && (
        <div style={{ margin: '6px 12px 0', background: 'rgba(127,29,29,0.12)', border: '1px solid rgba(255,68,68,0.15)', borderRadius: 11, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: T.red, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>
            {wicketType.startsWith('RunOut') ? '⚡ RUN OUT BY' : wicketType === 'Stumped' ? '🧤 STUMPED BY' : '🙌 CAUGHT BY'}
          </div>
          <input value={assistName} onChange={e => setAssistName(e.target.value)} placeholder="Fielder / keeper name…"
            style={{ width: '100%', background: T.surface, border: '1px solid rgba(255,68,68,0.25)', borderRadius: 9, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {innings.bowlingStats?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {innings.bowlingStats.map(p => (
                <button key={p.name} onClick={() => setAssistName(p.name)} style={{
                  padding: '5px 10px', borderRadius: 7,
                  background: assistName === p.name ? 'rgba(255,68,68,0.25)' : T.border2,
                  border: `1px solid ${assistName === p.name ? '#10b98155' : T.border}`,
                  color: assistName === p.name ? '#ef4444' : T.subtext,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer'
                }}>{p.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div style={{ margin: '8px 12px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={() => { setStriker(nonStriker); setNonStriker(striker) }} style={{ height: 40, borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, color: T.subtext, fontFamily: 'Rajdhani,sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer' }}>⇄ SWITCH BAT</button>
        <button onClick={onEndInnings} style={{ height: 40, borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, color: T.subtext, fontFamily: 'Rajdhani,sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer' }}>END INNINGS</button>
      </div>
      {/* Retire row */}
      <div style={{ margin: '0 12px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {striker && (
          <button
            onClick={() => { setRetiringPlayer('striker'); setRetireOpen(true) }}
            style={{ height: 38, borderRadius: 10, background: `rgba(245,158,11,0.08)`, border: `1px solid ${T.goldDim}`, color: T.gold, fontFamily: 'Rajdhani,sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer' }}
          >🛑 RETIRE STRIKER</button>
        )}
        {nonStriker && (
          <button
            onClick={() => { setRetiringPlayer('nonStriker'); setRetireOpen(true) }}
            style={{ height: 38, borderRadius: 10, background: `rgba(245,158,11,0.08)`, border: `1px solid ${T.goldDim}`, color: T.gold, fontFamily: 'Rajdhani,sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer' }}
          >🛑 RETIRE NON-STR</button>
        )}
      </div>
      {/* Bowler injury mid-over change */}
      <div style={{ margin: '0 12px 4px' }}>
        <button
          onClick={() => setMidOverBowlerOpen(true)}
          style={{ width: '100%', height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: `1px solid rgba(239,68,68,0.3)`, color: T.red, fontFamily: 'Rajdhani,sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >🤕 BOWLER INJURY — CHANGE MID-OVER</button>
      </div>

      {/* Retire Batsman Modal */}
      {retireOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1200 }} onClick={() => setRetireOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: T.card, borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', border: `1px solid ${T.border}`, borderBottom: 'none' }}>
            <div style={{ width: 36, height: 4, background: T.muted, borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>RETIRE BATSMAN</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 700, marginBottom: 4 }}>
              {retiringPlayer === 'striker' ? striker : nonStriker}
            </div>
            <div style={{ fontSize: 12, color: T.subtext, marginBottom: 20 }}>Select reason for retiring:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '🤕 Retired Hurt (Injured)', reason: 'hurt', desc: 'Can bat again later if recovered' },
                { label: '✋ Retired Out (Voluntary)', reason: 'out', desc: 'Cannot return to bat' },
              ].map(({ label, reason, desc }) => (
                <button key={reason} onClick={() => {
                  const retiredName = retiringPlayer === 'striker' ? striker : nonStriker
                  // Mark as retired in state
                  if (retiringPlayer === 'striker') setStriker('')
                  else setNonStriker('')
                  setRetireOpen(false)
                  setRetiringPlayer(null)
                  // Open new batsman picker
                  setPendingBall({ isRetire: true, retiredName, retiredAs: retiringPlayer, reason })
                  setNewBatsmanOpen(true)
                }} style={{ padding: '14px 16px', borderRadius: 12, textAlign: 'left', background: `rgba(245,158,11,0.08)`, border: `1px solid ${T.goldDim}`, cursor: 'pointer' }}>
                  <div style={{ fontSize: 14, color: T.gold, fontWeight: 800 }}>{label}</div>
                  <div style={{ fontSize: 11, color: T.subtext, marginTop: 3 }}>{desc}</div>
                </button>
              ))}
              <button onClick={() => { setRetireOpen(false); setRetiringPlayer(null) }} style={{ padding: '12px', borderRadius: 10, background: T.border2, border: `1px solid ${T.border}`, color: T.subtext, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ScorecardTab ─────────────────────────────────────────────────────────────
function ScorecardTab({ match, allPlayersData = [], onPlayerTap }) {
  const [activeInn, setActiveInn] = useState('innings1')
  const [showOvers, setShowOvers] = useState(false)

  const buildFOW = (inn) => {
    if (!inn?.ballByBall) return []
    const fow = []; let runs = 0, balls = 0, wkts = 0
    inn.ballByBall.forEach(b => {
      runs += b.runs || 0
      if (!b.isWide && !b.isNoBall) balls++
      if (b.isWicket) { wkts++; fow.push({ score: runs, wicket: wkts, over: fmtOvers(balls), batsmanName: b.batsmanName }) }
    })
    return fow
  }

  const buildOvers = (inn) => {
    if (!inn?.ballByBall) return []
    const overs = []; let ob = [], or = 0, ow = 0, lc = 0, on = 0
    inn.ballByBall.forEach(b => {
      ob.push(b); or += b.runs || 0; if (b.isWicket) ow++
      if (!b.isWide && !b.isNoBall) {
        lc++
        if (lc % 6 === 0) { overs.push({ over: on + 1, runs: or, wickets: ow, balls: [...ob] }); ob = []; or = 0; ow = 0; on++ }
      }
    })
    if (ob.length > 0) overs.push({ over: on + 1, runs: or, wickets: ow, balls: ob })
    return overs
  }

  const dismissal = (p) => {
    if (!p.isOut) return null
    const wt = p.wicketType || 'Wicket'
    if (wt === 'Wicket') return 'out'
    if (wt === 'Bowled') return `b ${p.bowlerName || ''}`
    if (wt === 'LBW') return `lbw b ${p.bowlerName || ''}`
    if (wt === 'Caught') return `c ${p.assistPlayer || ''} b ${p.bowlerName || ''}`
    if (wt === 'Stumped') return `st ${p.assistPlayer || ''} b ${p.bowlerName || ''}`
    if (wt === 'Hit-Wicket') return `hit wicket b ${p.bowlerName || ''}`
    if (wt.startsWith('RunOut')) return `run out (${p.assistPlayer || ''})`
    return wt.toLowerCase()
  }

  const renderInnings = (key) => {
    const inn = match[key]
    if (!inn?.battingStats?.length && !inn?.bowlingStats?.length)
      return <div style={{ padding: 40, textAlign: 'center', color: T.text2, fontSize: 13 }}>No data yet</div>
    const fow = buildFOW(inn), overs = buildOvers(inn)
    const wides   = inn.ballByBall?.filter(b => b.isWide).length || 0
    const noBalls = inn.ballByBall?.filter(b => b.isNoBall).length || 0
    const teamPlayers = (key === 'innings1' ? match.team1Players : match.team2Players) || []
    const dnb = teamPlayers.filter(p => !(inn.battingStats || []).find(s => s.name === p))

    const SH = ({ title, right }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.text2, letterSpacing: 0.5 }}>{title}</span>
        {right && <span style={{ fontSize: 11, color: T.subtext }}>{right}</span>}
      </div>
    )

    return (
      <div style={{ background: T.card, paddingBottom: 16 }}>
        {/* Header */}
        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: T.text2, fontWeight: 700, marginBottom: 2 }}>{key === 'innings1' ? '1st Innings' : '2nd Innings'}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{inn.battingTeam}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{inn.runs}-{inn.wickets}</div>
            <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>({fmtOvers(inn.balls)} ov)</div>
          </div>
        </div>

        {/* Batting */}
        <SH title="BATTING" right={`${inn.battingStats?.length || 0} batters`} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 32px 32px 44px', padding: '5px 14px', background: T.surface, borderBottom: `1px solid ${T.border2}` }}>
          {['Batter','R','B','4s','6s','SR'].map((h, i) => <div key={i} style={{ fontSize: 11, color: T.subtext, fontWeight: 700, textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>)}
        </div>
        {(inn.battingStats || []).map((p, i) => {
          const sr = p.balls > 0 ? (p.runs / p.balls * 100).toFixed(1) : '0.0'
          const dis = dismissal(p)
          return (
            <div key={i} style={{ borderBottom: `1px solid ${T.border2}`, cursor: 'pointer' }} onClick={() => onPlayerTap?.(p.name)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 32px 32px 44px', padding: '10px 14px', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: dis ? 3 : 0 }}>
                    <span style={{ fontSize: 14, color: T.text, fontWeight: 700, borderBottom: '1px dotted T.border' }}>{p.name}</span>
                    {!p.isOut && <span style={{ fontSize: 9, color: T.accent, fontWeight: 800, background: 'rgba(74,222,128,0.12)', padding: '2px 6px', borderRadius: 3 }}>BATTING</span>}
                  </div>
                  {dis && <div style={{ fontSize: 11, color: T.subtext, lineHeight: 1.4, maxWidth: 180 }}>{dis}</div>}
                </div>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 800, textAlign: 'center', paddingTop: 2 }}>{p.runs}</div>
                <div style={{ fontSize: 13, color: T.subtext, textAlign: 'center', paddingTop: 2 }}>{p.balls}</div>
                <div style={{ fontSize: 13, color: T.subtext, textAlign: 'center', paddingTop: 2 }}>{p.fours || 0}</div>
                <div style={{ fontSize: 13, color: T.subtext, textAlign: 'center', paddingTop: 2 }}>{p.sixes || 0}</div>
                <div style={{ fontSize: 12, color: T.subtext, textAlign: 'center', paddingTop: 2 }}>{sr}</div>
              </div>
            </div>
          )
        })}
        {dnb.length > 0 && (
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.border2}`, background: '#0d1520' }}>
            <span style={{ fontSize: 11, color: T.subtext, fontWeight: 700 }}>Did not bat: </span>
            <span style={{ fontSize: 12, color: T.subtext }}>{dnb.join(', ')}</span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 36px 32px 32px 44px', padding: '9px 14px', background: '#0d1520', borderTop: `1px solid ${T.border2}`, borderBottom: `1px solid ${T.border2}` }}>
          <div style={{ fontSize: 13, color: T.subtext }}>Extras <span style={{ fontSize: 11, color: T.text2, marginLeft: 8 }}>w {wides}, nb {noBalls}</span></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'center' }}>{wides + noBalls}</div>
          {[0,0,0,0].map((_, i) => <div key={i} />)}
        </div>

        {/* Bowling */}
        <SH title="BOWLING" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 28px 36px 28px 36px', padding: '5px 14px', background: T.surface, borderBottom: `1px solid ${T.border2}` }}>
          {['Bowler','O','M','R','W','ER'].map(h => <div key={h} style={{ fontSize: 11, color: T.subtext, fontWeight: 700, textAlign: h === 'Bowler' ? 'left' : 'center' }}>{h}</div>)}
        </div>
        {(inn.bowlingStats || []).map((p, i) => {
          const eco = p.balls > 0 ? (p.runs / (p.balls / 6)).toFixed(1) : '0.0'
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 28px 36px 28px 36px', padding: '10px 14px', borderBottom: `1px solid ${T.border2}`, alignItems: 'center', cursor: 'pointer' }} onClick={() => onPlayerTap?.(p.name)}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600, borderBottom: '1px dotted T.border' }}>{p.name}</div>
              <div style={{ fontSize: 13, color: T.subtext, textAlign: 'center' }}>{fmtOvers(p.balls || 0)}</div>
              <div style={{ fontSize: 13, color: T.text2, textAlign: 'center' }}>0</div>
              <div style={{ fontSize: 13, color: T.subtext, textAlign: 'center' }}>{p.runs || 0}</div>
              <div style={{ fontSize: 14, color: (p.wickets || 0) > 0 ? T.redDim : T.subtext, fontWeight: (p.wickets || 0) > 0 ? 800 : 400, textAlign: 'center' }}>{p.wickets || 0}</div>
              <div style={{ fontSize: 12, color: T.subtext, textAlign: 'center' }}>{eco}</div>
            </div>
          )
        })}

        {/* FOW */}
        {fow.length > 0 && (
          <>
            <SH title="FALL OF WICKETS" />
            <div style={{ padding: '6px 14px 10px' }}>
              {fow.map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.border2}`, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: T.text2 }}>
                    <span style={{ fontWeight: 700 }}>{f.score}-{f.wicket}</span>
                    {f.batsmanName && <span style={{ color: T.subtext, fontSize: 11, marginLeft: 6 }}>({f.batsmanName})</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.subtext }}>{f.over} ov</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Over-by-over */}
        {overs.length > 0 && (
          <>
            <div onClick={() => setShowOvers(s => !s)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.text2, letterSpacing: 0.5 }}>OVER BY OVER</span>
              <span style={{ fontSize: 12, color: T.subtext }}>{showOvers ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {showOvers && (
              <div style={{ padding: '6px 14px 10px' }}>
                {overs.map(({ over, runs: or, wickets: ow, balls: ob }, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px', padding: '6px 0', borderBottom: `1px solid ${T.border2}`, alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, color: T.subtext, fontWeight: 700, textAlign: 'center' }}>{over}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ob.map((b, bi) => <BallDot key={bi} ball={b} size={26} />)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ow > 0 ? T.redDim : T.text2, textAlign: 'center' }}>
                      {or}{ow > 0 && <span style={{ fontSize: 11, color: T.red }}> {ow}W</span>}
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

  const has2 = match.status === 'innings2' || match.status === 'completed'

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.surface }}>
      {match.status === 'completed' && match.result && (
        <div style={{ background: '#1b5e20', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontSize: 13, color: '#a5d6a7', fontWeight: 700 }}>{match.result}</span>
        </div>
      )}
      {(match.status === 'innings1' || match.status === 'innings2') && (
        <div style={{ background: '#0d2137', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#90caf9', fontWeight: 800 }}>LIVE</span>
          <span style={{ fontSize: 12, color: '#5c8ab0' }}>
            {match.status === 'innings2'
              ? `${match.innings2?.battingTeam} need ${Math.max(0, (match.innings1?.runs || 0) + 1 - (match.innings2?.runs || 0))} more`
              : `${match.innings1?.battingTeam} batting first`}
          </span>
        </div>
      )}
      {has2 && (
        <div style={{ display: 'flex', background: T.card, borderBottom: `1px solid ${T.border}` }}>
          {[{ key: 'innings1', label: match.innings1?.battingTeam || '1st' }, { key: 'innings2', label: match.innings2?.battingTeam || '2nd' }].map(t => (
            <button key={t.key} onClick={() => setActiveInn(t.key)} style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: activeInn === t.key ? T.red : T.subtext, borderBottom: `3px solid ${activeInn === t.key ? T.red : 'transparent'}`, transition: 'all 0.15s' }}>{t.label}</button>
          ))}
        </div>
      )}
      {renderInnings(has2 ? activeInn : 'innings1')}
    </div>
  )
}

// ─── PointsTab ─────────────────────────────────────────────────────────────────
function PointsTab({ match, onPlayerTap }) {
  const inn1 = match.innings1, inn2 = match.innings2
  const t1s  = inn1?.runs ?? 0, t2s = inn2?.runs ?? 0
  const max  = Math.max(t1s, t2s, 1)

  // Collect all unique players across both innings
  const allPlayerPerf = (() => {
    const map = {}
    ;['innings1', 'innings2'].forEach(innKey => {
      const inn = match[innKey]
      if (!inn) return
      const isBatting1 = innKey === 'innings1'
      ;(inn.battingStats || []).forEach(p => {
        if (!map[p.name]) map[p.name] = { name: p.name, team: inn.battingTeam, bat: [], bowl: [] }
        map[p.name].bat.push({ ...p, innings: isBatting1 ? 1 : 2 })
      })
      ;(inn.bowlingStats || []).forEach(p => {
        if (!map[p.name]) map[p.name] = { name: p.name, team: inn.battingTeam === match.team1 ? match.team2 : match.team1, bat: [], bowl: [] }
        map[p.name].bowl.push({ ...p, innings: isBatting1 ? 1 : 2 })
      })
    })
    return Object.values(map)
  })()

  // Compute a simple fantasy-style performance score
  const calcScore = (pl) => {
    let pts = 0
    pl.bat.forEach(b => {
      pts += (b.runs || 0)
      if (b.runs >= 50) pts += 8
      if (b.runs >= 100) pts += 16
      pts += (b.sixes || 0) * 2
      pts += (b.fours || 0) * 1
      if (!b.isOut && (b.runs || 0) >= 10) pts += 4 // not out bonus
    })
    pl.bowl.forEach(b => {
      pts += (b.wickets || 0) * 25
      if (b.wickets >= 3) pts += 8
      if (b.wickets >= 5) pts += 16
      const eco = b.balls > 0 ? (b.runs / (b.balls / 6)) : 99
      if (eco < 6 && b.balls >= 12) pts += 6
    })
    return pts
  }

  const ranked = [...allPlayerPerf].map(p => ({ ...p, pts: calcScore(p) })).sort((a, b) => b.pts - a.pts)
  const maxPts = Math.max(...ranked.map(p => p.pts), 1)

  const SectionHead = ({ title, color = T.subtext }) => (
    <div style={{ padding: '8px 14px', background: T.border2, borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 10, color, fontWeight: 800, letterSpacing: 1.2 }}>{title}</span>
    </div>
  )

  return (
    <div style={{ padding: '10px 12px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Result Banner */}
      {match.status === 'completed' && match.result && (
        <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#ca8a04', fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>MATCH RESULT</div>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: T.gold }}>🏆 {match.result}</div>
        </div>
      )}

      {/* Score Comparison */}
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <SectionHead title="SCORE COMPARISON" color={T.subtext} />
        {[
          { team: match.team1, score: t1s, wkts: inn1?.wickets ?? 0, balls: inn1?.balls ?? 0, color: '#10b981', grad: 'linear-gradient(90deg,#10b981,#059669)' },
          { team: match.team2, score: t2s, wkts: inn2?.wickets ?? 0, balls: inn2?.balls ?? 0, color: T.sky,     grad: 'linear-gradient(90deg,#1d4ed8,#60a5fa)' },
        ].map((t, i) => (
          <div key={i} style={{ padding: '12px 14px', borderBottom: i === 0 ? `1px solid ${T.border2}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{t.team}</span>
              <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: t.color }}>
                {t.score}/{t.wkts}
                <span style={{ fontSize: 12, color: T.subtext, marginLeft: 6, fontFamily: 'Nunito,sans-serif', fontWeight: 600 }}>({fmtOvers(t.balls)} ov)</span>
              </span>
            </div>
            <div style={{ height: 7, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: t.grad, width: `${(t.score / max) * 100}%`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Key Team Stats */}
      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <SectionHead title="KEY STATS" />
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', padding: '6px 14px 4px', background: T.surface }}>
          <span />
          <span style={{ fontSize: 10, color: T.accent, fontWeight: 800, textAlign: 'center' }}>{match.team1}</span>
          <span style={{ fontSize: 10, color: T.sky,    fontWeight: 800, textAlign: 'center' }}>{match.team2}</span>
        </div>
        {[
          { label: 'Overs',    v1: fmtOvers(inn1?.balls ?? 0), v2: fmtOvers(inn2?.balls ?? 0) },
          { label: 'Run Rate', v1: calcCRR(t1s, inn1?.balls ?? 0), v2: calcCRR(t2s, inn2?.balls ?? 0) },
          { label: 'Wickets',  v1: inn1?.wickets ?? 0, v2: inn2?.wickets ?? 0 },
          { label: 'Fours',    v1: (inn1?.battingStats || []).reduce((s, p) => s + (p.fours || 0), 0), v2: (inn2?.battingStats || []).reduce((s, p) => s + (p.fours || 0), 0) },
          { label: 'Sixes',    v1: (inn1?.battingStats || []).reduce((s, p) => s + (p.sixes || 0), 0), v2: (inn2?.battingStats || []).reduce((s, p) => s + (p.sixes || 0), 0) },
          { label: 'Extras',   v1: (inn1?.ballByBall || []).filter(b => b.isWide || b.isNoBall).length, v2: (inn2?.ballByBall || []).filter(b => b.isWide || b.isNoBall).length },
        ].map((row, i, arr) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', padding: '9px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${T.border2}` : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.subtext, fontWeight: 700 }}>{row.label}</span>
            <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 700, color: T.accent, textAlign: 'center' }}>{row.v1}</span>
            <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 700, color: T.sky,    textAlign: 'center' }}>{row.v2}</span>
          </div>
        ))}
      </div>

      {/* Player Performance Leaderboard */}
      {ranked.length > 0 && (
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <SectionHead title="PLAYER PERFORMANCE" color={T.gold} />
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 44px 36px 40px', padding: '5px 14px', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            <span />
            <span style={{ fontSize: 9, color: T.muted, fontWeight: 800, letterSpacing: 0.5 }}>PLAYER</span>
            <span style={{ fontSize: 9, color: T.accent, fontWeight: 800, textAlign: 'center', letterSpacing: 0.5 }}>RUNS</span>
            <span style={{ fontSize: 9, color: T.red,    fontWeight: 800, textAlign: 'center', letterSpacing: 0.5 }}>WKTS</span>
            <span style={{ fontSize: 9, color: T.sky,    fontWeight: 800, textAlign: 'center', letterSpacing: 0.5 }}>SR</span>
            <span style={{ fontSize: 9, color: T.gold,   fontWeight: 800, textAlign: 'right',  letterSpacing: 0.5 }}>PTS</span>
          </div>
          {ranked.map((pl, idx) => {
            const totalRuns  = pl.bat.reduce((s, b) => s + (b.runs || 0), 0)
            const totalBalls = pl.bat.reduce((s, b) => s + (b.balls || 0), 0)
            const totalWkts  = pl.bowl.reduce((s, b) => s + (b.wickets || 0), 0)
            const sr         = totalBalls > 0 ? (totalRuns / totalBalls * 100).toFixed(0) : '—'
            const pct        = (pl.pts / maxPts) * 100
            const isTop      = idx === 0 && pl.pts > 0
            const medal      = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null

            return (
              <div key={pl.name}
                onClick={() => onPlayerTap?.(pl.name)}
                style={{ borderBottom: `1px solid ${T.border2}`, cursor: onPlayerTap ? 'pointer' : 'default', background: isTop ? 'rgba(245,158,11,0.04)' : 'transparent' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 44px 36px 40px', padding: '10px 14px 4px', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{medal || <span style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{idx + 1}</span>}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</div>
                    <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{pl.team}</div>
                  </div>
                  <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 15, fontWeight: 700, color: T.accent, textAlign: 'center' }}>{totalRuns}</span>
                  <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 15, fontWeight: 700, color: T.red, textAlign: 'center' }}>{totalWkts || '—'}</span>
                  <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 13, fontWeight: 600, color: T.subtext, textAlign: 'center' }}>{sr}</span>
                  <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 800, color: isTop ? T.gold : T.text2, textAlign: 'right' }}>{pl.pts}</span>
                </div>
                {/* Pts bar */}
                <div style={{ margin: '2px 14px 8px', height: 3, background: T.border2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: isTop ? T.gold : T.accent, width: `${pct}%`, opacity: 0.7 }} />
                </div>
                {/* Innings breakdown */}
                <div style={{ display: 'flex', gap: 6, padding: '0 14px 8px', flexWrap: 'wrap' }}>
                  {pl.bat.map((b, i) => (
                    <span key={i} style={{ fontSize: 10, color: T.subtext, background: T.border2, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                      Inn{b.innings}: <span style={{ color: T.accent, fontWeight: 800 }}>{b.runs}({b.balls})</span>{b.sixes > 0 ? ` · ${b.sixes}×6` : ''}{b.fours > 0 ? ` · ${b.fours}×4` : ''}
                    </span>
                  ))}
                  {pl.bowl.map((b, i) => (
                    <span key={`bowl-${i}`} style={{ fontSize: 10, color: T.subtext, background: T.border2, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                      Bowl: <span style={{ color: T.orange, fontWeight: 800 }}>{b.wickets}W-{b.runs}R</span> ({fmtOvers(b.balls || 0)}ov)
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          {/* Points system legend */}
          <div style={{ padding: '10px 14px', background: T.surface, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, color: T.muted, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>POINTS SYSTEM</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '1 run = 1 pt' }, { label: '50+ = +8' }, { label: '100+ = +16' },
                { label: '6 = +2' }, { label: '4 = +1' }, { label: 'Wicket = +25' },
                { label: '3W = +8' }, { label: '5W = +16' }, { label: 'Eco <6 = +6' },
              ].map(l => (
                <span key={l.label} style={{ fontSize: 9, color: T.muted, background: T.border2, borderRadius: 4, padding: '2px 6px' }}>{l.label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BallByBallTab ────────────────────────────────────────────────────────────
function BallByBallTab({ match, onPlayerTap }) {
  const [activeInn, setActiveInn] = useState(
    match.status === 'innings2' || match.status === 'completed' ? 'innings2' : 'innings1'
  )

  const has2 = match.status === 'innings2' || match.status === 'completed'

  // Build over groups from ballByBall array
  const buildOvers = (inn) => {
    if (!inn?.ballByBall?.length) return []
    const overs = []
    let currentOver = []
    let legalCount  = 0
    let overIndex   = 0
    let overRuns    = 0
    let overWkts    = 0
    let cumRuns     = 0
    let cumWkts     = 0

    inn.ballByBall.forEach((ball) => {
      currentOver.push(ball)
      overRuns += ball.runs || 0
      if (ball.isWicket) overWkts++

      if (!ball.isWide && !ball.isNoBall) {
        legalCount++
        if (legalCount % 6 === 0) {
          cumRuns += overRuns
          cumWkts += overWkts
          overs.push({
            overNum:    overIndex + 1,
            balls:      [...currentOver],
            runs:       overRuns,
            wickets:    overWkts,
            cumScore:   cumRuns,
            cumWickets: cumWkts,
          })
          currentOver = []
          overRuns    = 0
          overWkts    = 0
          overIndex++
        }
      }
    })

    // Incomplete / current over
    if (currentOver.length > 0) {
      cumRuns += overRuns
      cumWkts += overWkts
      overs.push({
        overNum:    overIndex + 1,
        balls:      currentOver,
        runs:       overRuns,
        wickets:    overWkts,
        cumScore:   cumRuns,
        cumWickets: cumWkts,
        incomplete: true,
      })
    }

    return overs
  }

  const ballLabel = (b) => {
    if (b.isWicket)      return 'W'
    if (b.isWide)        return b.runs > 1 ? `Wd+${b.runs - 1}` : 'Wd'
    if (b.isNoBall)      return b.runs > 0 ? `NB+${b.runs}`     : 'NB'
    if (b.runs === 0)    return '·'
    return String(b.runs)
  }

  const ballBg = (b) => {
    if (b.isWicket)      return { bg: '#7f1d1d', color: T.red, border: '#ff6b6b44' }
    if (b.isWide)        return { bg: '#1e3a5f', color: T.sky, border: '#60a5fa44' }
    if (b.isNoBall)      return { bg: '#3b1f00', color: T.orange, border: '#fb923c44' }
    if (b.runs === 6)    return { bg: T.purpleDim, color: T.purple, border: '#c084fc44' }
    if (b.runs === 4)    return { bg: T.accentDim, color: T.accent, border: '#4ade8044' }
    if (b.runs === 0)    return { bg: '#141414', color: '#444',    border: '#33333388' }
    return               { bg: '#1e1e1e',    color: '#aaa',    border: '#33333388' }
  }

  const renderInnings = (key) => {
    const inn   = match[key]
    const overs = buildOvers(inn)

    if (!overs.length) return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
        No balls bowled yet
      </div>
    )

    return (
      <div style={{ paddingBottom: 20 }}>
        {/* Innings summary strip */}
        <div style={{ padding: '10px 14px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: T.subtext, fontWeight: 700 }}>{inn.battingTeam}</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
              {inn.runs}/{inn.wickets}
              <span style={{ fontSize: 13, color: T.subtext, marginLeft: 8, fontFamily: 'Nunito,sans-serif', fontWeight: 600 }}>
                ({fmtOvers(inn.balls)} ov)
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: T.subtext, fontWeight: 700, letterSpacing: 1 }}>TOTAL BALLS</div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: T.text }}>
              {inn.ballByBall?.length || 0}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, padding: '8px 14px', flexWrap: 'wrap', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          {[
            { label: '·  Dot',   bg: '#141414', color: '#666' },
            { label: '4  Four',  bg: T.accentDim, color: T.accent },
            { label: '6  Six',   bg: T.purpleDim, color: T.purple },
            { label: 'W  Wicket',bg: '#7f1d1d', color: T.red },
            { label: 'Wd Wide',  bg: '#1e3a5f', color: T.sky },
            { label: 'NB NoBall',bg: '#3b1f00', color: T.orange },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: l.bg, border: `1px solid ${l.color}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: l.color, fontWeight: 800 }}>
                {l.label.split(' ')[0]}
              </span>
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{l.label.split(' ')[1]}</span>
            </div>
          ))}
        </div>

        {/* Over rows */}
        {overs.map((ov) => (
          <div key={ov.overNum} style={{ borderBottom: `1px solid ${T.border2}` }}>
            {/* Over header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 6px', background: T.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 14, fontWeight: 700, color: T.text2, minWidth: 52 }}>
                  Over {ov.overNum}{ov.incomplete ? ' *' : ''}
                </span>
                {/* bowler name from last ball of over */}
                {ov.balls[ov.balls.length - 1]?.bowlerName && (
                  <span style={{ fontSize: 11, color: T.orange, fontWeight: 700 }}>
                    {ov.balls[ov.balls.length - 1].bowlerName}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: T.subtext, fontWeight: 700 }}>
                    {ov.runs} runs{ov.wickets > 0 ? ` · ${ov.wickets}W` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.text2, fontFamily: 'Rajdhani,sans-serif', fontWeight: 700 }}>
                  {ov.cumScore}/{ov.cumWickets}
                </div>
              </div>
            </div>

            {/* Ball-by-ball row */}
            <div style={{ padding: '6px 14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ov.balls.map((ball, bi) => {
                const { bg, color, border } = ballBg(ball)
                const label = ballLabel(ball)
                return (
                  <div
                    key={bi}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 10,
                      background: ball.isWicket ? 'rgba(127,29,29,0.15)' : ball.runs >= 4 ? bg + '18' : 'transparent',
                      border: `1px solid ${ball.isWicket || ball.runs >= 4 || ball.isWide || ball.isNoBall ? border : 'transparent'}`,
                    }}
                  >
                    {/* Ball dot */}
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: bg, border: `1.5px solid ${color}55`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: label.length > 2 ? 8 : 11, fontWeight: 800, color,
                    }}>{label}</span>

                    {/* Ball detail */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {ball.batsmanName && (
                          <span
                            onClick={() => onPlayerTap?.(ball.batsmanName)}
                            style={{ fontSize: 13, color: T.text, fontWeight: 700, cursor: 'pointer', borderBottom: '1px dotted T.border' }}
                          >
                            {ball.batsmanName}
                          </span>
                        )}
                        {ball.isWicket && (
                          <span style={{ fontSize: 10, color: T.red, fontWeight: 800, background: 'rgba(255,107,107,0.12)', padding: '1px 6px', borderRadius: 4, letterSpacing: 0.5 }}>
                            OUT · {ball.wicketType || 'Wicket'}
                          </span>
                        )}
                        {ball.isWide && (
                          <span style={{ fontSize: 10, color: T.sky, fontWeight: 800, background: 'rgba(96,165,250,0.1)', padding: '1px 6px', borderRadius: 4 }}>WIDE</span>
                        )}
                        {ball.isNoBall && (
                          <span style={{ fontSize: 10, color: T.orange, fontWeight: 800, background: 'rgba(251,146,60,0.1)', padding: '1px 6px', borderRadius: 4 }}>NO BALL</span>
                        )}
                        {ball.runs === 4 && !ball.isWide && !ball.isNoBall && (
                          <span style={{ fontSize: 10, color: T.accent, fontWeight: 800, background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 4 }}>FOUR</span>
                        )}
                        {ball.runs === 6 && !ball.isWide && !ball.isNoBall && (
                          <span style={{ fontSize: 10, color: T.purple, fontWeight: 800, background: 'rgba(192,132,252,0.1)', padding: '1px 6px', borderRadius: 4 }}>SIX</span>
                        )}
                      </div>
                      {ball.bowlerName && (
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                          b. <span onClick={() => onPlayerTap?.(ball.bowlerName)} style={{ cursor: 'pointer', borderBottom: '1px dotted T.muted' }}>{ball.bowlerName}</span>
                        </div>
                      )}
                    </div>

                    {/* Runs on right */}
                    <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color, flexShrink: 0, minWidth: 22, textAlign: 'right' }}>
                      {ball.isWicket ? '💀' : ball.runs > 0 ? ball.runs : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.surface }}>
      {/* Live / Result banner */}
      {match.status === 'completed' && match.result && (
        <div style={{ background: '#1b5e20', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🏆</span>
          <span style={{ fontSize: 13, color: '#a5d6a7', fontWeight: 700 }}>{match.result}</span>
        </div>
      )}

      {/* Innings switcher */}
      {has2 ? (
        <div style={{ display: 'flex', background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {[
            { key: 'innings1', label: match.innings1?.battingTeam || '1st Innings' },
            { key: 'innings2', label: match.innings2?.battingTeam || '2nd Innings' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveInn(t.key)} style={{
              flex: 1, padding: '12px 8px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 800,
              color: activeInn === t.key ? T.red : T.subtext,
              borderBottom: `3px solid ${activeInn === t.key ? T.red : 'transparent'}`,
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '10px 14px', background: T.card, borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>
            {match.innings1?.battingTeam || '1st Innings'}
          </span>
        </div>
      )}

      {renderInnings(has2 ? activeInn : 'innings1')}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Scoring() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const [match,   setMatch]    = useState(null)
  const [tab,     setTab]      = useState('scoring')
  const [loading, setLoading]  = useState(false)
  const [fetching,setFetching] = useState(true)
  const [error,   setError]    = useState('')
  const [allPlayers, setAllPlayers] = useState([])
  const [allPlayersData, setAllPlayersData] = useState([])
  const [profilePlayer, setProfilePlayer] = useState(null)

  const token   = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchMatch = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/matches/${id}`, { headers })
      setMatch(data)
    } catch { setError('Failed to load match') }
    finally { setFetching(false) }
  }, [id])

  useEffect(() => { fetchMatch() }, [fetchMatch])

  // Fetch player registry for picker suggestions
  useEffect(() => {
    axios.get('/api/players', { headers })
      .then(r => {
        const data = r.data || []
        setAllPlayersData(data)
        setAllPlayers(data.map(p => p.name))
      })
      .catch(() => {})
  }, [])

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

  const handleUpdateOvers = async (n) => {
    try {
      setLoading(true)
      const { data } = await axios.put(`/api/matches/${id}`, { ...match, overs: n }, { headers })
      setMatch(data)
    } catch { alert('Failed to update overs') }
    finally { setLoading(false) }
  }

  if (fetching) return (
    <div style={{ minHeight: '100vh', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: T.red, fontFamily: 'Rajdhani,sans-serif', fontSize: 20 }}>Loading match…</div>
    </div>
  )
  if (error) return (
    <div style={{ minHeight: '100vh', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: T.red, fontSize: 16 }}>{error}</div>
      <button onClick={() => navigate('/')} style={{ padding: '10px 24px', background: T.redDim, border: 'none', borderRadius: 10, color: T.text, fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
    </div>
  )
  if (!match) return null

  const tabs = [
    { key: 'scoring',    icon: '🏏', label: 'Scoring'   },
    { key: 'scorecard',  icon: '📋', label: 'Scorecard' },
    { key: 'ballbyball', icon: '🎯', label: 'Ball×Ball' },
    { key: 'points',     icon: '📊', label: 'Points'    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:${T.bg}; font-family:'Nunito',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.bg}; }
        ::-webkit-scrollbar-thumb { background:${T.muted}; border-radius:2px; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .slide-up { animation: slideUp 0.2s ease; }
      `}</style>

      {/* Global Profile Modal (for scorecard / ballbyball taps) */}
      <PlayerProfileModal
        open={!!profilePlayer} onClose={() => setProfilePlayer(null)}
        playerName={profilePlayer} match={match} allPlayersData={allPlayersData}
      />

      <div style={{ minHeight: '100vh', width: '100%', background: T.bg, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, minHeight: '100vh', background: T.surface, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px 12px', flexShrink: 0, background: `linear-gradient(180deg,${T.card} 0%,${T.surface} 100%)`, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => navigate('/')} style={{ width: 34, height: 34, borderRadius: 9, background: T.border, border: `1px solid ${T.border}`, color: T.text2, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
              <div>
                <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: 1 }}>
                  {match.team1} <span style={{ color: T.accent, fontSize: 14 }}>vs</span> {match.team2}
                </div>
                <div style={{ fontSize: 10, color: T.subtext, fontWeight: 700 }}>
                  {match.overs} overs · {match.status === 'completed' ? '✅ Completed' : '🟢 Live'}
                </div>
              </div>
            </div>
            <button onClick={handleUndo} style={{ padding: '6px 12px', borderRadius: 8, background: T.border2, border: `1px solid ${T.border}`, color: T.text2, fontFamily: 'Rajdhani,sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>UNDO</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: tab !== 'scoring' ? 'auto' : 'visible', minHeight: 0 }}>
            {tab === 'scoring'    && <ScoringTab match={match} allPlayers={allPlayers} allPlayersData={allPlayersData} onBall={handleBall} onUndo={handleUndo} onEndInnings={handleEndInnings} onUpdateOvers={handleUpdateOvers} loading={loading} />}
            {tab === 'scorecard'  && <ScorecardTab match={match} allPlayersData={allPlayersData} onPlayerTap={setProfilePlayer} />}
            {tab === 'ballbyball' && <BallByBallTab match={match} onPlayerTap={setProfilePlayer} />}
            {tab === 'points'     && <PointsTab match={match} onPlayerTap={setProfilePlayer} />}
          </div>

          {/* Bottom nav */}
          <div style={{ flexShrink: 0, display: 'flex', background: T.card, borderTop: `1px solid ${T.border}`, paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', transition: 'all 0.15s' }}>
                {tab === t.key && (
                  <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: `linear-gradient(90deg,${T.accent},${T.sky})`, borderRadius: '0 0 2px 2px' }} />
                )}
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: tab === t.key ? T.accent : T.muted, transition: 'color 0.15s' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
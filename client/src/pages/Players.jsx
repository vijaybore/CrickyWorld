import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API   = '/api/players'
const tok   = () => localStorage.getItem('token')
const H     = () => ({ Authorization: `Bearer ${tok()}` })
const fmtOv = b => `${Math.floor(b / 6)}.${b % 6}`

// ── Derived stats ─────────────────────────────────────────────────────────────
function derive(p) {
  return {
    batAvg:  p.timesOut > 0         ? (p.totalRuns / p.timesOut).toFixed(1)             : p.totalRuns > 0 ? `${p.totalRuns}*` : '—',
    batSR:   p.totalBallsFaced > 0  ? (p.totalRuns / p.totalBallsFaced * 100).toFixed(1): '—',
    eco:     p.totalBallsBowled > 0 ? (p.totalRunsConceded / (p.totalBallsBowled/6)).toFixed(2) : '—',
    bowlAvg: p.totalWickets > 0     ? (p.totalRunsConceded / p.totalWickets).toFixed(1) : '—',
    bowlSR:  p.totalWickets > 0     ? (p.totalBallsBowled / p.totalWickets).toFixed(1)  : '—',
    bestFig: p.bestBowlingW > 0     ? `${p.bestBowlingW}/${p.bestBowlingR}`             : '—',
    overs:   fmtOv(p.totalBallsBowled || 0),
  }
}

const ROLES      = ['batsman', 'bowler', 'allrounder', 'wk-batsman']
const ROLE_ICON  = { batsman:'🏏', bowler:'🎳', allrounder:'⭐', 'wk-batsman':'🧤' }
const ROLE_COLOR = { batsman:'#60a5fa', bowler:'#f87171', allrounder:'#facc15', 'wk-batsman':'#a78bfa' }
const ROLE_LABEL = { batsman:'Batsman', bowler:'Bowler', allrounder:'All-Rounder', 'wk-batsman':'WK-Batsman' }
const BG_COLORS  = ['#7f1d1d','#1e3a5f','#064e3b','#78350f','#3b0764','#134e4a']

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ player, size = 52 }) {
  const initials = (player.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const bg       = BG_COLORS[(player.name?.charCodeAt(0) || 0) % BG_COLORS.length]
  const rc       = ROLE_COLOR[player.role] || 'var(--muted)'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden', border: `2px solid ${rc}`,
    }}>
      {player.photoUrl
        ? <img src={player.photoUrl} alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{
            width: '100%', height: '100%', background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Rajdhani,sans-serif', fontSize: size * 0.36,
            fontWeight: 700, color: 'var(--text)',
          }}>{initials}</div>
      }
    </div>
  )
}

// ── Photo picker / uploader ───────────────────────────────────────────────────
function PhotoPicker({ current, onUpload, allPlayers = [] }) {
  const fileRef = useRef()
  const [busy,        setBusy]        = useState(false)
  const [showGallery, setShowGallery] = useState(false)

  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await axios.post(`${API}/upload`, fd, {
        headers: { ...H(), 'Content-Type': 'multipart/form-data' },
      })
      onUpload(data.url)
      setShowGallery(false)
    } catch { alert('Upload failed') }
    finally { setBusy(false) }
  }

  // Existing photos from other players (deduplicated, non-empty)
  const existingPhotos = [...new Set(
    allPlayers.map(p => p.photoUrl).filter(u => u && u !== current)
  )]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* preview circle */}
      <div onClick={() => setShowGallery(s => !s)}
        style={{
          width: 90, height: 90, borderRadius: '50%', cursor: 'pointer',
          border: showGallery ? '2px solid var(--accent)' : '2px dashed #3a3a3a',
          overflow: 'hidden', background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'border-color 0.15s',
        }}>
        {busy
          ? <div style={{ fontSize: 11, color: 'var(--subtext)' }}>…</div>
          : current
            ? <img src={current} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>📷</div>
                <div style={{ fontSize: 9, color: 'var(--subtext)', fontWeight: 700, marginTop: 2 }}>PHOTO</div>
              </div>
        }
      </div>

      {/* action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: 'var(--header)', border: '1px solid #333', color: 'var(--subtext)' }}>
          📤 Upload
        </button>
        {existingPhotos.length > 0 && (
          <button onClick={() => setShowGallery(s => !s)}
            style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: showGallery ? 'rgba(255,68,68,0.15)' : 'var(--header)', border: showGallery ? '1px solid rgba(255,68,68,0.4)' : '1px solid #333', color: showGallery ? 'var(--accent)' : 'var(--subtext)' }}>
            🖼 Existing
          </button>
        )}
        {current && (
          <button onClick={() => onUpload('')}
            style={{ padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: 'var(--header)', border: '1px solid #333', color: 'var(--subtext)' }}>
            ✕
          </button>
        )}
      </div>

      {/* existing photos gallery */}
      {showGallery && existingPhotos.length > 0 && (
        <div style={{
          width: '100%', background: 'var(--surface)', border: '1px solid #2a2a2a',
          borderRadius: 12, padding: 10, marginTop: 2,
        }}>
          <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>SELECT EXISTING PHOTO</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {existingPhotos.map((url, i) => (
              <div key={i} onClick={() => { onUpload(url); setShowGallery(false) }}
                style={{
                  width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
                  border: current === url ? '2px solid var(--accent)' : '2px solid #2a2a2a',
                  transition: 'border-color 0.13s', flexShrink: 0,
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={e  => e.currentTarget.style.borderColor = current === url ? 'var(--accent)' : 'var(--muted)'}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────
const Chip = ({ label, active, color = 'var(--accent)', onClick }) => (
  <button onClick={onClick} style={{
    padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 800, flexShrink: 0,
    background: active ? color + '22' : 'var(--header)',
    color:      active ? color : 'var(--subtext)',
    outline:    active ? `1px solid ${color}55` : 'none',
    transition: 'all 0.15s',
  }}>{label}</button>
)

const FieldInput = ({ label, ...props }) => (
  <div style={{ marginBottom: 13 }}>
    {label && <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>{label}</div>}
    <input {...props} style={{
      width: '100%', background: 'var(--surface)', border: '1px solid #2a2a2a',
      borderRadius: 9, padding: '10px 12px', color: 'var(--text)', fontSize: 13,
      outline: 'none', boxSizing: 'border-box', ...props.style
    }} />
  </div>
)

// ── STAT GRID (Cricbuzz-style table rows) ─────────────────────────────────────
function StatTable({ rows }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '11px 14px',
          background: i % 2 === 0 ? 'var(--card)' : 'var(--header)',
          borderBottom: i < rows.length - 1 ? '1px solid var(--border2)' : 'none',
        }}>
          <div style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 700 }}>{row.label}</div>
          <div style={{
            fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700,
            color: row.color || 'var(--text)',
          }}>{row.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}

// ── PLAYER PROFILE SHEET ──────────────────────────────────────────────────────
function ProfileSheet({ player, onClose, onUpdated, onDeleted, allPlayers = [] }) {
  const [tab,     setTab]     = useState('batting')
  const [editing, setEditing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [form,    setForm]    = useState({
    name:         player.name,
    photoUrl:     player.photoUrl     || '',
    role:         player.role         || 'allrounder',
    jerseyNumber: player.jerseyNumber || '',
    battingStyle: player.battingStyle || '',
    bowlingStyle: player.bowlingStyle || '',
  })

  const d  = derive(player)
  const rc = ROLE_COLOR[player.role] || 'var(--subtext)'

  const save = async () => {
    try {
      const { data } = await axios.patch(`${API}/${player._id}`, form, { headers: H() })
      onUpdated(data); setEditing(false)
    } catch { alert('Save failed') }
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const { data } = await axios.post(`${API}/${player._id}/sync`, {}, { headers: H() })
      onUpdated(data)
    } catch { alert('Sync failed') }
    finally { setSyncing(false) }
  }

  const del = async () => {
    if (!window.confirm(`Delete ${player.name}?`)) return
    await axios.delete(`${API}/${player._id}`, { headers: H() })
    onDeleted(player._id)
  }

  const battingRows = [
    { label: 'Matches',       value: player.totalMatches,    color: 'var(--text)' },
    { label: 'Runs',          value: player.totalRuns,       color: 'var(--accent)' },
    { label: 'Highest Score', value: player.highestScore,    color: 'var(--accent)' },
    { label: 'Average',       value: d.batAvg,               color: '#60a5fa' },
    { label: 'Strike Rate',   value: d.batSR,                color: '#facc15' },
    { label: 'Balls Faced',   value: player.totalBallsFaced, color: 'var(--subtext)'    },
    { label: 'Fours (4s)',    value: player.totalFours,      color: '#4ade80' },
    { label: 'Sixes (6s)',    value: player.totalSixes,      color: '#c084fc' },
    { label: 'Half Centuries',value: player.totalFifties,    color: '#fb923c' },
    { label: 'Centuries',     value: player.totalHundreds,   color: '#facc15' },
    { label: 'Dismissals',    value: player.timesOut,        color: '#f87171' },
  ]

  const bowlingRows = [
    { label: 'Matches',        value: player.totalMatches,       color: 'var(--text)' },
    { label: 'Wickets',        value: player.totalWickets,       color: '#c084fc' },
    { label: 'Best Figures',   value: d.bestFig,                 color: 'var(--accent)' },
    { label: 'Economy',        value: d.eco,                     color: '#4ade80' },
    { label: 'Average',        value: d.bowlAvg,                 color: '#60a5fa' },
    { label: 'Strike Rate',    value: d.bowlSR,                  color: '#38bdf8' },
    { label: 'Overs Bowled',   value: d.overs,                   color: 'var(--subtext)'    },
    { label: 'Runs Conceded',  value: player.totalRunsConceded,  color: '#f87171' },
    { label: 'Dot Balls',      value: player.totalDotBalls,      color: '#a3e635' },
    { label: 'Wides',          value: player.totalWides,         color: '#fb923c' },
    { label: '5-Wicket Hauls', value: player.fiveWickets,        color: 'var(--accent)' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} onClick={onClose} />

      {/* sheet */}
      <div style={{
        position: 'relative', background: 'var(--bg)', borderRadius: '22px 22px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid var(--border)',
        boxShadow: '0 -12px 48px rgba(0,0,0,0.8)',
      }}>
        {/* handle */}
        <div style={{ width: 36, height: 4, background: '#2e2e2e', borderRadius: 2, margin: '12px auto 0' }} />

        {/* ── TOP BAR ── */}
        <div style={{
          padding: '14px 16px 12px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--subtext)' }}>
            {editing ? 'Edit Player' : 'Player Profile'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && (
              <>
                <button onClick={() => setEditing(true)}
                  style={{ padding: '7px 13px', borderRadius: 9, background: 'var(--border)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ✎ Edit
                </button>
                <button onClick={sync} disabled={syncing}
                  style={{ padding: '7px 13px', borderRadius: 9, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {syncing ? '…' : '↻ Sync'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── EDIT FORM ── */}
        {editing && (
          <div style={{ padding: '16px 16px 24px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <PhotoPicker current={form.photoUrl} onUpload={url => setForm(f => ({ ...f, photoUrl: url }))} allPlayers={allPlayers} />
              <div style={{ flex: 1 }}>
                <FieldInput label="PLAYER NAME" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <FieldInput label="JERSEY #" value={form.jerseyNumber} placeholder="e.g. 18"
                  onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} />
              </div>
            </div>

            {/* role selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>ROLE</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ROLES.map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    style={{
                      padding: '7px 13px', borderRadius: 9, cursor: 'pointer', fontSize: 11, fontWeight: 800,
                      background: form.role === r ? ROLE_COLOR[r] + '22' : 'var(--card)',
                      border: `1px solid ${form.role === r ? ROLE_COLOR[r] : 'var(--muted)'}`,
                      color: form.role === r ? ROLE_COLOR[r] : 'var(--subtext)',
                    }}>
                    {ROLE_ICON[r]} {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <FieldInput label="BATTING STYLE" value={form.battingStyle} placeholder="e.g. Right-hand bat"
              onChange={e => setForm(f => ({ ...f, battingStyle: e.target.value }))} />
            <FieldInput label="BOWLING STYLE" value={form.bowlingStyle} placeholder="e.g. Right-arm fast-medium"
              onChange={e => setForm(f => ({ ...f, bowlingStyle: e.target.value }))} />

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => setEditing(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--card)', border: '1px solid #2a2a2a', color: 'var(--subtext)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={!form.name.trim()}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', color: 'var(--text)', fontWeight: 800, fontSize: 13, cursor: 'pointer', background:'linear-gradient(135deg,var(--accent2),var(--accent))' }}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ── PROFILE VIEW ── */}
        {!editing && (
          <>
            {/* player hero */}
            <div style={{
              padding: '20px 18px 16px',
              background: 'linear-gradient(180deg, #1e1010 0%, #141414 100%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <Avatar player={player} size={76} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700, color: '#f5f5f5', lineHeight: 1 }}>
                    {player.name}
                  </div>
                  {player.jerseyNumber && (
                    <div style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 800 }}>#{player.jerseyNumber}</div>
                  )}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: rc + '18', border: `1px solid ${rc}33`,
                  borderRadius: 20, padding: '4px 10px', marginBottom: 6,
                  fontSize: 11, fontWeight: 800, color: rc,
                }}>
                  {ROLE_ICON[player.role]} {ROLE_LABEL[player.role] || player.role}
                </div>
                {(player.battingStyle || player.bowlingStyle) && (
                  <div style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600, lineHeight: 1.5 }}>
                    {player.battingStyle && <span>🏏 {player.battingStyle}</span>}
                    {player.battingStyle && player.bowlingStyle && <span style={{ margin: '0 6px', color: 'var(--text2)' }}>·</span>}
                    {player.bowlingStyle && <span>🎳 {player.bowlingStyle}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* headline 3-stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'MATCHES', value: player.totalMatches,  color: 'var(--text)' },
                { label: 'RUNS',    value: player.totalRuns,     color: 'var(--accent)' },
                { label: 'WICKETS', value: player.totalWickets,  color: '#c084fc' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  padding: '14px 6px', textAlign: 'center',
                  borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* stat tabs */}
            <div style={{ padding: '12px 14px 0' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <Chip label="🏏 Batting" active={tab === 'batting'} onClick={() => setTab('batting')} />
                <Chip label="🎳 Bowling" active={tab === 'bowling'} color="#c084fc" onClick={() => setTab('bowling')} />
              </div>

              {/* stat table — Cricbuzz style alternating rows */}
              <StatTable rows={tab === 'batting' ? battingRows : bowlingRows} />

              {/* sync note */}
              <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center', padding: '10px 0 4px', fontWeight: 600 }}>
                Tap ↻ Sync to refresh stats from all completed matches
              </div>

              {/* delete */}
              <div style={{ paddingBottom: 32, marginTop: 10 }}>
                <button onClick={del}
                  style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'transparent', border: '1px solid rgba(255,68,68,0.2)', color: 'var(--accent)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                  🗑 Delete Player
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── PLAYER CARD (list item) ───────────────────────────────────────────────────
function PlayerCard({ player, onClick }) {
  const d    = derive(player)
  const rc   = ROLE_COLOR[player.role] || 'var(--subtext)'
  const hasBat  = player.totalRuns > 0 || player.totalBallsFaced > 0
  const hasBowl = player.totalWickets > 0 || player.totalBallsBowled > 0

  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
        transition: 'border-color 0.14s, background 0.14s',
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accentRing)'; e.currentTarget.style.background = 'var(--header)' }}
      onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}>

      <Avatar player={player} size={48} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </div>
          {player.jerseyNumber && <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800 }}>#{player.jerseyNumber}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: rc, background: rc + '15', padding: '2px 8px', borderRadius: 20 }}>
            {ROLE_ICON[player.role]} {ROLE_LABEL[player.role] || player.role}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{player.totalMatches}M</span>
        </div>
      </div>

      {/* quick stats */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {hasBat && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{player.totalRuns}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 800 }}>RUNS</div>
          </div>
        )}
        {hasBowl && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: '#c084fc', lineHeight: 1 }}>{player.totalWickets}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 800 }}>WKTS</div>
          </div>
        )}
        <span style={{ color: '#2e2e2e', fontSize: 18 }}>›</span>
      </div>
    </div>
  )
}

// ── ADD PLAYER FORM ───────────────────────────────────────────────────────────
function AddForm({ onCreated, onCancel, allPlayers = [] }) {
  const [form,   setForm]   = useState({ name: '', role: 'allrounder', jerseyNumber: '', battingStyle: '', bowlingStyle: '', photoUrl: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data } = await axios.post(API, form, { headers: H() })
      onCreated(data)
    } catch { alert('Failed to create player') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>New Player</div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 4 }}>
        <PhotoPicker current={form.photoUrl} onUpload={url => setForm(f => ({ ...f, photoUrl: url }))} allPlayers={allPlayers} />
        <div style={{ flex: 1 }}>
          <FieldInput label="NAME *" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Player name" />
          <FieldInput label="JERSEY #" value={form.jerseyNumber} placeholder="Optional"
            onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} />
        </div>
      </div>

      {/* role */}
      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginBottom: 7 }}>ROLE</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
              style={{
                padding: '7px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 11, fontWeight: 800,
                background: form.role === r ? ROLE_COLOR[r] + '22' : 'var(--surface)',
                border: `1px solid ${form.role === r ? ROLE_COLOR[r] : 'var(--muted)'}`,
                color:  form.role === r ? ROLE_COLOR[r] : 'var(--subtext)',
              }}>
              {ROLE_ICON[r]} {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <FieldInput label="BATTING STYLE" value={form.battingStyle} placeholder="e.g. Right-hand bat"
        onChange={e => setForm(f => ({ ...f, battingStyle: e.target.value }))} />
      <FieldInput label="BOWLING STYLE" value={form.bowlingStyle} placeholder="e.g. Right-arm medium"
        onChange={e => setForm(f => ({ ...f, bowlingStyle: e.target.value }))} />

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid #2a2a2a', color: 'var(--subtext)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={save} disabled={!form.name.trim() || saving}
          style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: form.name.trim() ? 'linear-gradient(135deg,#cc0000,#ff4444)' : '#222',
            color: form.name.trim() ? 'var(--text)' : 'var(--muted)',
          }}>
          {saving ? 'Saving…' : '+ Add Player'}
        </button>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'runs',    label: 'Runs',    fn: (a,b) => b.totalRuns - a.totalRuns },
  { key: 'wickets', label: 'Wickets', fn: (a,b) => b.totalWickets - a.totalWickets },
  { key: 'matches', label: 'Matches', fn: (a,b) => b.totalMatches - a.totalMatches },
  { key: 'name',    label: 'A–Z',     fn: (a,b) => a.name.localeCompare(b.name) },
]

export default function Players() {
  const navigate = useNavigate()
  const [players,  setPlayers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleF,    setRoleF]    = useState('all')
  const [sortBy,   setSortBy]   = useState('runs')
  const [adding,   setAdding]   = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(API, { headers: H() })
      .then(r => setPlayers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sorted = players
    .filter(p => roleF === 'all' || p.role === roleF)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort(SORT_OPTIONS.find(s => s.key === sortBy).fn)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:var(--bg,#0a0a0a); font-family:'Nunito',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:var(--surface); }
        ::-webkit-scrollbar-thumb { background:var(--muted); border-radius:2px; }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:500, minHeight:'100vh', background:'var(--surface)', display:'flex', flexDirection:'column' }}>

          {/* ── HEADER ── */}
          <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ padding:'14px 14px 10px', display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={() => navigate('/')}
                style={{ width:34, height:34, borderRadius:9, background:'var(--border)', border:'1px solid var(--border)', color:'var(--subtext)', fontSize:16, cursor:'pointer', flexShrink:0 }}>←</button>
              <div style={{ flex:1, fontFamily:'Rajdhani,sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:1 }}>👤 Players</div>
              <button onClick={() => setAdding(a => !a)}
                style={{ padding:'8px 16px', borderRadius:10, fontWeight:800, fontSize:13, cursor:'pointer', border:'none',
                  background: adding ? 'var(--header)' : 'linear-gradient(135deg,#cc0000,#ff4444)',
                  color: adding ? 'var(--subtext)' : 'var(--text)',
                  outline: adding ? '1px solid #2a2a2a' : 'none' }}>
                {adding ? '✕ Cancel' : '+ Add'}
              </button>
            </div>

            {/* summary strip */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderTop:'1px solid var(--border2)' }}>
              {[
                { label:'PLAYERS',  value: players.length,                             color:'#60a5fa' },
                { label:'RUNS',     value: players.reduce((s,p)=>s+p.totalRuns,0),    color:'var(--accent)' },
                { label:'WICKETS',  value: players.reduce((s,p)=>s+p.totalWickets,0), color:'#c084fc' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding:'9px 6px', textAlign:'center', borderRight: i<2?'1px solid var(--border2)':'none' }}>
                  <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:9, color:'var(--muted)', fontWeight:800, letterSpacing:0.8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* search bar */}
            <div style={{ padding:'10px 12px 0' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search player..."
                style={{ width:'100%', background:'var(--surface)', border:'1px solid #252525', borderRadius:10, padding:'10px 14px', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 }} />

              {/* filter + sort chips */}
              <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:10 }}>
                {[{key:'all',label:'All'}, ...ROLES.map(r=>({key:r,label:`${ROLE_ICON[r]} ${ROLE_LABEL[r]}`}))].map(r => (
                  <Chip key={r.key} label={r.label} active={roleF===r.key}
                    onClick={() => setRoleF(r.key)} />
                ))}
                <div style={{ width:1, background:'var(--muted)', flexShrink:0, margin:'4px 4px' }}/>
                {SORT_OPTIONS.map(s => (
                  <Chip key={s.key} label={s.label} active={sortBy===s.key}
                    color="#facc15" onClick={() => setSortBy(s.key)} />
                ))}
              </div>
            </div>
          </div>

          {/* ── LIST ── */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 80px' }}>
            {adding && (
              <AddForm
                onCreated={p => { setPlayers(ps => [p, ...ps]); setAdding(false) }}
                onCancel={() => setAdding(false)}
                allPlayers={players}
              />
            )}

            {loading ? (
              <div style={{ textAlign:'center', padding:60, color:'var(--subtext)' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>👤</div>Loading players…
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
                <div style={{ fontSize:14, color:'var(--subtext)', fontWeight:700, marginBottom:4 }}>
                  {players.length === 0 ? 'No players yet' : 'No matches found'}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  {players.length === 0 ? 'Tap + Add to create the first player' : 'Try a different search or filter'}
                </div>
              </div>
            ) : sorted.map(p => (
              <PlayerCard key={p._id} player={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── PROFILE SHEET ── */}
      {selected && (
        <ProfileSheet
          player={selected}
          onClose={() => setSelected(null)}
          onUpdated={p => { setPlayers(ps => ps.map(x => x._id===p._id ? p : x)); setSelected(p) }}
          onDeleted={id => { setPlayers(ps => ps.filter(x => x._id!==id)); setSelected(null) }}
          allPlayers={players}
        />
      )}
    </>
  )
}
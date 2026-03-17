import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const STATUS_LABEL = {
  setup:     { text: 'Setup',       color: '#888',    bg: 'rgba(136,136,136,0.12)' },
  innings1:  { text: '🟢 Live',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  innings2:  { text: '🟢 Live',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  completed: { text: '✅ Completed', color: '#facc15', bg: 'rgba(250,204,21,0.10)' },
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function OpenMatch() {
  const navigate = useNavigate()
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('all')   // all | live | completed
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const { data } = await axios.get('https://crickyworld-server.onrender.com/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMatches(data)
    } catch {
      setError('Failed to load matches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this match?')) return
    try {
      setDeleting(id)
      const token = localStorage.getItem('token')
      await axios.delete(`https://crickyworld-server.onrender.com/api/matches/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMatches(m => m.filter(x => x._id !== id))
    } catch {
      alert('Failed to delete match')
    } finally {
      setDeleting(null)
    }
  }

  const handleOpen = (match) => {
    if (match.status === 'completed') {
      nnavigate(`/match/${match._id}`)
    } else {
      navigate(`/scoring/${match._id}`)
    }
  }

  const filtered = matches.filter(m => {
    if (filter === 'live')      return m.status === 'innings1' || m.status === 'innings2'
    if (filter === 'completed') return m.status === 'completed'
    return true
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:#0a0a0a; font-family:'Nunito',sans-serif; }

        .om-page {
          min-height:100vh; width:100%; background:#0a0a0a;
          display:flex; justify-content:center;
        }
        .om-inner {
          width:100%; max-width:500px; min-height:100vh;
          background:#111; display:flex; flex-direction:column;
        }

        /* Header */
        .om-header {
          padding:18px 18px 14px;
          display:flex; align-items:center; gap:12px;
          background:linear-gradient(180deg,#1a1a1a 0%,transparent 100%);
          border-bottom:1px solid rgba(255,255,255,0.06);
          flex-shrink:0;
        }
        .om-back {
          width:36px; height:36px; border-radius:10px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.08);
          display:flex; align-items:center; justify-content:center;
          font-size:18px; cursor:pointer; flex-shrink:0;
          transition:background 0.15s;
        }
        .om-back:hover { background:rgba(255,68,68,0.15); }
        .om-header-title {
          font-family:'Rajdhani',sans-serif;
          font-size:22px; font-weight:700; color:#f0f0f0; letter-spacing:1px;
        }
        .om-header-sub { font-size:11px; color:#555; font-weight:600; margin-top:1px; }
        .om-refresh {
          margin-left:auto; width:34px; height:34px; border-radius:9px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.07);
          display:flex; align-items:center; justify-content:center;
          font-size:15px; cursor:pointer; transition:background 0.15s;
          flex-shrink:0;
        }
        .om-refresh:hover { background:rgba(255,68,68,0.15); }

        /* Filter tabs */
        .om-tabs {
          display:flex; gap:8px; padding:14px 14px 10px;
          flex-shrink:0;
        }
        .om-tab {
          flex:1; padding:8px 4px; border-radius:10px;
          border:1.5px solid transparent; cursor:pointer;
          font-family:'Nunito',sans-serif; font-size:12px; font-weight:800;
          letter-spacing:0.5px; text-align:center; transition:all 0.18s;
        }
        .om-tab-all      { background:rgba(255,255,255,0.05); color:#777; border-color:rgba(255,255,255,0.08); }
        .om-tab-live     { background:rgba(34,197,94,0.07);   color:#4ade80; border-color:rgba(34,197,94,0.18); }
        .om-tab-done     { background:rgba(250,204,21,0.07);  color:#fbbf24; border-color:rgba(250,204,21,0.18); }
        .om-tab.active   { border-color:currentColor; filter:brightness(1.3); }

        /* Count badge */
        .om-count {
          padding:0 14px 10px;
          font-size:11px; color:#444; font-weight:700; letter-spacing:1px;
          flex-shrink:0;
        }

        /* Body scroll */
        .om-body {
          flex:1; overflow-y:auto; padding:0 12px 24px;
          display:flex; flex-direction:column; gap:10px;
        }

        /* Empty */
        .om-empty {
          flex:1; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:60px 24px; gap:14px; text-align:center;
        }
        .om-empty-icon { font-size:52px; opacity:0.3; }
        .om-empty-title { font-family:'Rajdhani',sans-serif; font-size:20px; color:#444; font-weight:700; }
        .om-empty-sub   { font-size:13px; color:#333; font-weight:600; }
        .om-empty-btn {
          margin-top:8px; padding:11px 24px; border-radius:11px;
          background:linear-gradient(135deg,#cc0000,#ff4444);
          border:none; color:#fff; font-family:'Rajdhani',sans-serif;
          font-size:15px; font-weight:700; letter-spacing:1px; cursor:pointer;
          transition:filter 0.15s;
        }
        .om-empty-btn:hover { filter:brightness(1.1); }

        /* Error */
        .om-error {
          margin:0 12px; padding:12px 14px; border-radius:11px;
          background:rgba(127,29,29,0.35); border:1px solid rgba(255,68,68,0.28);
          color:#fca5a5; font-size:13px; font-weight:600; text-align:center;
        }

        /* Skeleton */
        .om-skeleton {
          background:#1c1c1c; border-radius:14px; height:90px;
          animation:omPulse 1.4s ease-in-out infinite;
        }
        @keyframes omPulse {
          0%,100%{ opacity:0.5 } 50%{ opacity:1 }
        }

        /* Match Card */
        .om-card {
          background:#1c1c1c; border:1px solid rgba(255,255,255,0.06);
          border-radius:14px; padding:0; cursor:pointer; overflow:hidden;
          transition:transform 0.12s, border-color 0.18s, box-shadow 0.15s;
          animation:omUp 0.3s ease both;
          position:relative;
        }
        .om-card:hover {
          transform:translateY(-1px);
          border-color:rgba(255,68,68,0.28);
          box-shadow:0 5px 20px rgba(0,0,0,0.45);
        }
        .om-card::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
          border-radius:14px 0 0 14px; opacity:0; transition:opacity 0.18s;
        }
        .om-card:hover::before { opacity:1; }
        .om-card.live::before   { background:linear-gradient(180deg,#22c55e,#15803d); }
        .om-card.done::before   { background:linear-gradient(180deg,#facc15,#ca8a04); }
        .om-card.other::before  { background:linear-gradient(180deg,#888,#444); }

        @keyframes omUp {
          from{ opacity:0; transform:translateY(12px) }
          to  { opacity:1; transform:translateY(0) }
        }

        .om-card-top {
          padding:13px 14px 10px;
          display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
        }

        /* Teams */
        .om-teams { flex:1; min-width:0; }
        .om-vs {
          font-family:'Rajdhani',sans-serif; font-size:17px; font-weight:700;
          color:#f0f0f0; letter-spacing:0.5px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .om-vs span { color:#ff4444; margin:0 6px; font-size:15px; }
        .om-meta { font-size:11px; color:#555; font-weight:600; margin-top:3px; }

        /* Status badge */
        .om-status {
          padding:3px 9px; border-radius:20px;
          font-size:10px; font-weight:800; letter-spacing:0.5px;
          white-space:nowrap; flex-shrink:0;
        }

        /* Score row */
        .om-scores {
          padding:0 14px 10px;
          display:flex; gap:8px;
        }
        .om-score-box {
          flex:1; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.05);
          border-radius:9px; padding:8px 10px;
        }
        .om-score-team { font-size:10px; color:#555; font-weight:700; margin-bottom:3px; }
        .om-score-runs {
          font-family:'Rajdhani',sans-serif; font-size:18px; font-weight:700; color:#f0f0f0;
        }
        .om-score-overs { font-size:10px; color:#444; font-weight:600; margin-top:1px; }

        /* Result banner */
        .om-result {
          margin:0 14px 10px;
          padding:7px 12px; border-radius:9px;
          background:rgba(250,204,21,0.08); border:1px solid rgba(250,204,21,0.2);
          font-size:12px; color:#fbbf24; font-weight:700; text-align:center;
        }

        /* Footer row */
        .om-card-footer {
          padding:8px 14px 11px;
          display:flex; align-items:center; justify-content:space-between;
          border-top:1px solid rgba(255,255,255,0.04);
        }
        .om-time { font-size:11px; color:#3a3a3a; font-weight:600; }
        .om-actions { display:flex; gap:8px; align-items:center; }

        .om-open-btn {
          padding:5px 14px; border-radius:8px; border:none; cursor:pointer;
          font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700;
          letter-spacing:0.5px; transition:filter 0.15s;
        }
        .om-open-live { background:rgba(34,197,94,0.2); color:#4ade80; }
        .om-open-done { background:rgba(250,204,21,0.15); color:#fbbf24; }
        .om-open-btn:hover { filter:brightness(1.25); }

        .om-del-btn {
          width:28px; height:28px; border-radius:7px;
          background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.2);
          color:#ff6666; font-size:13px; cursor:pointer; display:flex;
          align-items:center; justify-content:center; transition:background 0.15s;
        }
        .om-del-btn:hover { background:rgba(255,68,68,0.25); }
        .om-del-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      <div className="om-page">
        <div className="om-inner">

          {/* Header */}
          <div className="om-header">
            <button className="om-back" onClick={() => navigate('/')}>←</button>
            <div>
              <div className="om-header-title">📂 Open Match</div>
              <div className="om-header-sub">All previously played matches</div>
            </div>
            <button className="om-refresh" onClick={fetchMatches} title="Refresh">🔄</button>
          </div>

          {/* Filter Tabs */}
          <div className="om-tabs">
            {[
              { key: 'all',       label: '🏏 All',       cls: 'om-tab-all'  },
              { key: 'live',      label: '🟢 Live',      cls: 'om-tab-live' },
              { key: 'completed', label: '✅ Completed',  cls: 'om-tab-done' },
            ].map(t => (
              <button
                key={t.key}
                className={`om-tab ${t.cls}${filter === t.key ? ' active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Count */}
          {!loading && !error && (
            <div className="om-count">
              {filtered.length} MATCH{filtered.length !== 1 ? 'ES' : ''} FOUND
            </div>
          )}

          {/* Body */}
          <div className="om-body">

            {/* Error */}
            {error && <div className="om-error">❌ {error}</div>}

            {/* Loading skeletons */}
            {loading && [1,2,3].map(i => (
              <div key={i} className="om-skeleton" style={{ animationDelay: `${i*0.1}s` }} />
            ))}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
              <div className="om-empty">
                <div className="om-empty-icon">🏏</div>
                <div className="om-empty-title">No Matches Found</div>
                <div className="om-empty-sub">
                  {filter === 'all'
                    ? "You haven't played any matches yet."
                    : `No ${filter} matches found.`}
                </div>
                {filter === 'all' && (
                  <button className="om-empty-btn" onClick={() => navigate('/new-match')}>
                    + Create New Match
                  </button>
                )}
              </div>
            )}

            {/* Match Cards */}
            {!loading && filtered.map((match, i) => {
              const isLive = match.status === 'innings1' || match.status === 'innings2'
              const isDone = match.status === 'completed'
              const st = STATUS_LABEL[match.status] || STATUS_LABEL.setup
              const cardCls = isLive ? 'live' : isDone ? 'done' : 'other'

              return (
                <div
                  key={match._id}
                  className={`om-card ${cardCls}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => handleOpen(match)}
                >
                  {/* Top */}
                  <div className="om-card-top">
                    <div className="om-teams">
                      <div className="om-vs">
                        {match.team1}<span>vs</span>{match.team2}
                      </div>
                      <div className="om-meta">
                        {match.overs} overs • {match.battingFirst} batted first
                      </div>
                    </div>
                    <span
                      className="om-status"
                      style={{ color: st.color, background: st.bg }}
                    >
                      {st.text}
                    </span>
                  </div>

                  {/* Scores */}
                  <div className="om-scores">
                    <div className="om-score-box">
                      <div className="om-score-team">{match.innings1?.battingTeam || match.team1}</div>
                      <div className="om-score-runs">
                        {match.innings1?.runs ?? 0}/{match.innings1?.wickets ?? 0}
                      </div>
                      <div className="om-score-overs">
                        ({formatOvers(match.innings1?.balls ?? 0)} ov)
                      </div>
                    </div>
                    <div className="om-score-box">
                      <div className="om-score-team">{match.innings2?.battingTeam || match.team2}</div>
                      <div className="om-score-runs">
                        {match.innings2?.runs ?? 0}/{match.innings2?.wickets ?? 0}
                      </div>
                      <div className="om-score-overs">
                        ({formatOvers(match.innings2?.balls ?? 0)} ov)
                      </div>
                    </div>
                  </div>

                  {/* Result */}
                  {isDone && match.result && (
                    <div className="om-result">🏆 {match.result}</div>
                  )}

                  {/* Footer */}
                  <div className="om-card-footer">
                    <span className="om-time">{timeAgo(match.createdAt)}</span>
                    <div className="om-actions">
                      <button
                        className={`om-open-btn ${isLive ? 'om-open-live' : 'om-open-done'}`}
                        onClick={(e) => { e.stopPropagation(); handleOpen(match) }}
                      >
                        {isLive ? '▶ Resume' : '📋 Report'}
                      </button>
                      <button
                        className="om-del-btn"
                        onClick={(e) => handleDelete(match._id, e)}
                        disabled={deleting === match._id}
                        title="Delete match"
                      >
                        {deleting === match._id ? '⏳' : '🗑'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
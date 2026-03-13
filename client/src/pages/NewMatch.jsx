import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from "../api";

axios.post(`${API}/matches`, data)
const tok = () => localStorage.getItem('token')
const H   = () => ({ Authorization: `Bearer ${tok()}` })

export default function NewMatch() {
  const navigate = useNavigate()

  const [team1,      setTeam1]      = useState('')
  const [team2,      setTeam2]      = useState('')
  const [overs,      setOvers]      = useState('')
  const [noBallRuns, setNoBallRuns] = useState(1)
  const [wideRuns,   setWideRuns]   = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const clamp = (val, min = 0, max = 9) => Math.max(min, Math.min(max, val))

  const handleSubmit = async () => {
    setError('')
    if (!team1.trim())               return setError('Enter Team 1 name')
    if (!team2.trim())               return setError('Enter Team 2 name')
    if (team1.trim() === team2.trim()) return setError('Team names must be different')
    if (!overs || Number(overs) < 1) return setError('Enter a valid number of overs')

    setLoading(true)
    try {
      const { data } = await axios.post('/api/matches', {
        team1:      team1.trim(),
        team2:      team2.trim(),
        overs:      Number(overs),
        tossWinner: team1.trim(),
        battingFirst: team1.trim(),
        noBallRuns,
        wideRuns,
      }, { headers: H() })
      navigate(`/scoring/${data._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared field style ──────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '16px 18px',
    background: '#1a1a1a',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    color: '#f0f0f0',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Nunito, sans-serif',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.8,
    color: '#cc0000',
    marginBottom: 8,
    display: 'block',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root { height: 100%; background: var(--bg, #0a0a0a); font-family: 'Nunito', sans-serif; }
        input::placeholder { color: #3a3a3a; }
        input:focus { border-color: rgba(204,0,0,0.5) !important; }
        button { font-family: 'Nunito', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--surface, #111); }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg, #0a0a0a)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, minHeight: '100vh', background: 'var(--surface, #111)', display: 'flex', flexDirection: 'column' }}>

          {/* ── HEADER ── */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--header, #161616)',
            borderBottom: '1px solid var(--headerBdr, rgba(255,255,255,0.06))',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                width: 38, height: 38,
                borderRadius: 11,
                background: 'var(--card, #1a1a1a)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text, #f0f0f0)',
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >←</button>
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text, #f0f0f0)', letterSpacing: 0.5 }}>
                🏏 New Match
              </div>
              <div style={{ fontSize: 11, color: 'var(--subtext, #777)', marginTop: 1 }}>
                Set up your match details
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── TEAM 1 ── */}
            <div>
              <label style={labelStyle}>TEAM 1</label>
              <input
                style={inputStyle}
                value={team1}
                onChange={e => setTeam1(e.target.value)}
                placeholder="Team name"
                maxLength={30}
              />
            </div>

            {/* ── TEAM 2 ── */}
            <div>
              <label style={labelStyle}>TEAM 2</label>
              <input
                style={inputStyle}
                value={team2}
                onChange={e => setTeam2(e.target.value)}
                placeholder="Team name"
                maxLength={30}
              />
            </div>

            {/* ── OVERS ── */}
            <div>
              <label style={labelStyle}>OVERS</label>
              <input
                style={inputStyle}
                value={overs}
                onChange={e => setOvers(e.target.value.replace(/\D/g, ''))}
                placeholder="Total overs"
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
              />
            </div>

            {/* ── EXTRAS ── */}
            <div>
              <label style={labelStyle}>EXTRAS</label>
              <div style={{
                background: '#1a1a1a',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {/* No Ball */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: 14, color: 'var(--text2, #c0c0c0)', fontWeight: 600 }}>
                    Runs on NO ball
                  </span>
                  <Stepper value={noBallRuns} onChange={v => setNoBallRuns(clamp(v))} />
                </div>

                {/* Wide */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                }}>
                  <span style={{ fontSize: 14, color: 'var(--text2, #c0c0c0)', fontWeight: 600 }}>
                    Runs on Wide ball
                  </span>
                  <Stepper value={wideRuns} onChange={v => setWideRuns(clamp(v))} />
                </div>
              </div>
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: 12,
                fontSize: 13,
                color: '#f87171',
                fontWeight: 700,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* ── START BUTTON ── */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '17px',
                borderRadius: 14,
                border: 'none',
                background: loading
                  ? 'rgba(204,0,0,0.4)'
                  : 'linear-gradient(135deg, #cc0000, #ff2222)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 1,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: loading ? 'none' : '0 4px 24px rgba(204,0,0,0.35)',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? (
                <>⏳ Creating…</>
              ) : (
                <>▶ START MATCH</>
              )}
            </button>

            {/* ── NOTE ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 16px',
              background: 'rgba(204,0,0,0.06)',
              border: '1px solid rgba(204,0,0,0.15)',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🚀</span>
              <div style={{ fontSize: 12, color: 'var(--subtext, #777)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--text2, #c0c0c0)', fontWeight: 700 }}>Note : </span>
                <span style={{ color: 'var(--text2, #c0c0c0)', fontWeight: 700 }}>{team1.trim() || 'Team 1'} </span>
                <span style={{ color: '#ff6666', fontStyle: 'italic', fontWeight: 700 }}>will bat first</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

// ── Stepper control ─────────────────────────────────────────────────────────
function Stepper({ value, onChange }) {
  const btnStyle = (side) => ({
    width: 34, height: 34,
    borderRadius: 9,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f0',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
    lineHeight: 1,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
  style={{ ...btnStyle('left'), opacity: value <= 0 ? 0.3 : 1, cursor: value <= 0 ? 'not-allowed' : 'pointer' }}
  onClick={() => { if (value > 0) onChange(value - 1) }}
>−</button>
      <span style={{
        minWidth: 24,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 800,
        color: '#f0f0f0',
        fontFamily: 'Rajdhani, sans-serif',
      }}>{value}</span>
      <button style={btnStyle('right')} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}
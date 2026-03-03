import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function NewMatch() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    team1: '',
    team2: '',
    overs: '',
    noBallRuns: 1,
    wideRuns: 1,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.team1.trim()) return setError('Please enter Team 1 name')
    if (!form.team2.trim()) return setError('Please enter Team 2 name')
    if (form.team1.trim().toLowerCase() === form.team2.trim().toLowerCase())
      return setError('Team names must be different')
    if (!form.overs || isNaN(form.overs) || Number(form.overs) < 1)
      return setError('Please enter valid overs (min 1)')

    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const { data } = await axios.post(
        '/api/matches',
        {
          team1: form.team1.trim(),
          team2: form.team2.trim(),
          overs: Number(form.overs),
          tossWinner: form.team1.trim(),
          battingFirst: form.team1.trim(),
          noBallRuns: Number(form.noBallRuns),
          wideRuns: Number(form.wideRuns),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      navigate(`/scoring/${data._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root { height: 100%; background: #0a0a0a; font-family: 'Nunito', sans-serif; }

        .nm-page {
          min-height: 100vh;
          width: 100%;
          background: #0a0a0a;
          display: flex;
          justify-content: center;
        }

        .nm-inner {
          width: 100%;
          max-width: 500px;
          min-height: 100vh;
          background: #111;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .nm-header {
          padding: 18px 18px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(180deg, #1a1a1a 0%, transparent 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nm-back {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .nm-back:hover { background: rgba(255,68,68,0.15); }
        .nm-header-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #f0f0f0; letter-spacing: 1px;
        }
        .nm-header-sub {
          font-size: 11px; color: #555; font-weight: 600; margin-top: 1px;
        }

        /* ── Body ── */
        .nm-body {
          flex: 1;
          padding: 18px 14px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        /* ── Section ── */
        .nm-section-label {
          font-size: 11px; font-weight: 800;
          color: #ff4444; letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 2px;
          padding-left: 2px;
        }

        .nm-card {
          background: #1c1c1c;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        /* ── Input Row ── */
        .nm-input-row {
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          min-height: 56px;
        }
        .nm-input-row:last-child { border-bottom: none; }

        .nm-row-label {
          font-size: 13px; font-weight: 600; color: #777;
          min-width: 110px; flex-shrink: 0;
        }

        .nm-input {
          flex: 1;
          background: transparent;
          border: none; outline: none;
          color: #f0f0f0;
          font-size: 15px; font-weight: 700;
          font-family: 'Nunito', sans-serif;
          padding: 16px 0;
          text-align: right;
        }
        .nm-input::placeholder { color: #333; font-weight: 600; }

        /* full-width input (team names) */
        .nm-input-full {
          width: 100%;
          background: transparent;
          border: none; outline: none;
          color: #f0f0f0;
          font-size: 15px; font-weight: 700;
          font-family: 'Nunito', sans-serif;
          padding: 16px 0;
        }
        .nm-input-full::placeholder { color: #333; font-weight: 600; }

        /* underline on focus */
        .nm-input-row:focus-within {
          background: rgba(255,68,68,0.04);
        }
        .nm-input-row:focus-within .nm-row-label { color: #ff5555; }

        /* stepper */
        .nm-stepper {
          display: flex; align-items: center; gap: 0;
        }
        .nm-step-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: #ccc; font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .nm-step-btn:hover { background: rgba(255,68,68,0.2); color: #ff4444; }
        .nm-step-val {
          width: 36px; text-align: center;
          font-size: 15px; font-weight: 800; color: #f0f0f0;
        }

        /* ── Error ── */
        .nm-error {
          background: rgba(127,29,29,0.35);
          border: 1px solid rgba(255,68,68,0.28);
          color: #fca5a5; padding: 11px 14px;
          border-radius: 11px; font-size: 13px;
          text-align: center; font-weight: 600;
        }

        /* ── Note ── */
        .nm-note {
          background: rgba(255,68,68,0.07);
          border: 1px solid rgba(255,68,68,0.18);
          border-radius: 12px;
          padding: 13px 16px;
          display: flex; align-items: flex-start; gap: 10px;
        }
        .nm-note-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .nm-note-text {
          font-size: 13px; color: #ff8888; font-weight: 700;
          font-style: italic; line-height: 1.5;
        }
        .nm-note-team {
          color: #fff; font-style: normal;
        }

        /* ── Start Button ── */
        .nm-start {
          width: 100%; height: 54px; border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #cc0000, #ff4444);
          color: #fff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px; font-weight: 700; letter-spacing: 2px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(204,0,0,0.45);
          transition: filter 0.15s, transform 0.12s, box-shadow 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .nm-start:hover:not(:disabled) {
          filter: brightness(1.1); transform: translateY(-1px);
          box-shadow: 0 7px 24px rgba(204,0,0,0.55);
        }
        .nm-start:active:not(:disabled) { transform: scale(0.98); }
        .nm-start:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="nm-page">
        <div className="nm-inner">

          {/* Header */}
          <div className="nm-header">
            <button className="nm-back" onClick={() => navigate('/')}>←</button>
            <div>
              <div className="nm-header-title">🏏 New Match</div>
              <div className="nm-header-sub">Set up your match details</div>
            </div>
          </div>

          {/* Body */}
          <div className="nm-body">

            {/* Error */}
            {error && <div className="nm-error">❌ {error}</div>}

            {/* Team 1 */}
            <div className="nm-section-label">Team 1</div>
            <div className="nm-card">
              <div className="nm-input-row">
                <input
                  className="nm-input-full"
                  placeholder="Team name"
                  value={form.team1}
                  onChange={e => { set('team1', e.target.value); setError('') }}
                />
              </div>
            </div>

            {/* Team 2 */}
            <div className="nm-section-label">Team 2</div>
            <div className="nm-card">
              <div className="nm-input-row">
                <input
                  className="nm-input-full"
                  placeholder="Team name"
                  value={form.team2}
                  onChange={e => { set('team2', e.target.value); setError('') }}
                />
              </div>
            </div>

            {/* Overs */}
            <div className="nm-section-label">Overs</div>
            <div className="nm-card">
              <div className="nm-input-row">
                <input
                  className="nm-input-full"
                  placeholder="Total overs"
                  type="number"
                  min="1"
                  value={form.overs}
                  onChange={e => { set('overs', e.target.value); setError('') }}
                />
              </div>
            </div>

            {/* Extras */}
            <div className="nm-section-label">Extras</div>
            <div className="nm-card">
              <div className="nm-input-row">
                <span className="nm-row-label">Runs on NO ball</span>
                <div className="nm-stepper">
                  <button className="nm-step-btn" onClick={() => set('noBallRuns', Math.max(0, form.noBallRuns - 1))}>−</button>
                  <span className="nm-step-val">{form.noBallRuns}</span>
                  <button className="nm-step-btn" onClick={() => set('noBallRuns', form.noBallRuns + 1)}>+</button>
                </div>
              </div>
              <div className="nm-input-row">
                <span className="nm-row-label">Runs on Wide ball</span>
                <div className="nm-stepper">
                  <button className="nm-step-btn" onClick={() => set('wideRuns', Math.max(0, form.wideRuns - 1))}>−</button>
                  <span className="nm-step-val">{form.wideRuns}</span>
                  <button className="nm-step-btn" onClick={() => set('wideRuns', form.wideRuns + 1)}>+</button>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button className="nm-start" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Creating...' : '▶ START MATCH'}
            </button>

            {/* Note */}
            <div className="nm-note">
              <span className="nm-note-icon">📌</span>
              <div className="nm-note-text">
                Note :{' '}
                <span className="nm-note-team">
                  {form.team1.trim() || 'Team 1'}
                </span>{' '}
                will bat first
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
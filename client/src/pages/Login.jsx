import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please fill all fields!')
      return
    }
    try {
      setLoading(true)
      setError('')
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        html, body, #root {
          height: 100%;
          font-family: 'Nunito', sans-serif;
          background: #0a0a0a;
        }

        .lg-page {
          position: fixed;
          inset: 0;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: auto;
        }

        /* faint cricket-ball glow top-center */
        .lg-page::before {
          content: '';
          position: fixed;
          top: -100px; left: 50%;
          transform: translateX(-50%);
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,20,20,0.10) 0%, transparent 65%);
          pointer-events: none;
        }

        .lg-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: #111;
          border-radius: 22px;
          padding: clamp(28px, 5vw, 48px);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 24px 60px rgba(0,0,0,0.7);
          animation: lgUp 0.35s ease both;
        }

        @keyframes lgUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Brand ── */
        .lg-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
        }

        .lg-ball {
          width: 62px; height: 62px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ff4444, #8b0000);
          box-shadow: 0 4px 24px rgba(255,68,68,0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin-bottom: 14px;
          position: relative;
        }
        .lg-ball::after {
          content: '';
          position: absolute; inset: 6px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,200,200,0.2);
        }

        .lg-brand-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 30px; font-weight: 700;
          color: #f5f5f5; letter-spacing: 2px; line-height: 1;
        }
        .lg-brand-sub {
          font-size: 10px; color: #ff4444; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;
        }
        .lg-brand-tagline {
          font-size: 13px; color: #555; margin-top: 10px; font-weight: 600;
        }

        /* ── Error ── */
        .lg-error {
          background: rgba(127,29,29,0.4);
          border: 1px solid rgba(255,68,68,0.3);
          color: #fca5a5;
          padding: 11px 14px; border-radius: 10px;
          margin-bottom: 18px; font-size: 13px;
          text-align: center; font-weight: 600;
        }

        /* ── Field ── */
        .lg-field { margin-bottom: 16px; }
        .lg-label {
          font-size: 12px; color: #666; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 7px; display: block;
        }

        .lg-input-wrap {
          display: flex; align-items: center;
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          transition: border-color 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .lg-input-wrap:focus-within {
          border-color: rgba(255,68,68,0.45);
          box-shadow: 0 0 0 3px rgba(255,68,68,0.08);
        }

        .lg-prefix {
          padding: 0 12px;
          font-size: 14px; color: #555; font-weight: 700;
          white-space: nowrap;
          border-right: 1px solid rgba(255,255,255,0.07);
          height: 48px; display: flex; align-items: center;
          background: rgba(255,255,255,0.02);
          flex-shrink: 0;
        }

        .lg-input {
          flex: 1; height: 48px;
          padding: 0 14px;
          background: transparent;
          border: none; outline: none;
          color: #f0f0f0; font-size: 15px;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
        }
        .lg-input::placeholder { color: #383838; }

        .lg-eye {
          background: none; border: none; cursor: pointer;
          padding: 0 14px; color: #444; font-size: 16px;
          height: 48px; display: flex; align-items: center;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .lg-eye:hover { color: #ff4444; }

        /* ── Submit ── */
        .lg-submit {
          width: 100%; height: 50px; border: none;
          border-radius: 11px; margin-top: 8px; margin-bottom: 22px;
          background: linear-gradient(135deg, #cc0000, #ff4444);
          color: #fff; font-size: 16px; font-weight: 800;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 1.5px; cursor: pointer;
          box-shadow: 0 4px 18px rgba(204,0,0,0.4);
          transition: filter 0.15s, transform 0.12s, box-shadow 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .lg-submit:hover:not(:disabled) {
          filter: brightness(1.1); transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(204,0,0,0.5);
        }
        .lg-submit:active:not(:disabled) { transform: scale(0.98); }
        .lg-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Divider ── */
        .lg-divider {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .lg-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .lg-divider-text { font-size: 12px; color: #333; font-weight: 700; }

        /* ── Register link ── */
        .lg-footer { text-align: center; }
        .lg-footer p { color: #444; font-size: 14px; font-weight: 600; }
        .lg-footer a {
          color: #ff4444; font-weight: 800; text-decoration: none;
          transition: color 0.15s;
        }
        .lg-footer a:hover { color: #ff7070; }
      `}</style>

      <div className="lg-page">
        <div className="lg-card">

          {/* Brand */}
          <div className="lg-brand">
            <div className="lg-ball">🏏</div>
            <div className="lg-brand-name">CrickyWorld</div>
            <div className="lg-brand-sub">Score · Track · Win</div>
            <div className="lg-brand-tagline">Sign in to your account</div>
          </div>

          {/* Error */}
          {error && <div className="lg-error">❌ {error}</div>}

          {/* Mobile Number */}
          <div className="lg-field">
            <label className="lg-label">📱 Mobile Number</label>
            <div className="lg-input-wrap">
              <span className="lg-prefix">🇮🇳 +91</span>
              <input
                className="lg-input"
                type="tel"
                placeholder="Enter mobile number"
                value={form.email}
                maxLength={10}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {/* Password */}
          <div className="lg-field">
            <label className="lg-label">🔒 Password</label>
            <div className="lg-input-wrap">
              <input
                className="lg-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                className="lg-eye"
                onClick={() => setShowPass(s => !s)}
                tabIndex={-1}
                type="button"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Sign In */}
          <button
            className="lg-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ Signing in...' : '🏏 SIGN IN'}
          </button>

          {/* Divider */}
          <div className="lg-divider">
            <div className="lg-divider-line" />
            <span className="lg-divider-text">OR</span>
            <div className="lg-divider-line" />
          </div>

          {/* Register */}
          <div className="lg-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Register here →</Link>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

export default Login
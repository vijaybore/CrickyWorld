import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import API from '../api'

export default function Login() {
  const navigate         = useNavigate()
  const { loginWithOTP } = useAuth()

  const [mobile,   setMobile]   = useState('')
  const [otp,      setOtp]      = useState('')
  const [name,     setName]     = useState('')
  const [step,     setStep]     = useState('mobile')
  const [isNew,    setIsNew]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [resendCD, setResendCD] = useState(0)

  const startCountdown = () => {
    setResendCD(30)
    const t = setInterval(() => {
      setResendCD(prev => { if (prev <= 1) { clearInterval(t); return 0 } return prev - 1 })
    }, 1000)
  }

  const handleSendOTP = async () => {
    setError('')
    if (!/^\d{10}$/.test(mobile)) return setError('Enter a valid 10-digit mobile number')
    setLoading(true)
    try {
      // FIX: use ${API} prefix so this works in production on Vercel
      const { data } = await axios.post(`${API}/api/auth/send-otp`, { mobile })
      setIsNew(!data.exists)
      if (data.name) setName(data.name)
      setStep('otp')
      startCountdown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setError('')
    if (otp.length !== 6) return setError('Enter the 6-digit OTP')
    if (isNew && !name.trim()) return setError('Please enter your name')
    setLoading(true)
    try {
      await loginWithOTP(mobile, otp, isNew ? name.trim() : undefined)
      navigate('/settings', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCD > 0) return
    setError(''); setOtp('')
    setLoading(true)
    try {
      await axios.post(`${API}/api/auth/send-otp`, { mobile })
      startCountdown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '15px 16px',
    background: 'var(--inputBg, #0a0a0a)',
    border: '1.5px solid var(--border, rgba(255,255,255,0.07))',
    borderRadius: 13, color: 'var(--text, #f0f0f0)',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Nunito, sans-serif', transition: 'border-color 0.15s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; background:var(--bg,#0a0a0a); font-family:'Nunito',sans-serif; }
        input::placeholder { color: var(--muted, #3a3a3a); }
        input:focus { border-color: var(--accent, #ff4444) !important; }
        button { font-family: 'Nunito', sans-serif; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg, #0a0a0a)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <button
            onClick={() => step === 'otp' ? setStep('mobile') : navigate('/settings')}
            style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--subtext, #777)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            ← {step === 'otp' ? 'Change number' : 'Back to Settings'}
          </button>

          <div style={{ background: 'var(--card, #1a1a1a)', border: '1px solid var(--border, rgba(255,255,255,0.07))', borderRadius: 22, overflow: 'hidden', boxShadow: '0 8px 40px var(--shadow, rgba(0,0,0,0.5))' }}>

            <div style={{ padding: '28px 24px 22px', background: 'linear-gradient(145deg, var(--card, #1a1a1a), var(--card2, #202020))', borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))', textAlign: 'center' }}>
              <div style={{ fontSize: 46, marginBottom: 12 }}>🏏</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text, #f0f0f0)', marginBottom: 6 }}>
                {step === 'mobile' ? 'Sign In' : 'Enter OTP'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--subtext, #777)', lineHeight: 1.5 }}>
                {step === 'mobile' ? 'Enter your mobile number to continue' : `OTP sent to +91 ${mobile}`}
              </div>
            </div>

            <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {step === 'mobile' && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--subtext, #777)', fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>MOBILE NUMBER</div>
                    <div style={{ display: 'flex', gap: 0, borderRadius: 13, overflow: 'hidden', border: '1.5px solid var(--border, rgba(255,255,255,0.07))' }}>
                      <div style={{ padding: '15px 14px', background: 'var(--card2, #202020)', color: 'var(--subtext, #777)', fontSize: 14, fontWeight: 700, borderRight: '1px solid var(--border, rgba(255,255,255,0.07))', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        🇮🇳 +91
                      </div>
                      <input
                        style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }}
                        type="number" inputMode="numeric" placeholder="10-digit number"
                        maxLength={10} value={mobile}
                        onChange={e => setMobile(e.target.value.slice(0, 10))}
                        onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                        autoFocus
                      />
                    </div>
                  </div>
                  {error && <ErrorBox msg={error} />}
                  <button onClick={handleSendOTP} disabled={loading} style={primaryBtn(loading)}>
                    {loading ? 'Sending…' : 'Send OTP →'}
                  </button>
                </>
              )}

              {step === 'otp' && (
                <>
                  {isNew && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--subtext, #777)', fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>YOUR NAME</div>
                      <input style={inputStyle} placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--subtext, #777)', fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>6-DIGIT OTP</div>
                    <input
                      style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 }}
                      type="number" inputMode="numeric" placeholder="——————"
                      maxLength={6} value={otp}
                      onChange={e => setOtp(e.target.value.slice(0, 6))}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                      autoFocus={!isNew}
                    />
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', fontSize: 11, color: '#60a5fa', fontWeight: 600, lineHeight: 1.5 }}>
                    💡 OTP is logged in Render server console (check Logs tab)
                  </div>
                  {error && <ErrorBox msg={error} />}
                  <button onClick={handleVerifyOTP} disabled={loading} style={primaryBtn(loading)}>
                    {loading ? 'Verifying…' : 'Verify & Sign In ✓'}
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={handleResend} disabled={resendCD > 0 || loading} style={{ background: 'none', border: 'none', cursor: resendCD > 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, color: resendCD > 0 ? 'var(--muted, #3a3a3a)' : 'var(--accent, #ff4444)' }}>
                      {resendCD > 0 ? `Resend OTP in ${resendCD}s` : 'Resend OTP'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted, #3a3a3a)', lineHeight: 1.6 }}>
            By signing in you agree to use this app responsibly 🏏
          </div>
        </div>
      </div>
    </>
  )
}

const primaryBtn = (loading) => ({
  width: '100%', padding: '15px', borderRadius: 13, border: 'none',
  background: loading ? 'rgba(204,0,0,0.4)' : 'linear-gradient(135deg, var(--accent2, #cc0000), var(--accent, #ff4444))',
  color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 0.3,
  cursor: loading ? 'default' : 'pointer',
  boxShadow: loading ? 'none' : '0 4px 20px rgba(204,0,0,0.3)',
  transition: 'opacity 0.15s',
})

function ErrorBox({ msg }) {
  return (
    <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', fontSize: 12, color: '#f87171', fontWeight: 700, textAlign: 'center' }}>
      {msg}
    </div>
  )
}
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError('Please fill all fields!')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match!')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters!')
      return
    }
    try {
      setLoading(true)
      setError('')
      await register(form.name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed!')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: 'clamp(10px, 2.5vw, 14px)',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: 'clamp(13px, 2.5vw, 15px)',
    outline: 'none',
    margin: 0,
  }

  const labelStyle = {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    color: '#94a3b8',
    marginBottom: '6px',
    display: 'block',
    fontWeight: '500',
  }

  return (
   <div style={{
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  overflow: 'auto',
}}>
      <div style={{
        width: '100%',
        maxWidth: 'min(440px, 95vw)',
        background: '#1e293b',
        borderRadius: 'clamp(12px, 3vw, 20px)',
        padding: 'clamp(20px, 5vw, 40px)',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'clamp(20px, 4vw, 28px)'}}>
          <div style={{
            fontSize: 'clamp(40px, 8vw, 64px)',
            marginBottom: '8px',
            lineHeight: 1,
          }}>
            🏏
          </div>
          <h1 style={{
            color: '#16a34a',
            fontSize: 'clamp(22px, 5vw, 32px)',
            fontWeight: '800',
            marginBottom: '6px',
          }}>
            CrickyWorld
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: 'clamp(12px, 2.5vw, 15px)',
          }}>
            Create your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            padding: 'clamp(10px, 2vw, 14px)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            textAlign: 'center',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Name */}
        <div style={{marginBottom:'clamp(10px, 2vw, 14px)'}}>
          <label style={labelStyle}>👤 Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            style={inputStyle}
          />
        </div>

       {/* Mobile Number */}
<div style={{marginBottom:'clamp(10px, 2vw, 14px)'}}>
  <label style={labelStyle}>📱 Mobile Number</label>
  <div style={{display:'flex', gap:'8px'}}>
    <div style={{
      padding:'12px',
      background:'#0f172a',
      border:'1px solid #334155',
      borderRadius:'10px',
      color:'#f1f5f9',
      fontSize:'15px',
      whiteSpace:'nowrap',
    }}>
      🇮🇳 +91
    </div>
    <input
      type="tel"
      placeholder="Enter mobile number"
      value={form.email}
      onChange={e => setForm({...form, email: e.target.value})}
      maxLength={10}
      style={{...inputStyle, flex:1, margin:0}}
    />
  </div>
</div>

        {/* Password */}
        <div style={{marginBottom:'clamp(10px, 2vw, 14px)'}}>
          <label style={labelStyle}>🔒 Password</label>
          <input
            type="password"
            placeholder="Min 6 characters"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            style={inputStyle}
          />
        </div>

        {/* Confirm Password */}
        <div style={{marginBottom:'clamp(16px, 3vw, 24px)'}}>
          <label style={labelStyle}>🔒 Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat your password"
            value={form.confirm}
            onChange={e => setForm({...form, confirm: e.target.value})}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: 'clamp(12px, 2.5vw, 16px)',
            background: loading ? '#166534' : '#16a34a',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: 'clamp(14px, 3vw, 17px)',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: 'clamp(16px, 3vw, 24px)',
          }}
        >
          {loading ? '⏳ Creating account...' : '🏏 Create Account'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: 'clamp(16px, 3vw, 24px)',
        }}>
          <div style={{flex:1, height:'1px', background:'#334155'}}/>
          <span style={{color:'#475569', fontSize:'13px'}}>or</span>
          <div style={{flex:1, height:'1px', background:'#334155'}}/>
        </div>

        {/* Login Link */}
        <div style={{textAlign: 'center'}}>
          <p style={{
            color: '#94a3b8',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{
              color: '#16a34a',
              fontWeight: '700',
              textDecoration: 'none',
            }}>
              Sign in here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
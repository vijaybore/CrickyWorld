import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        maxWidth: '420px',
        background: '#1e293b',
        borderRadius: '20px',
        padding: 'clamp(24px, 5vw, 48px)',
        border: '1px solid #334155',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <div style={{fontSize:'60px', lineHeight:1, marginBottom:'12px'}}>🏏</div>
          <h1 style={{
            color: '#16a34a',
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: '800',
            marginBottom: '6px',
          }}>
            CrickyWorld
          </h1>
          <p style={{color:'#94a3b8', fontSize:'14px'}}>
            Sign in to your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:'#7f1d1d', color:'#fca5a5',
            padding:'12px', borderRadius:'8px',
            marginBottom:'16px', fontSize:'13px', textAlign:'center',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Mobile Number */}
        <div style={{marginBottom:'16px'}}>
          <label style={{
            fontSize:'13px', color:'#94a3b8',
            marginBottom:'6px', display:'block', fontWeight:'500',
          }}>
            📱 Mobile Number
          </label>
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
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={10}
              style={{
                flex:1,
                padding:'12px',
                background:'#0f172a',
                border:'1px solid #334155',
                borderRadius:'10px',
                color:'#f1f5f9',
                fontSize:'15px',
                outline:'none',
                margin:0,
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{marginBottom:'24px'}}>
          <label style={{
            fontSize:'13px', color:'#94a3b8',
            marginBottom:'6px', display:'block', fontWeight:'500',
          }}>
            🔒 Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width:'100%',
              padding:'12px',
              background:'#0f172a',
              border:'1px solid #334155',
              borderRadius:'10px',
              color:'#f1f5f9',
              fontSize:'15px',
              outline:'none',
              margin:0,
            }}
          />
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width:'100%',
            padding:'14px',
            background: loading ? '#166534' : '#16a34a',
            border:'none',
            borderRadius:'10px',
            color:'white',
            fontSize:'16px',
            fontWeight:'700',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom:'20px',
            transition:'all 0.2s',
          }}
        >
          {loading ? '⏳ Signing in...' : '🏏 Sign In'}
        </button>

        {/* Divider */}
        <div style={{
          display:'flex', alignItems:'center',
          gap:'12px', marginBottom:'20px',
        }}>
          <div style={{flex:1, height:'1px', background:'#334155'}}/>
          <span style={{color:'#475569', fontSize:'13px'}}>or</span>
          <div style={{flex:1, height:'1px', background:'#334155'}}/>
        </div>

        {/* Register Link */}
        <div style={{textAlign:'center'}}>
          <p style={{color:'#94a3b8', fontSize:'14px'}}>
            Don't have an account?{' '}
            <Link to="/register" style={{
              color:'#16a34a', fontWeight:'700', textDecoration:'none',
            }}>
              Register here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
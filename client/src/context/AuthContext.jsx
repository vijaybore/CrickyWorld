import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

// OTP-based auth — no passwords

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUser(res.data))
        .catch(() => {
          // Token invalid/expired — clear it silently, stay on current page
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Mobile + OTP login (auto-registers new users)
  const loginWithOTP = async (mobile, otp, name) => {
    const res = await axios.post('/api/auth/verify-otp', { mobile, otp, name })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithOTP, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
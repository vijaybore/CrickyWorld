import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Home          from './pages/Home'
import Login         from './pages/Login'
import Register      from './pages/Register'
import NewMatch      from './pages/NewMatch'
import OpenMatch     from './pages/OpenMatch'
import Scoring       from './pages/Scoring'
import MatchReport   from './pages/MatchReport'
import Players       from './pages/Players'
import ManagePlayers from './pages/ManagePlayers'
import Tournaments   from './pages/Tournaments'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Home ── */}
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />

      {/* ── Matches ── */}
      <Route path="/new-match"      element={<PrivateRoute><NewMatch /></PrivateRoute>} />
      <Route path="/matches"        element={<PrivateRoute><OpenMatch /></PrivateRoute>} />
      <Route path="/scoring/:id"    element={<PrivateRoute><Scoring /></PrivateRoute>} />
      <Route path="/match/:id"      element={<PrivateRoute><MatchReport /></PrivateRoute>} />

      {/* ── Players ── */}
      <Route path="/players"        element={<PrivateRoute><Players /></PrivateRoute>} />
      <Route path="/manage-players" element={<PrivateRoute><ManagePlayers /></PrivateRoute>} />

      {/* ── Tournaments ── */}
      <Route path="/new-tournament"  element={<PrivateRoute><Tournaments mode="new" /></PrivateRoute>} />
      <Route path="/tournaments"     element={<PrivateRoute><Tournaments /></PrivateRoute>} />
      <Route path="/tournaments/:id" element={<PrivateRoute><Tournaments /></PrivateRoute>} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
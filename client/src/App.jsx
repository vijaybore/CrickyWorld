import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NewMatch from './pages/NewMatch'
import OpenMatch from './pages/OpenMatch'
import Scoring from './pages/Scoring'
import Players from './pages/Players'
import MatchReport from './pages/MatchReport'
import ManagePlayers from './pages/ManagePlayers'
import Login from './pages/Login'
import Register from './pages/Register'

// Full-screen pages — no sidebar/navbar
const NO_NAVBAR_ROUTES = ['/', '/new-match', '/matches', '/login', '/register']

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>Loading...</div>
  if (!user) return <Navigate to="/login" />
  return children
}

function App() {
  const { user } = useAuth()
  const location = useLocation()

  const isNoNavbar =
    NO_NAVBAR_ROUTES.includes(location.pathname) ||
    location.pathname.startsWith('/scoring/') ||
    location.pathname.startsWith('/report/')

  const showNavbar = user && !isNoNavbar

  return (
    <div className="app-wrapper">
      {showNavbar && <Navbar />}
      <div className={showNavbar ? 'main-content' : ''}>
        <Routes>
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/"               element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/new-match"      element={<ProtectedRoute><NewMatch /></ProtectedRoute>} />
          <Route path="/matches"        element={<ProtectedRoute><OpenMatch /></ProtectedRoute>} />
          <Route path="/scoring/:id"    element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
          <Route path="/players"        element={<ProtectedRoute><Players /></ProtectedRoute>} />
          <Route path="/report/:id"     element={<ProtectedRoute><MatchReport /></ProtectedRoute>} />
          <Route path="/manage-players" element={<ProtectedRoute><ManagePlayers /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
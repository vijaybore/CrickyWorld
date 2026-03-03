import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NewMatch from './pages/NewMatch'
import Scoring from './pages/Scoring'
import Players from './pages/Players'
import MatchReport from './pages/MatchReport'
import ManagePlayers from './pages/ManagePlayers'
import Login from './pages/Login'
import Register from './pages/Register'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="card text-center" style={{margin:'40px'}}>Loading...</div>
  if (!user) return <Navigate to="/login" />
  return children
}

function App() {
  const { user } = useAuth()

  return (
    <div className="app-wrapper">
      {user && <Navbar />}
      <div className={user ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/new-match" element={<ProtectedRoute><NewMatch /></ProtectedRoute>} />
          <Route path="/scoring/:id" element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute><MatchReport /></ProtectedRoute>} />
          <Route path="/manage-players" element={<ProtectedRoute><ManagePlayers /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
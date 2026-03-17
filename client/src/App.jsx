  import { Routes, Route, Navigate } from 'react-router-dom'
  import { ThemeProvider } from './context/ThemeContext'
  // No PrivateRoute — app is fully accessible without login.
  // Login is optional and only available from Settings.

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
  import Records       from './pages/Records'
  import Settings      from './pages/Settings'

  export default function App() {
    return (
      <ThemeProvider>
        <Routes>
          {/* ── Home ── */}
          <Route path="/"              element={<Home />} />

          {/* ── Auth (accessible from Settings) ── */}
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />

          {/* ── Matches ── */}
          <Route path="/new-match"     element={<NewMatch />} />
          <Route path="/matches"       element={<OpenMatch />} />
          <Route path="/scoring/:id"   element={<Scoring />} />
          <Route path="/match/:id"     element={<MatchReport />} />

          {/* ── Players ── */}
          <Route path="/players"        element={<Players />} />
          <Route path="/manage-players" element={<ManagePlayers />} />

          {/* ── Tournaments ── */}
          <Route path="/new-tournament"  element={<Tournaments mode="new" />} />
          <Route path="/tournaments"     element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<Tournaments />} />

          {/* ── Records ── */}
          <Route path="/records"   element={<Records />} />

          {/* ── Settings ── */}
          <Route path="/settings"  element={<Settings />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }
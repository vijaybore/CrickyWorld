import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-logo">🏏 CrickyWorld</div>

        {/* User Info */}
        <div style={{
          background:'#0f172a',
          borderRadius:'10px',
          padding:'12px',
          marginBottom:'16px',
        }}>
          <div style={{
            width:'40px', height:'40px',
            borderRadius:'50%',
            background:'#16a34a',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:'700', fontSize:'18px',
            marginBottom:'8px',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <p style={{fontWeight:'600', fontSize:'14px'}}>{user?.name}</p>
          <p style={{fontSize:'12px', color:'#94a3b8'}}>{user?.email}</p>
        </div>

        <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
          <span>🏏</span> Matches
        </Link>
        <Link to="/new-match" className={`sidebar-link ${isActive('/new-match') ? 'active' : ''}`}>
          <span>➕</span> New Match
        </Link>
        <Link to="/players" className={`sidebar-link ${isActive('/players') ? 'active' : ''}`}>
          <span>🏆</span> Rankings
        </Link>
        <Link to="/manage-players" className={`sidebar-link ${isActive('/manage-players') ? 'active' : ''}`}>
          <span>👤</span> Players
        </Link>

        {/* Logout */}
        <div style={{marginTop:'auto'}}>
          <button
            onClick={handleLogout}
            style={{
              width:'100%',
              padding:'12px 16px',
              background:'#7f1d1d',
              border:'none',
              borderRadius:'10px',
              color:'#fca5a5',
              cursor:'pointer',
              fontWeight:'600',
              fontSize:'14px',
              display:'flex',
              alignItems:'center',
              gap:'8px',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="mobile-navbar">
        <h1>🏏 CrickyWorld</h1>
        <div style={{
          width:'36px', height:'36px',
          borderRadius:'50%',
          background:'#16a34a',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:'700', fontSize:'16px',
          cursor:'pointer',
        }}
          onClick={handleLogout}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="bottom-nav">
        <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
          <span>🏏</span>
          <span>Matches</span>
        </Link>
        <Link to="/new-match" className={`bottom-nav-item ${isActive('/new-match') ? 'active' : ''}`}>
          <span>➕</span>
          <span>New Match</span>
        </Link>
        <Link to="/players" className={`bottom-nav-item ${isActive('/players') ? 'active' : ''}`}>
          <span>🏆</span>
          <span>Rankings</span>
        </Link>
        <Link to="/manage-players" className={`bottom-nav-item ${isActive('/manage-players') ? 'active' : ''}`}>
          <span>👤</span>
          <span>Players</span>
        </Link>
      </div>
    </>
  )
}

export default Navbar
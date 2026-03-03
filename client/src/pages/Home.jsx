import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  { label: "NEW MATCH",       emoji: "🏏", desc: "Start a fresh cricket match",  path: "/new-match" },
  { label: "OPEN MATCH",      emoji: "📂", desc: "Resume an existing match",      path: "/matches" },
  { label: "NEW TOURNAMENT",  emoji: "🏆", desc: "Create a new tournament",       path: "/new-tournament" },
  { label: "OPEN TOURNAMENT", emoji: "🎯", desc: "Continue a tournament",         path: "/tournaments" },
  { label: "PLAYERS",         emoji: "👤", desc: "Manage player profiles",        path: "/players" },
  { label: "RECORDS",         emoji: "📊", desc: "View stats & records",          path: "/records" },
  { label: "SETTINGS",        emoji: "⚙️",  desc: "App preferences",              path: "/settings" },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pressed, setPressed] = useState(null);
  const [ripples, setRipples] = useState({});

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handlePress = (path, e) => {
    setPressed(path);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((r) => ({ ...r, [path]: { x, y } }));
    setTimeout(() => {
      setPressed(null);
      setRipples((r) => { const n = { ...r }; delete n[path]; return n; });
      navigate(path);
    }, 200);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        html, body, #root {
          height: 100%;
          background: #0a0a0a;
          font-family: 'Nunito', sans-serif;
        }

        .hw-page {
          min-height: 100vh;
          width: 100%;
          background: #0a0a0a;
          display: flex;
          justify-content: center;
        }

        .hw-inner {
          width: 100%;
          max-width: 500px;
          min-height: 100vh;
          background: #111;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        /* subtle top glow */
        .hw-inner::before {
          content: '';
          position: absolute;
          top: -80px; left: 50%;
          transform: translateX(-50%);
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,30,30,0.08) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* ── Header ── */
        .hw-header {
          position: relative; z-index: 10;
          padding: 18px 18px 14px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(180deg, #1a1a1a 0%, transparent 100%);
        }

        .hw-logo { display: flex; align-items: center; gap: 10px; }

        .hw-ball {
          width: 40px; height: 40px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ff4444, #8b0000);
          box-shadow: 0 2px 16px rgba(255,68,68,0.45);
          display: flex; align-items: center; justify-content: center;
          font-size: 19px; flex-shrink: 0;
        }

        .hw-brand-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #f5f5f5; letter-spacing: 1.5px; line-height: 1;
        }
        .hw-brand-sub {
          font-size: 9px; color: #ff4444; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase; margin-top: 2px;
        }

        .hw-user-chip {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 22px; padding: 5px 12px 5px 5px;
          cursor: default;
        }
        .hw-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #ff4444, #aa0000);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
        }
        .hw-uname {
          font-size: 12px; font-weight: 700; color: #ddd;
          max-width: 80px; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Hero ── */
        .hw-hero {
          position: relative; z-index: 10;
          margin: 14px 14px 12px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1d1d1d 0%, #242424 55%, #191919 100%);
          padding: 20px 20px; overflow: hidden;
          border: 1px solid rgba(255,68,68,0.18);
          box-shadow: 0 4px 24px rgba(0,0,0,0.55);
          animation: hwUp 0.3s ease both;
        }
        .hw-hero::after {
          content: '🏟️'; position: absolute;
          right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 62px; opacity: 0.09; pointer-events: none;
        }
        .hw-hero-greet {
          font-size: 10px; color: #ff5555; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 5px;
        }
        .hw-hero-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 27px; font-weight: 700; color: #fff; line-height: 1.15;
        }
        .hw-hero-badge {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 11px;
          background: rgba(255,68,68,0.1);
          border: 1px solid rgba(255,68,68,0.25);
          border-radius: 20px; padding: 4px 12px;
          font-size: 11px; color: #ff8888; font-weight: 700;
        }

        /* ── Menu ── */
        .hw-menu {
          position: relative; z-index: 10;
          padding: 0 12px 12px;
          display: flex; flex-direction: column; gap: 8px;
        }

        .hw-btn {
          position: relative; overflow: hidden;
          background: #1c1c1c;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 13px; padding: 0;
          cursor: pointer; text-align: left;
          display: flex; align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.45);
          transition: transform 0.11s, box-shadow 0.14s, border-color 0.2s;
          -webkit-tap-highlight-color: transparent;
          animation: hwUp 0.4s ease both;
        }
        .hw-btn:nth-child(1){animation-delay:0.04s}
        .hw-btn:nth-child(2){animation-delay:0.08s}
        .hw-btn:nth-child(3){animation-delay:0.12s}
        .hw-btn:nth-child(4){animation-delay:0.16s}
        .hw-btn:nth-child(5){animation-delay:0.20s}
        .hw-btn:nth-child(6){animation-delay:0.24s}
        .hw-btn:nth-child(7){animation-delay:0.28s}

        .hw-btn:hover {
          transform: translateY(-1px) scale(1.005);
          border-color: rgba(255,68,68,0.28);
          box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        }
        .hw-btn.active { transform: scale(0.97); }

        /* red left accent on hover */
        .hw-btn::before {
          content: ''; position: absolute;
          left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #ff4444, #aa0000);
          border-radius: 13px 0 0 13px;
          opacity: 0; transition: opacity 0.18s;
        }
        .hw-btn:hover::before { opacity: 1; }

        .hw-btn-icon {
          width: 62px; height: 62px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 25px;
          border-radius: 12px 0 0 12px;
          background: rgba(255,255,255,0.025);
        }
        .hw-btn-body { flex: 1; padding: 12px 10px 12px 6px; }
        .hw-btn-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px; font-weight: 700;
          color: #efefef; letter-spacing: 1px; line-height: 1;
        }
        .hw-btn-desc {
          font-size: 11px; color: #555;
          margin-top: 3px; font-weight: 600;
        }
        .hw-btn-arrow {
          font-size: 20px; color: #2e2e2e;
          padding-right: 14px;
          transition: transform 0.18s, color 0.18s;
        }
        .hw-btn:hover .hw-btn-arrow {
          transform: translateX(3px); color: #ff4444;
        }

        /* ripple */
        .hw-ripple {
          position: absolute; border-radius: 50%;
          background: rgba(255,68,68,0.14);
          width: 10px; height: 10px; transform: scale(0);
          animation: hwRipple 0.35s ease-out forwards;
          pointer-events: none;
        }
        @keyframes hwRipple { to { transform: scale(40); opacity: 0; } }

        /* ── Logout ── */
        .hw-logout-wrap {
          position: relative; z-index: 10;
          padding: 4px 12px 24px;
        }
        .hw-logout {
          width: 100%; border: none; border-radius: 13px;
          background: linear-gradient(135deg, #7f1d1d, #9b1c1c);
          padding: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px; font-weight: 700;
          color: #fff; letter-spacing: 1px;
          box-shadow: 0 3px 14px rgba(127,29,29,0.45);
          transition: filter 0.14s, transform 0.11s, box-shadow 0.14s;
        }
        .hw-logout:hover {
          filter: brightness(1.12); transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(127,29,29,0.55);
        }
        .hw-logout:active { transform: scale(0.97); }

        /* ── Footer ── */
        .hw-footer {
          position: relative; z-index: 10;
          text-align: center; padding: 0 0 18px;
          font-size: 10px; color: #222;
          font-weight: 700; letter-spacing: 1.5px;
        }

        @keyframes hwUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="hw-page">
        <div className="hw-inner">

          {/* Header */}
          <header className="hw-header">
            <div className="hw-logo">
              <div className="hw-ball">🏏</div>
              <div>
                <div className="hw-brand-name">CrickyWorld</div>
                <div className="hw-brand-sub">Score · Track · Win</div>
              </div>
            </div>
            {user && (
              <div className="hw-user-chip">
                <div className="hw-avatar">{initials}</div>
                <span className="hw-uname">{user.name?.split(" ")[0]}</span>
              </div>
            )}
          </header>

          {/* Hero */}
          <div className="hw-hero">
            <div className="hw-hero-greet">
              {user ? `Welcome, ${user.name?.split(" ")[0]}` : "Welcome Back"}
            </div>
            <div className="hw-hero-title">Ready to<br />Play Cricket? 🏏</div>
            <div className="hw-hero-badge">⚡ Live Scoring Available</div>
          </div>

          {/* Menu */}
          <nav className="hw-menu">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`hw-btn${pressed === item.path ? " active" : ""}`}
                onClick={(e) => handlePress(item.path, e)}
              >
                {ripples[item.path] && (
                  <span
                    className="hw-ripple"
                    style={{ left: ripples[item.path].x - 5, top: ripples[item.path].y - 5 }}
                  />
                )}
                <div className="hw-btn-icon">{item.emoji}</div>
                <div className="hw-btn-body">
                  <div className="hw-btn-label">{item.label}</div>
                  <div className="hw-btn-desc">{item.desc}</div>
                </div>
                <span className="hw-btn-arrow">›</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="hw-logout-wrap">
            <button className="hw-logout" onClick={handleLogout}>
              🚪 LOGOUT
            </button>
          </div>

          <div className="hw-footer">CRICKYWORLD v1.0 • MADE WITH ❤️</div>
        </div>
      </div>
    </>
  );
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTheme } from '../context/ThemeContext'

const tok = () => localStorage.getItem('token')
const H   = () => ({ Authorization: `Bearer ${tok()}` })

// ── User Avatar ───────────────────────────────────────────────────────────────
function UserAvatar({ name, size = 66 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const palettes = [
    ['#7f1d1d','#fca5a5'], ['#1e3a5f','#93c5fd'], ['#064e3b','#6ee7b7'],
    ['#78350f','#fcd34d'], ['#4c1d95','#c4b5fd'], ['#374151','#e5e7eb'],
  ]
  const [bg, fg] = palettes[(name || '').charCodeAt(0) % palettes.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Rajdhani,sans-serif', fontSize: size * 0.34, fontWeight: 700, color: fg,
      border: '3px solid var(--accent)',
      boxShadow: '0 0 0 4px var(--accentRing), 0 6px 24px var(--shadow)',
    }}>
      {initials}
    </div>
  )
}

// ── Edit Profile Drawer ───────────────────────────────────────────────────────
function EditProfile({ user, onClose, onSaved }) {
  const [name,   setName]   = useState(user.name  || '')
  const [email,  setEmail]  = useState(user.email || '')
  const [pw,     setPw]     = useState('')
  const [cpw,    setCpw]    = useState('')
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState(null)

  const Field = ({ label, ...props }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <input {...props} style={{
        width: '100%', background: 'var(--inputBg)', border: '1.5px solid var(--border)',
        borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14,
        outline: 'none', boxSizing: 'border-box', fontFamily: 'Nunito,sans-serif', transition: 'border-color 0.15s',
      }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e  => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )

  const save = async () => {
    if (!name.trim()) return setMsg({ text: 'Name is required', ok: false })
    if (pw && pw !== cpw) return setMsg({ text: 'Passwords do not match', ok: false })
    setSaving(true); setMsg(null)
    try {
      try {
        await axios.patch('/api/auth/profile',
          { name: name.trim(), email: email.trim(), ...(pw ? { password: pw } : {}) },
          { headers: H() })
      } catch {}
      const updated = { ...user, name: name.trim(), email: email.trim() }
      localStorage.setItem('user', JSON.stringify(updated))
      onSaved(updated)
      setMsg({ text: '✅ Profile updated!', ok: true })
      setTimeout(onClose, 900)
    } catch {
      setMsg({ text: 'Could not save. Please try again.', ok: false })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--surface)', borderRadius: '24px 24px 0 0',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)',
        boxShadow: '0 -20px 60px var(--shadow)',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--muted)', borderRadius: 2, margin: '14px auto 0' }} />
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Edit Profile</div>
            <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>Update your account information</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--subtext)', fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 18px 36px' }}>
          <Field label="FULL NAME"      value={name}  onChange={e => setName(e.target.value)}  placeholder="Your name" />
          <Field label="EMAIL ADDRESS"  value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />
          <div style={{ fontSize: 10, color: 'var(--subtext)', fontWeight: 800, letterSpacing: 1, marginBottom: 14 }}>CHANGE PASSWORD — OPTIONAL</div>
          <Field label="NEW PASSWORD"     value={pw}  onChange={e => setPw(e.target.value)}  placeholder="Leave blank to keep current" type="password" />
          {pw && <Field label="CONFIRM PASSWORD" value={cpw} onChange={e => setCpw(e.target.value)} placeholder="Repeat new password" type="password" />}
          {msg && (
            <div style={{
              padding: '11px 14px', borderRadius: 10, marginBottom: 14,
              background: msg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'}`,
              fontSize: 12, fontWeight: 700, color: msg.ok ? '#4ade80' : '#f87171', textAlign: 'center',
            }}>{msg.text}</div>
          )}
          <button onClick={save} disabled={saving} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
            color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Nunito,sans-serif',
            opacity: saving ? 0.7 : 1, letterSpacing: 0.3,
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ icon, iconBg, label, sub, right, onClick, danger, last }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border2)',
        cursor: onClick ? 'pointer' : 'default',
        background: hov && onClick ? 'var(--hover)' : 'transparent',
        transition: 'background 0.12s',
      }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0, fontSize: 18,
        background: danger ? 'rgba(239,68,68,0.1)' : (iconBg || 'var(--card2)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border2)',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: danger ? '#f87171' : 'var(--text)', marginBottom: 1 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>{sub}</div>}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div>
             : onClick && <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, color: 'var(--subtext)', padding: '0 2px 8px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ background: 'var(--card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 16px var(--shadow)' }}>
        {children}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate            = useNavigate()
  const { themeId, theme, themes, setTheme } = useTheme()

  // ── User state — read from localStorage on mount ──────────────────────────
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') }
    catch { return null }
  })
  const [editing, setEditing] = useState(false)

  // Re-check localStorage in case it was set after first render
  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Nunito:wght@400;600;700;800&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root { height: 100%; background: var(--bg, #0a0a0a); font-family: 'Nunito', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--surface); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar, #2a2a2a); border-radius: 2px; }
        input::placeholder { color: var(--subtext); }
        button { font-family: 'Nunito', sans-serif; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>

          {/* ── HEADER ── */}
          <div style={{
            background: 'var(--header)', borderBottom: '1px solid var(--headerBdr)',
            position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
          }}>
            <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => navigate('/')} style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--border)', border: '1px solid var(--border)',
                color: 'var(--headerText)', fontSize: 16, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>
              <div style={{ flex: 1, fontFamily: 'Rajdhani,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--headerText)', letterSpacing: 0.5 }}>
                Settings
              </div>
              {/* active theme pill */}
              <div style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                background: 'var(--border)', color: 'var(--headerText)',
                border: '1px solid var(--border)', letterSpacing: 0.3,
              }}>
                {theme.emoji} {theme.name}
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px 80px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* ══════════ PROFILE ══════════ */}
            {user ? (
              <div style={{
                background: 'var(--card)', borderRadius: 20, overflow: 'hidden',
                border: '1px solid var(--border)', boxShadow: '0 4px 28px var(--shadow)',
              }}>
                {/* hero */}
                <div style={{
                  padding: '22px 20px 18px', position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(145deg, var(--card) 0%, var(--card2) 100%)',
                  borderBottom: '1px solid var(--border2)',
                }}>
                  <div style={{ position: 'absolute', right: -24, top: -24, width: 130, height: 130, borderRadius: '50%', background: 'var(--accentBg)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 16, top: 14, fontSize: 54, opacity: 0.06, pointerEvents: 'none', userSelect: 'none' }}>🏏</div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
                    <UserAvatar name={user.name} size={66} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3, marginBottom: 2 }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 600, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--accentBg)', border: '1px solid var(--accentRing)',
                        borderRadius: 20, padding: '3px 10px',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
                        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 800, letterSpacing: 0.5 }}>ACTIVE SESSION</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Row icon="✏️" iconBg="var(--accentBg)" label="Edit Profile" sub="Change name, email or password" onClick={() => setEditing(true)} />
                <Row icon="🚪" label="Log Out" sub="Sign out of this account" onClick={handleLogout} danger last />
              </div>
            ) : (
              /* not logged in */
              <div style={{
                background: 'var(--card)', borderRadius: 20, overflow: 'hidden',
                border: '1px solid var(--border)', padding: '32px 20px 22px',
                textAlign: 'center', boxShadow: '0 4px 24px var(--shadow)',
              }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🔐</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Not signed in</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 22, lineHeight: 1.6 }}>
                  Sign in to save your stats and access them across devices
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => navigate('/login')} style={{
                    flex: 1, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
                    color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 0.3,
                  }}>🔑 Log In</button>
                  <button onClick={() => navigate('/register')} style={{
                    flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--card2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontWeight: 800, fontSize: 14,
                  }}>📝 Register</button>
                </div>
              </div>
            )}

            {/* ══════════ THEME ══════════ */}
            <Section label="Appearance">
              <div style={{ padding: '16px 14px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
                  Choose a theme — updates all pages instantly and saves your preference.
                </div>

                {/* 2×2 theme grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  {themes.map(t => {
                    const active = themeId === t.id
                    return (
                      <button key={t.id} onClick={() => setTheme(t.id)} style={{
                        display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 12px',
                        borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
                        background: active ? t.vars['--accentBg'] : t.vars['--card'],
                        border: active ? `2px solid ${t.vars['--accent']}` : `1.5px solid ${t.vars['--border']}`,
                        boxShadow: active
                          ? `0 0 0 3px ${t.vars['--accentRing']}, 0 4px 20px rgba(0,0,0,0.2)`
                          : `0 2px 8px rgba(0,0,0,0.12)`,
                        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                      }}>
                        {/* active tick */}
                        {active && (
                          <div style={{
                            position: 'absolute', top: 8, right: 8, width: 20, height: 20,
                            borderRadius: '50%', background: t.vars['--accent'],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, color: '#fff', fontWeight: 900,
                          }}>✓</div>
                        )}
                        {/* colour swatch strip */}
                        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28, border: `1px solid ${t.vars['--border2']}` }}>
                          {t.preview.map((c, i) => <div key={i} style={{ flex: i === 3 ? 1.5 : 1, background: c }} />)}
                        </div>
                        {/* name + desc */}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: active ? t.vars['--accent'] : t.vars['--text'], marginBottom: 2 }}>
                            {t.emoji} {t.name}
                          </div>
                          <div style={{ fontSize: 10, color: t.vars['--subtext'], fontWeight: 600 }}>{t.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Live scorecard preview */}
                <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${theme.vars['--border']}`, boxShadow: `0 4px 20px ${theme.vars['--shadow']}` }}>
                  <div style={{ background: theme.vars['--header'], padding: '10px 14px', borderBottom: `1px solid ${theme.vars['--headerBdr']}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 13, fontWeight: 700, color: theme.vars['--headerText'] }}>🏏 Live Preview</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.vars['--headerText'], opacity: 0.8 }} />
                      <span style={{ fontSize: 10, color: theme.vars['--headerText'], fontWeight: 800, opacity: 0.9 }}>LIVE</span>
                    </div>
                  </div>
                  <div style={{ background: theme.vars['--surface'], padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: theme.vars['--text'], marginBottom: 2 }}>Team Alpha</div>
                        <div style={{ fontSize: 11, color: theme.vars['--subtext'] }}>vs Team Bravo · 20 overs</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 26, fontWeight: 700, color: theme.vars['--accent'], lineHeight: 1 }}>142/6</div>
                        <div style={{ fontSize: 11, color: theme.vars['--subtext'], marginTop: 2 }}>18.3 overs</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                      {[['CRR', '7.7'], ['Target', '165'], ['Need', '23 off 9']].map(([l, v], i) => (
                        <div key={l} style={{ background: theme.vars['--card'], borderRadius: 9, padding: '7px 6px', textAlign: 'center', border: `1px solid ${theme.vars['--border']}` }}>
                          <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 15, fontWeight: 700, color: i === 0 ? theme.vars['--accent'] : theme.vars['--text2'] }}>{v}</div>
                          <div style={{ fontSize: 9, color: theme.vars['--subtext'], fontWeight: 800, marginTop: 1 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ══════════ ABOUT ══════════ */}
            <Section label="About">
              <Row icon="🏏" iconBg="var(--accentBg)" label="CrickyWorld" sub="Ball-by-ball cricket scorer & records" />
              <Row icon="📱" label="Version" sub="Current build"
                right={<span style={{ fontSize: 11, fontWeight: 800, color: 'var(--subtext)', background: 'var(--card2)', padding: '5px 11px', borderRadius: 20, border: '1px solid var(--border)' }}>v1.0.0</span>}
              />
              <Row icon="🗄️" label="Storage" sub="All data saved to MongoDB server" last />
            </Section>

          </div>
        </div>
      </div>

      {editing && user && (
        <EditProfile user={user} onClose={() => setEditing(false)} onSaved={u => setUser(u)} />
      )}
    </>
  )
}
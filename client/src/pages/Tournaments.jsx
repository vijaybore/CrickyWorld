import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ─── Theme tokens: CrickyWorld Black & Red ────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#181818",
  cardHover: "#1f1f1f",
  border: "#2a2a2a",
  borderHover: "#3a3a3a",
  accent: "#e53e3e",
  accentBright: "#fc4444",
  accentDim: "#3a0a0a",
  accentGlow: "#e53e3e28",
  gold: "#f59e0b",
  goldDim: "#78350f",
  red: "#e53e3e",
  redDim: "#3a0a0a",
  orange: "#f97316",
  sky: "#60a5fa",
  purple: "#a78bfa",
  text: "#f5f5f5",
  textMid: "#a3a3a3",
  textDim: "#525252",
  textFaint: "#1c1c1c",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt2 = (n) => (!isFinite(n) || isNaN(n) ? "0.00" : n.toFixed(2));
const ovsDisp = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const sr = (r, b) => b > 0 ? fmt2((r / b) * 100) : "—";
const econ = (r, b) => b > 0 ? fmt2((r / b) * 6) : "—";

// ─── Schedule format definitions ──────────────────────────────────────────────
const FORMATS = [
  { key: "round_robin", label: "Round Robin", icon: "⟳", desc: "Every team plays against every other team once.", minTeams: 2 },
  { key: "double_rr", label: "Double Round Robin", icon: "⟳⟳", desc: "Every team plays against every other team twice (home & away).", minTeams: 2 },
  { key: "knockout", label: "Knockout", icon: "⚡", desc: "Losing team is eliminated after each match. Winner advances to next round.", minTeams: 2 },
  { key: "top2_final", label: "Top 2 Final", icon: "🥇", desc: "All teams play league matches. Top 2 teams in standings play the Final.", minTeams: 3 },
  { key: "ipl_playoffs", label: "IPL Playoffs", icon: "🏆", desc: "Top 4 teams qualify for Qualifier 1, Eliminator, Qualifier 2, and the Final.", minTeams: 4 },
  { key: "semi_final", label: "Semi Final Format", icon: "🎯", desc: "Top 4 teams qualify for Semi Final 1, Semi Final 2, then the Final.", minTeams: 4 },
];

// ─── Balanced Round Robin (Circle Method) ─────────────────────────────────────
// Generates fixtures so no team plays consecutive back-to-back matches.
// Uses the standard "circle rotation" algorithm for fair scheduling.
function balancedRoundRobin(teams) {
  const ts = [...teams];
  // Pad with BYE if odd number of teams
  if (ts.length % 2 !== 0) ts.push("__BYE__");
  const n = ts.length;
  const rounds = n - 1;
  const perRound = n / 2;
  const schedule = []; // schedule[round] = array of [t1, t2]

  const arr = [...ts];
  for (let r = 0; r < rounds; r++) {
    const round = [];
    for (let i = 0; i < perRound; i++) {
      const t1 = arr[i];
      const t2 = arr[n - 1 - i];
      if (t1 !== "__BYE__" && t2 !== "__BYE__") {
        round.push([t1, t2]);
      }
    }
    schedule.push(round);
    // Rotate all except the first element
    const last = arr.pop();
    arr.splice(1, 0, last);
  }
  return schedule; // array of rounds, each round has pairs
}

function makeFixtures(teams, fmt) {
  const out = [];
  let n = 1;
  const mk = (t1, t2, stage) => ({ id: uid(), team1: t1, team2: t2, stage, status: "scheduled", matchNo: n++, date: "", time: "", overs: null });

  // Helper: generate balanced league fixtures (interleaved round by round)
  const leagueFixtures = (ts, stage) => {
    const rounds = balancedRoundRobin(ts);
    rounds.forEach(round => {
      round.forEach(([t1, t2]) => out.push(mk(t1, t2, stage)));
    });
  };

  if (fmt === "round_robin") {
    leagueFixtures(teams, "League");
  } else if (fmt === "double_rr") {
    leagueFixtures(teams, "League");
    // Second leg: swap home/away
    const rounds2 = balancedRoundRobin(teams);
    rounds2.forEach(round => {
      round.forEach(([t1, t2]) => out.push(mk(t2, t1, "League (Leg 2)")));
    });
  } else if (fmt === "knockout") {
    const sh = [...teams].sort(() => Math.random() - 0.5);
    const rounds = Math.ceil(Math.log2(sh.length));
    let rt = [...sh];
    const rNames = ["Final", "Semi Final", "Quarter Final", "Round of 16"];
    for (let r = 0; r < rounds; r++) {
      const label = rNames[rounds - 1 - r] || `Round ${r + 1}`;
      for (let i = 0; i < Math.floor(rt.length / 2); i++)
        out.push(mk(rt[i * 2] || "TBD", rt[i * 2 + 1] || "TBD", label));
      rt = Array(Math.ceil(rt.length / 2)).fill("TBD");
    }
  } else if (fmt === "top2_final") {
    leagueFixtures(teams, "League");
    out.push(mk("1st Place", "2nd Place", "Final"));
  } else if (fmt === "ipl_playoffs") {
    leagueFixtures(teams, "League");
    out.push(mk("1st", "2nd", "Qualifier 1"));
    out.push(mk("3rd", "4th", "Eliminator"));
    out.push(mk("Q1 Loser", "Elim Winner", "Qualifier 2"));
    out.push(mk("Q1 Winner", "Q2 Winner", "Final"));
  } else if (fmt === "semi_final") {
    if (teams.length > 4) {
      leagueFixtures(teams, "League");
    }
    const sf = teams.length <= 4;
    out.push(mk(sf ? teams[0] || "T1" : "1st", sf ? teams[3] || "T4" : "4th", "Semi Final 1"));
    out.push(mk(sf ? teams[1] || "T2" : "2nd", sf ? teams[2] || "T3" : "3rd", "Semi Final 2"));
    out.push(mk("SF1 Winner", "SF2 Winner", "Final"));
  }
  return out;
}

function calcTable(teams, fixtures, liveMatches) {
  // liveMatches: array of MongoDB match objects fetched from API
  const tbl = {};
  teams.forEach(t => { tbl[t] = { team: t, p: 0, w: 0, l: 0, nr: 0, pts: 0, rf: 0, of: 0, ra: 0, oa: 0 }; });
  fixtures.forEach(f => {
    if (f.status !== "completed") return;
    // Find match by realMatchId (MongoDB _id) or legacy matchId
    const mid = f.realMatchId || f.matchId;
    if (!mid) return;
    const m = liveMatches.find(x => (x._id || x.id) === mid);
    if (!m || !tbl[f.team1] || !tbl[f.team2]) {
      // Still count points even without full match data if result stored on fixture
      if (f.result) {
        tbl[f.team1].p++; tbl[f.team2].p++;
        const res = f.result || "";
        if (res.includes(f.team1 + " won")) { tbl[f.team1].w++; tbl[f.team1].pts += 2; tbl[f.team2].l++; }
        else if (res.includes(f.team2 + " won")) { tbl[f.team2].w++; tbl[f.team2].pts += 2; tbl[f.team1].l++; }
        else { tbl[f.team1].pts++; tbl[f.team2].pts++; tbl[f.team1].nr++; tbl[f.team2].nr++; }
      }
      return;
    }
    tbl[f.team1].p++; tbl[f.team2].p++;
    const result = m.result || "";
    if (!result || result.includes("Tied")) {
      tbl[f.team1].pts++; tbl[f.team2].pts++;
      tbl[f.team1].nr++; tbl[f.team2].nr++;
    } else if (result.includes(f.team1 + " won")) {
      tbl[f.team1].w++; tbl[f.team1].pts += 2; tbl[f.team2].l++;
    } else if (result.includes(f.team2 + " won")) {
      tbl[f.team2].w++; tbl[f.team2].pts += 2; tbl[f.team1].l++;
    }
    const maxB = (m.overs || 10) * 6;
    ["innings1", "innings2"].forEach(k => {
      const inn = m[k]; if (!inn) return;
      const team = inn.battingTeam;
      if (!tbl[team]) return;
      tbl[team].rf += inn.runs || 0; tbl[team].of += (inn.balls || maxB) / 6;
      const opp = k === "innings1" ? m.innings2 : m.innings1;
      if (opp) { tbl[team].ra += opp.runs || 0; tbl[team].oa += (opp.balls || maxB) / 6; }
    });
  });
  return Object.values(tbl).map(r => ({
    ...r, nrr: parseFloat((r.of > 0 && r.oa > 0 ? (r.rf / r.of) - (r.ra / r.oa) : 0).toFixed(3))
  })).sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);
}

// ─── Persist ──────────────────────────────────────────────────────────────────
const SK = "cw_t_v3";
function load() { try { const s = sessionStorage.getItem(SK); return s ? JSON.parse(s) : null; } catch { return null; } }
function persist(s) { try { sessionStorage.setItem(SK, JSON.stringify(s)); } catch {} }

// ─── UI primitives ────────────────────────────────────────────────────────────
function Pill({ label, color = T.accent }) {
  return <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, whiteSpace: "nowrap" }}>{label}</span>;
}

function Btn({ children, onClick, v = "primary", sm, disabled, full, style: sx = {} }) {
  const base = { border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: disabled ? 0.45 : 1, letterSpacing: 0.3, padding: sm ? "6px 14px" : "10px 22px", fontSize: sm ? 12 : 13, width: full ? "100%" : "auto" };
  const vs = {
    primary: { background: `linear-gradient(135deg,${T.accent},#c53030)`, color: "#fff", boxShadow: `0 4px 16px ${T.accentGlow}` },
    ghost: { background: "transparent", color: T.textMid, border: `1px solid ${T.border}` },
    danger: { background: T.redDim, color: "#fca5a5", border: `1px solid ${T.red}44` },
    gold: { background: `linear-gradient(135deg,${T.gold},#d97706)`, color: "#000", boxShadow: `0 4px 16px ${T.gold}30` },
    subtle: { background: T.surface, color: T.textMid, border: `1px solid ${T.border}` },
    red: { background: `linear-gradient(135deg,${T.accent},#c53030)`, color: "#fff", boxShadow: `0 4px 16px ${T.accentGlow}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...(vs[v] || vs.primary), ...sx }}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = "text", sm }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ background: T.bg, border: `1px solid ${focus ? T.accent : T.border}`, borderRadius: 8, color: T.text, padding: sm ? "6px 10px" : "9px 13px", fontSize: 13, outline: "none", fontFamily: "inherit", transition: "border 0.2s", boxShadow: focus ? `0 0 0 3px ${T.accentGlow}` : "none" }} />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "9px 13px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Card({ children, style: sx = {}, glow, hover }) {
  const [h, setH] = useState(false);
  return <div onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
    style={{ background: T.card, border: `1px solid ${glow ? T.accent + "55" : h ? T.borderHover : T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: glow ? `0 0 24px ${T.accentGlow}` : "none", transition: "border 0.18s", ...sx }}>{children}</div>;
}

function SH({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div><div style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{title}</div>{sub && <div style={{ color: T.textDim, fontSize: 12, marginTop: 3 }}>{sub}</div>}</div>
      {action}
    </div>
  );
}

function stagePill(stage) {
  if (!stage) return null;
  const s = stage.toLowerCase();
  const color = s.includes("final") && !s.includes("semi") && !s.includes("quali") ? T.gold
    : s.includes("semi") || s.includes("qualifier") || s.includes("elim") ? T.purple
    : T.accent;
  return <Pill label={stage} color={color} />;
}

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const INIT = { tournaments: [], activeTid: null, view: "home", activeFid: null, activeMid: null };

function reducer(state, action) {
  const upT = (tid, fn) => ({ ...state, tournaments: state.tournaments.map(t => t.id === tid ? fn(t) : t) });

  switch (action.type) {
    case "CREATE_T": {
      const t = { id: uid(), name: action.name, format: "round_robin", defaultOvers: 10, wideRuns: 1, noBallRuns: 1, teamCount: 2, teams: ["", ""], fixtures: [], matches: [], createdAt: Date.now() };
      return { ...state, tournaments: [...state.tournaments, t], activeTid: t.id, view: "setup" };
    }
    case "OPEN_T": return { ...state, activeTid: action.id, view: "fixtures" };
    case "SET_VIEW": return { ...state, view: action.view };
    case "SET_COUNT": return upT(action.tid, t => {
      const c = Math.max(2, Math.min(16, action.c));
      return { ...t, teamCount: c, teams: Array.from({ length: c }, (_, i) => t.teams[i] || "") };
    });
    case "SET_NAME": return upT(action.tid, t => { const teams = [...t.teams]; teams[action.i] = action.v; return { ...t, teams }; });
    case "SAVE_SETTINGS": return upT(action.tid, t => ({ ...t, format: action.fmt, defaultOvers: action.overs, wideRuns: action.wide, noBallRuns: action.nb }));
    case "GEN": return upT(action.tid, t => {
      const valid = (t.teams || []).filter(x => x.trim());
      return { ...t, fixtures: makeFixtures(valid, t.format) };
    });
    case "ADD_FIX": return upT(action.tid, t => ({
      ...t, fixtures: [...(t.fixtures || []), { id: uid(), team1: action.t1, team2: action.t2, stage: action.stage, status: "scheduled", matchNo: (t.fixtures?.length || 0) + 1, date: "", time: "", overs: null }]
    }));
    case "UPD_FIX": return upT(action.tid, t => ({ ...t, fixtures: t.fixtures.map(f => f.id === action.fid ? { ...f, date: action.date, time: action.time, overs: action.overs } : f) }));
    case "DEL_FIX": return upT(action.tid, t => ({ ...t, fixtures: t.fixtures.filter(f => f.id !== action.fid) }));
    case "SET_FIXTURE_MATCH": {
      // Links a real MongoDB match ID to a fixture after API creation
      return upT(action.tid, t => ({
        ...t,
        fixtures: t.fixtures.map(fx =>
          fx.id === action.fid
            ? { ...fx, status: "live", realMatchId: action.matchId, overs: action.overs }
            : fx
        )
      }));
    }

    case "MARK_FIXTURE_COMPLETE": {
      return upT(action.tid, t => ({
        ...t,
        fixtures: t.fixtures.map(fx =>
          fx.realMatchId === action.matchId
            ? { ...fx, status: "completed", result: action.result }
            : fx
        )
      }));
    }

    case "START_MATCH": return { ...state, activeFid: action.fid, view: "matchSetup" };
    case "RESUME": return { ...state, activeFid: action.fid, activeMid: action.mid, view: "scoring" };

    case "CONFIRM_START": {
      const t = state.tournaments.find(x => x.id === action.tid);
      const f = t.fixtures.find(x => x.id === action.fid);
      const bat2 = action.batFirst === f.team1 ? f.team2 : f.team1;
      const m = {
        id: uid(), fixtureId: f.id, team1: f.team1, team2: f.team2, t1p: action.t1p, t2p: action.t2p,
        overs: action.overs, toss: action.toss, batFirst: action.batFirst, status: "innings1", result: "", winner: "",
        innings1: { battingTeam: action.batFirst, runs: 0, wickets: 0, balls: 0, ballByBall: [], bat: [], bowl: [] },
        innings2: { battingTeam: bat2, runs: 0, wickets: 0, balls: 0, ballByBall: [], bat: [], bowl: [] },
        wideRuns: t.wideRuns ?? 1, noBallRuns: t.noBallRuns ?? 1,
        striker: "", nonStriker: "", bowler: "",
      };
      const newTs = state.tournaments.map(t2 => {
        if (t2.id !== action.tid) return t2;
        return { ...t2, matches: [...(t2.matches || []), m], fixtures: t2.fixtures.map(fx => fx.id === f.id ? { ...fx, status: "live", matchId: m.id, overs: action.overs, t1p: action.t1p, t2p: action.t2p } : fx) };
      });
      return { ...state, tournaments: newTs, activeMid: m.id, view: "scoring" };
    }

    case "ADD_BALL": {
      const newTs = state.tournaments.map(t => {
        if (t.id !== action.tid) return t;
        const mi = t.matches.findIndex(m => m.id === action.mid);
        if (mi === -1) return t;
        let m = { ...t.matches[mi] };
        const ik = m.status === "innings1" ? "innings1" : "innings2";
        let inn = { ...m[ik], bat: [...m[ik].bat], bowl: [...m[ik].bowl], ballByBall: [...m[ik].ballByBall] };
        const b = action.ball;
        const extra = b.isWide ? (m.wideRuns || 1) : b.isNoBall ? (m.noBallRuns || 1) : 0;
        const tot = b.runs + extra;

        inn.ballByBall.push({ ...b, totalRuns: tot });
        inn.runs += tot;
        if (!b.isWide && !b.isNoBall) inn.balls++;
        if (b.isWicket) inn.wickets++;

        let bi = inn.bat.findIndex(p => p.name === b.bat);
        if (bi === -1) { inn.bat.push({ name: b.bat, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }); bi = inn.bat.length - 1; }
        else inn.bat[bi] = { ...inn.bat[bi] };
        if (!b.isWide) { inn.bat[bi].runs += b.runs; inn.bat[bi].balls++; if (b.runs === 4) inn.bat[bi].fours++; if (b.runs === 6) inn.bat[bi].sixes++; }
        if (b.isWicket) inn.bat[bi].out = true;

        let bwi = inn.bowl.findIndex(p => p.name === b.bowl);
        if (bwi === -1) { inn.bowl.push({ name: b.bowl, balls: 0, runs: 0, wkts: 0, wides: 0, nb: 0 }); bwi = inn.bowl.length - 1; }
        else inn.bowl[bwi] = { ...inn.bowl[bwi] };
        inn.bowl[bwi].runs += tot;
        if (b.isWide) inn.bowl[bwi].wides++;
        else if (b.isNoBall) inn.bowl[bwi].nb++;
        else inn.bowl[bwi].balls++;
        if (b.isWicket) inn.bowl[bwi].wkts++;

        m[ik] = inn;
        m.striker = action.striker;
        m.nonStriker = action.nonStriker;
        m.bowler = b.bowl;
        if (!b.isWide && !b.isNoBall && inn.balls % 6 === 0 && inn.balls > 0) { m.striker = action.nonStriker; m.nonStriker = action.striker; }

        const maxB = m.overs * 6;
        if (inn.balls >= maxB || inn.wickets >= 10) {
          if (m.status === "innings1") { m.status = "innings2"; m.striker = ""; m.nonStriker = ""; m.bowler = ""; }
          else {
            m.status = "completed";
            const i2 = m.innings2, i1 = m.innings1;
            if (i2.runs > i1.runs) { m.winner = i2.battingTeam; m.result = `${i2.battingTeam} won by ${10 - i2.wickets} wickets`; }
            else if (i1.runs > i2.runs) { m.winner = i1.battingTeam; m.result = `${i1.battingTeam} won by ${i1.runs - i2.runs} runs`; }
            else { m.result = "Match Tied"; m.winner = ""; }
          }
        }
        const nm = [...t.matches]; nm[mi] = m;
        const nf = t.fixtures.map(f2 => {
          if (f2.id !== m.fixtureId) return f2;
          return m.status === "completed" ? { ...f2, status: "completed", result: m.result, matchId: m.id } : { ...f2, matchId: m.id };
        });
        return { ...t, matches: nm, fixtures: nf };
      });
      return { ...state, tournaments: newTs };
    }

    case "UNDO": {
      const newTs = state.tournaments.map(t => {
        if (t.id !== action.tid) return t;
        const mi = t.matches.findIndex(m => m.id === action.mid);
        if (mi === -1) return t;
        let m = { ...t.matches[mi] };
        const ik = m.status === "innings1" ? "innings1" : "innings2";
        let inn = { ...m[ik], bat: [...m[ik].bat], bowl: [...m[ik].bowl], ballByBall: [...m[ik].ballByBall] };
        if (!inn.ballByBall.length) return t;
        const lb = inn.ballByBall.pop();
        inn.runs -= lb.totalRuns;
        if (!lb.isWide && !lb.isNoBall) inn.balls--;
        if (lb.isWicket) inn.wickets--;
        inn.bat = inn.bat.map(p => { if (p.name !== lb.bat) return p; const np = { ...p }; if (!lb.isWide) { np.runs -= lb.runs; np.balls--; if (lb.runs === 4) np.fours--; if (lb.runs === 6) np.sixes--; } if (lb.isWicket) np.out = false; return np; });
        inn.bowl = inn.bowl.map(p => { if (p.name !== lb.bowl) return p; const np = { ...p }; np.runs -= lb.totalRuns; if (lb.isWide) np.wides--; else if (lb.isNoBall) np.nb--; else np.balls--; if (lb.isWicket) np.wkts--; return np; });
        m[ik] = inn;
        const nm = [...t.matches]; nm[mi] = m;
        return { ...t, matches: nm };
      });
      return { ...state, tournaments: newTs };
    }

    case "UPD_OVERS": {
      return upT(action.tid, t => ({ ...t, matches: t.matches.map(m => m.id === action.mid ? { ...m, overs: action.overs } : m) }));
    }

    default: return state;
  }
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ state, dispatch }) {
  const [name, setName] = useState("");
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle,${T.accent}33,transparent)`, border: `2px solid ${T.accent}44`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🏆</div>
        <h1 style={{ margin: 0, color: T.text, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Tournaments</h1>
        <p style={{ color: T.textDim, marginTop: 6, fontSize: 13 }}>Create and manage cricket tournaments with live scoring</p>
      </div>

      {/* New Tournament */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px", marginBottom: 24 }}>
        <div style={{ color: T.accent, fontWeight: 800, fontSize: 10, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>New Tournament</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field placeholder="e.g. Office Cup 2025, IPL Season 2…" value={name} onChange={setName} /></div>
          <Btn onClick={() => { if (name.trim()) { dispatch({ type: "CREATE_T", name: name.trim() }); setName(""); } }} disabled={!name.trim()} style={{ alignSelf: "flex-end" }}>Create →</Btn>
        </div>
      </div>

      {/* Existing tournaments */}
      {state.tournaments.length > 0 && (
        <>
          <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 10 }}>YOUR TOURNAMENTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...state.tournaments].reverse().map(t => {
              const done = (t.fixtures || []).filter(f => f.status === "completed").length;
              const live = (t.fixtures || []).filter(f => f.status === "live").length;
              const total = (t.fixtures || []).length;
              const fmt = FORMATS.find(f => f.key === t.format);
              return (
                <div key={t.id} onClick={() => dispatch({ type: "OPEN_T", id: t.id })}
                  style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + "55"; e.currentTarget.style.background = T.cardHover; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ color: T.textDim, fontSize: 12, marginTop: 3, display: "flex", gap: 12 }}>
                      <span>{(t.teams || []).filter(x => x).length} teams</span>
                      <span>{done}/{total} played</span>
                      {live > 0 && <span style={{ color: T.accent }}>● {live} live</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {fmt && <Pill label={fmt.label} color={T.accent} />}
                    <span style={{ color: T.textDim, fontSize: 18 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────
function Setup({ t, dispatch }) {
  const [fmt, setFmt] = useState(t.format || "round_robin");
  const [overs, setOvers] = useState(String(t.defaultOvers || 10));
  const [wide, setWide] = useState(String(t.wideRuns ?? 1));
  const [nb, setNb] = useState(String(t.noBallRuns ?? 1));
  const [count, setCount] = useState(String(t.teamCount || 2));
  const [saved, setSaved] = useState(false);

  const curFmt = FORMATS.find(f => f.key === fmt);
  const valid = (t.teams || []).filter(x => x.trim());
  const canGen = valid.length >= (curFmt?.minTeams || 2);

  const saveSettings = () => {
    dispatch({ type: "SAVE_SETTINGS", tid: t.id, fmt, overs: parseInt(overs) || 10, wide: parseInt(wide) || 1, nb: parseInt(nb) || 1 });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const handleCount = (v) => {
    setCount(v);
    const n = parseInt(v);
    if (n >= 2 && n <= 16) dispatch({ type: "SET_COUNT", tid: t.id, c: n });
  };

  const gen = () => {
    dispatch({ type: "SAVE_SETTINGS", tid: t.id, fmt, overs: parseInt(overs) || 10, wide: parseInt(wide) || 1, nb: parseInt(nb) || 1 });
    dispatch({ type: "GEN", tid: t.id });
    dispatch({ type: "SET_VIEW", view: "fixtures" });
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>
      {/* Format */}
      <div style={{ marginBottom: 24 }}>
        <SH title="Schedule Format" sub="Choose how your tournament will be structured" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FORMATS.map(f => (
            <div key={f.key} onClick={() => setFmt(f.key)}
              style={{ background: fmt === f.key ? T.accentDim : T.card, border: `2px solid ${fmt === f.key ? T.accent : T.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ color: fmt === f.key ? T.accent : T.text, fontWeight: 700, fontSize: 13 }}>{f.label}</span>
              </div>
              <div style={{ color: T.textDim, fontSize: 11, lineHeight: 1.4 }}>{f.desc}</div>
              <div style={{ marginTop: 8 }}><Pill label={`Min ${f.minTeams} teams`} color={T.textDim} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 14 }}>MATCH SETTINGS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Field label="Default Overs" type="number" value={overs} onChange={setOvers} />
          <Field label="Wide Penalty (runs)" type="number" value={wide} onChange={setWide} />
          <Field label="No-Ball Penalty (runs)" type="number" value={nb} onChange={setNb} />
        </div>
        <Btn v={saved ? "subtle" : "ghost"} sm onClick={saveSettings}>{saved ? "✓ Saved" : "Save Settings"}</Btn>
      </Card>

      {/* Teams */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 14 }}>TEAMS</div>
        <div style={{ marginBottom: 16, maxWidth: 200 }}>
          <Field label="Number of teams" type="number" value={count} onChange={handleCount} />
        </div>
        {(t.teams || []).length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {t.teams.map((name, i) => (
              <Field key={i} label={`Team ${i + 1}`} value={name} onChange={v => dispatch({ type: "SET_NAME", tid: t.id, i, v })} placeholder={`Team ${i + 1} name`} />
            ))}
          </div>
        )}
      </Card>

      {/* Generate */}
      <Card glow={canGen} style={{ background: canGen ? T.accentDim : T.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ color: canGen ? T.accent : T.textDim, fontWeight: 700, fontSize: 14 }}>
              {canGen ? `Ready! ${valid.length} teams · ${curFmt?.label}` : `Add at least ${curFmt?.minTeams} teams to generate fixtures`}
            </div>
            {canGen && <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>{curFmt?.desc}</div>}
          </div>
          <Btn onClick={gen} disabled={!canGen} style={{ flexShrink: 0 }}>⚡ Generate Fixtures →</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── FIXTURES ─────────────────────────────────────────────────────────────────
function Fixtures({ t, dispatch }) {
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);
  const [eDate, setEDate] = useState(""); const [eTime, setETime] = useState(""); const [eOvs, setEOvs] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [aT1, setAT1] = useState(""); const [aT2, setAT2] = useState(""); const [aStage, setAStage] = useState("League");

  const valid = (t.teams || []).filter(x => x.trim());
  const all = t.fixtures || [];
  const stages = [...new Set(all.map(f => f.stage))];
  const ORDER = ["League", "League (Leg 2)", "Round 1", "Round 2", "Quarter Final", "Eliminator", "Semi Final", "Semi Final 1", "Semi Final 2", "Qualifier 1", "Qualifier 2", "Final"];
  const sorted = [...stages].sort((a, b) => { const ia = ORDER.findIndex(s => a.includes(s)), ib = ORDER.findIndex(s => b.includes(s)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });

  const startEdit = (f) => { setEditId(f.id); setEDate(f.date || ""); setETime(f.time || ""); setEOvs(String(f.overs || t.defaultOvers || 10)); };
  const saveEdit = (fid) => { dispatch({ type: "UPD_FIX", tid: t.id, fid, date: eDate, time: eTime, overs: parseInt(eOvs) || t.defaultOvers }); setEditId(null); };

  const done = all.filter(f => f.status === "completed").length;
  const live = all.filter(f => f.status === "live").length;
  const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

      {/* Stats bar */}
      {all.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
          {[
            ["Total", all.length, T.textMid],
            ["Played", done, T.accent],
            ["Live", live, T.gold],
            ["Left", all.length - done - live, T.textDim],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ color: c, fontSize: 22, fontWeight: 900 }}>{v}</div>
              <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {all.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: T.textDim, fontSize: 11 }}>Tournament Progress</span>
            <span style={{ color: T.accent, fontSize: 11, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: T.border, borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${T.accent},${T.accentBright})`, borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      )}

      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>📅 Match Schedule</div>
          <div style={{ color: T.textDim, fontSize: 12, marginTop: 2 }}>
            {all.length === 0 ? "No fixtures yet — generate from Setup" : `${all.length} matches · ${valid.length} teams`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {valid.length >= 2 && (
            <Btn sm v="ghost" onClick={() => { if (window.confirm("Regenerate all fixtures? Live/completed matches will be cleared.")) dispatch({ type: "GEN", tid: t.id }); }}>↺ Regenerate</Btn>
          )}
          <Btn sm v="subtle" onClick={() => setAddOpen(v => !v)}>+ Add</Btn>
        </div>
      </div>

      {/* Add match panel */}
      {addOpen && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ color: T.accent, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>ADD CUSTOM MATCH</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Team 1" value={aT1} onChange={setAT1} placeholder="Team name" />
            <Field label="Team 2" value={aT2} onChange={setAT2} placeholder="Team name" />
            <Field label="Stage" value={aStage} onChange={setAStage} placeholder="e.g. Final" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn sm onClick={() => { if (aT1 && aT2 && aT1 !== aT2) { dispatch({ type: "ADD_FIX", tid: t.id, t1: aT1, t2: aT2, stage: aStage }); setAddOpen(false); setAT1(""); setAT2(""); } }} disabled={!aT1 || !aT2 || aT1 === aT2}>Add Match</Btn>
            <Btn sm v="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Empty state */}
      {all.length === 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "52px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ color: T.textMid, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No fixtures generated yet</div>
          <div style={{ color: T.textDim, fontSize: 13, marginBottom: 20 }}>Go to Setup to configure teams and generate your match schedule</div>
          <Btn sm onClick={() => dispatch({ type: "SET_VIEW", view: "setup" })}>← Go to Setup</Btn>
        </div>
      )}

      {/* Fixtures by stage */}
      {sorted.map(stage => {
        const stageFix = all.filter(f => f.stage === stage);
        const sdone = stageFix.filter(f => f.status === "completed").length;
        return (
          <div key={stage} style={{ marginBottom: 28 }}>
            {/* Stage header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
              {stagePill(stage)}
              <span style={{ color: T.textDim, fontSize: 11 }}>{sdone}/{stageFix.length} played</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stageFix.map((f, idx) => (
                <div key={f.id} style={{
                  background: T.card,
                  border: `1px solid ${f.status === "live" ? T.gold + "55" : f.status === "completed" ? T.accent + "22" : T.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "border 0.15s",
                }}>
                  {/* Left accent bar */}
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 3, background: f.status === "live" ? T.gold : f.status === "completed" ? T.accent : T.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "12px 14px" }}>
                      {editId === f.id ? (
                        // Edit mode
                        <div>
                          <div style={{ color: T.accent, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>EDIT MATCH #{f.matchNo}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <Field sm label="Date" value={eDate} onChange={setEDate} placeholder="e.g. 15 Mar" />
                            <Field sm label="Time" value={eTime} onChange={setETime} placeholder="e.g. 6:00 PM" />
                            <Field sm label="Overs" type="number" value={eOvs} onChange={setEOvs} />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Btn sm onClick={() => saveEdit(f.id)}>✓ Save</Btn>
                            <Btn sm v="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Match number */}
                            <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>MATCH {f.matchNo}</div>

                            {/* Teams */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{f.team1}</span>
                              <span style={{ color: T.textDim, fontSize: 11, background: T.surface, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>VS</span>
                              <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{f.team2}</span>
                            </div>

                            {/* Meta info */}
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {f.date && <span style={{ color: T.textDim, fontSize: 11 }}>📅 {f.date}{f.time ? ` · ${f.time}` : ""}</span>}
                              <span style={{ color: T.textDim, fontSize: 11 }}>🎯 {f.overs || t.defaultOvers || 10} overs</span>
                              {f.status === "completed" && f.result && (
                                <span style={{ color: T.accent, fontSize: 11, fontWeight: 700 }}>✓ {f.result}</span>
                              )}
                              {f.status === "live" && (
                                <span style={{ color: T.gold, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 6, height: 6, background: T.gold, borderRadius: "50%", display: "inline-block" }} />
                                  LIVE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
                            {f.status === "completed" ? (
                              <div style={{ background: T.accent + "18", color: T.accent, border: `1px solid ${T.accent}33`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>Done ✓</div>
                            ) : f.status === "live" && f.realMatchId ? (
                              <Btn sm v="gold" onClick={() => navigate(`/scoring/${f.realMatchId}`)}>▶ Resume</Btn>
                            ) : (
                              <>
                                <button onClick={() => startEdit(f)}
                                  style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.textMid, cursor: "pointer", padding: "5px 10px", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>✎</button>
                                <button onClick={() => dispatch({ type: "DEL_FIX", tid: t.id, fid: f.id })}
                                  style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.textDim, cursor: "pointer", padding: "5px 9px", fontSize: 12, fontFamily: "inherit" }}>✕</button>
                                <Btn sm onClick={() => dispatch({ type: "START_MATCH", fid: f.id })}>▶ Start</Btn>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function PointsTable({ t, dispatch }) {
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    // Fetch all real match IDs associated with this tournament's fixtures
    const realIds = (t.fixtures || []).map(f => f.realMatchId).filter(Boolean);
    if (!realIds.length) return;
    Promise.all(
      realIds.map(id =>
        axios.get(`/api/matches/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.data).catch(() => null)
      )
    ).then(results => {
      const valid = results.filter(Boolean);
      setLiveMatches(valid);
      // Sync completed fixtures
      valid.forEach(m => {
        if (m.status === "completed" && m.result) {
          dispatch({ type: "MARK_FIXTURE_COMPLETE", tid: t.id, matchId: m._id, result: m.result });
        }
      });
    });
  }, [t.id]);

  const table = calcTable((t.teams || []).filter(x => x.trim()), t.fixtures || [], liveMatches);
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>
      <SH title="📊 Points Table" sub="Auto-updates after each completed match" />
      <Card style={{ padding: "0 4px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{["#", "Team", "P", "W", "L", "NR", "Pts", "NRR"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Team" ? "left" : "center", color: T.textDim, fontWeight: 700, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {table.length === 0 && <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: T.textDim }}>No completed matches yet</td></tr>}
            {table.map((r, i) => (
              <tr key={r.team} style={{ borderTop: `1px solid ${T.border}`, background: i < 2 ? "#0a2118" : "transparent" }}>
                <td style={{ padding: "10px 12px", textAlign: "center", color: i < 2 ? T.accent : T.textDim, fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: "10px 12px", color: T.text, fontWeight: 700 }}>{i === 0 ? "🥇 " : i === 1 ? "🥈 " : ""}{r.team}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{r.p}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: T.accent, fontWeight: 700 }}>{r.w}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{r.l}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{r.nr}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: T.gold, fontWeight: 900, fontSize: 15 }}>{r.pts}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: r.nrr >= 0 ? T.accent : T.red, fontWeight: 600 }}>{r.nrr >= 0 ? "+" : ""}{r.nrr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function TStats({ t }) {
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const realIds = (t.fixtures || []).map(f => f.realMatchId).filter(Boolean);
    if (!realIds.length) return;
    Promise.all(
      realIds.map(id =>
        axios.get(`/api/matches/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.data).catch(() => null)
      )
    ).then(results => setLiveMatches(results.filter(Boolean)));
  }, [t.id]);

  // Build stats from live API matches (use battingStats/bowlingStats fields from MongoDB)
  const matches = liveMatches.filter(m => m.status === "completed");
  const ps = {};
  matches.forEach(m => {
    ["innings1", "innings2"].forEach(k => {
      const inn = m[k]; if (!inn) return;
      // Support both MongoDB field names (battingStats/bowlingStats) and legacy (bat/bowl)
      (inn.battingStats || inn.bat || []).forEach(b => {
        if (!ps[b.name]) ps[b.name] = { name: b.name, ms: new Set(), runs: 0, balls: 0, hs: 0, f4: 0, s6: 0, wkts: 0, wb: 0, wr: 0 };
        ps[b.name].ms.add(m._id || m.id); ps[b.name].runs += b.runs || 0; ps[b.name].balls += b.balls || 0;
        if ((b.runs || 0) > ps[b.name].hs) ps[b.name].hs = b.runs || 0;
        ps[b.name].f4 += b.fours || 0; ps[b.name].s6 += b.sixes || 0;
      });
      (inn.bowlingStats || inn.bowl || []).forEach(b => {
        if (!ps[b.name]) ps[b.name] = { name: b.name, ms: new Set(), runs: 0, balls: 0, hs: 0, f4: 0, s6: 0, wkts: 0, wb: 0, wr: 0 };
        ps[b.name].ms.add(m._id || m.id);
        ps[b.name].wkts += b.wickets || b.wkts || 0;
        ps[b.name].wb += b.balls || 0;
        ps[b.name].wr += b.runs || 0;
      });
    });
  });
  const arr = Object.values(ps).map(p => ({ ...p, mc: p.ms.size }));
  const bats = [...arr].sort((a, b) => b.runs - a.runs).slice(0, 10);
  const bowls = [...arr].filter(p => p.wkts > 0).sort((a, b) => b.wkts - a.wkts || (a.wr / (a.wb || 1)) - (b.wr / (b.wb || 1))).slice(0, 10);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[["Matches Played", matches.length, T.accent], ["Total Sixes 🎆", arr.reduce((s, p) => s + p.s6, 0), T.gold], ["Total Wickets", arr.reduce((s, p) => s + p.wkts, 0), T.purple]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>{l.toUpperCase()}</div>
            <div style={{ color: c, fontSize: 28, fontWeight: 900 }}>{v}</div>
          </Card>
        ))}
      </div>

      {[["🏏 Top Run Scorers", bats, [["Player", false, T.text], ["M", true, T.textMid], ["Runs", true, T.gold], ["Balls", true, T.textMid], ["HS", true, T.textMid], ["4s", true, T.textMid], ["6s", true, T.textMid], ["SR", true, T.accent]], r => [r.name, r.mc, r.runs, r.balls, r.hs, r.f4, r.s6, sr(r.runs, r.balls)]],
        ["🎳 Top Wicket Takers", bowls, [["Player", false, T.text], ["M", true, T.textMid], ["Wkts", true, T.gold], ["Overs", true, T.textMid], ["Runs", true, T.textMid], ["Econ", true, T.accent]], r => [r.name, r.mc, r.wkts, ovsDisp(r.wb), r.wr, econ(r.wr, r.wb)]]
      ].map(([title, rows, cols, vals]) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{title}</div>
          <Card style={{ padding: "0 4px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{cols.map(([h]) => <th key={h} style={{ padding: "8px 10px", textAlign: h === "Player" ? "left" : "center", color: T.textDim, fontWeight: 700, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: "center", color: T.textDim }}>No data yet</td></tr>}
                {rows.map((r, ri) => {
                  const vs = vals(r);
                  return <tr key={ri} style={{ borderTop: `1px solid ${T.border}` }}>{cols.map(([h, center, color], ci) => <td key={h} style={{ padding: "9px 10px", textAlign: center ? "center" : "left", color, fontWeight: ci === 2 ? 700 : 400 }}>{vs[ci]}</td>)}</tr>;
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ─── MATCH SETUP ──────────────────────────────────────────────────────────────
function MatchSetup({ t, f, dispatch }) {
  const navigate = useNavigate();
  const [toss, setToss] = useState(f.team1);
  const [batFirst, setBatFirst] = useState(f.team1);
  const [overs, setOvers] = useState(String(f.overs || t.defaultOvers || 10));
  const [t1p, setT1p] = useState((f.t1p || []).join(", "));
  const [t2p, setT2p] = useState((f.t2p || []).join(", "));
  const [qName, setQName] = useState(""); const [qTeam, setQTeam] = useState(f.team1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parse = s => s.split(",").map(x => x.trim()).filter(Boolean);
  const addQ = () => { if (!qName.trim()) return; qTeam === f.team1 ? setT1p(p => p ? p + ", " + qName.trim() : qName.trim()) : setT2p(p => p ? p + ", " + qName.trim() : qName.trim()); setQName(""); };

  const handleStart = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const t1players = parse(t1p);
      const t2players = parse(t2p);
      const ovNum = parseInt(overs) || 10;
      const bat2 = batFirst === f.team1 ? f.team2 : f.team1;

      // Create real match in MongoDB
      const { data: match } = await axios.post("/api/matches", {
        team1: f.team1,
        team2: f.team2,
        overs: ovNum,
        tossWinner: toss,
        battingFirst: batFirst,
        wideRuns: t.wideRuns ?? 1,
        noBallRuns: t.noBallRuns ?? 1,
        team1Players: t1players,
        team2Players: t2players,
        tournamentId: t.id,
        tournamentName: t.name,
        fixtureId: f.id,
      }, { headers });

      // Link real match ID to fixture in tournament state
      dispatch({ type: "SET_FIXTURE_MATCH", tid: t.id, fid: f.id, matchId: match._id, overs: ovNum });

      // Navigate to the real Scoring page
      navigate(`/scoring/${match._id}`);
    } catch (err) {
      setError("Failed to start match. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>MATCH SETUP</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          <span style={{ color: T.sky }}>{f.team1}</span>
          <span style={{ color: T.textDim, margin: "0 10px", fontSize: 15 }}>vs</span>
          <span style={{ color: T.purple }}>{f.team2}</span>
        </div>
        <div style={{ marginTop: 6 }}>{stagePill(f.stage)}</div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Sel label="Toss Winner" value={toss} onChange={setToss} options={[{ value: f.team1, label: f.team1 }, { value: f.team2, label: f.team2 }]} />
          <Sel label="Batting First" value={batFirst} onChange={setBatFirst} options={[{ value: f.team1, label: f.team1 }, { value: f.team2, label: f.team2 }]} />
          <Field label="Overs" type="number" value={overs} onChange={setOvers} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {[[f.team1, t1p, setT1p, T.sky], [f.team2, t2p, setT2p, T.purple]].map(([team, val, setter, color]) => (
          <Card key={team}>
            <div style={{ color, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{team} Players</div>
            <textarea value={val} onChange={e => setter(e.target.value)} placeholder="Player1, Player2, Player3…"
              style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", resize: "vertical", minHeight: 88, boxSizing: "border-box", outline: "none" }} />
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>⚡ QUICK ADD PLAYER</div>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={qTeam} onChange={e => setQTeam(e.target.value)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "9px 12px", fontFamily: "inherit", fontSize: 13 }}>
            <option value={f.team1}>{f.team1}</option>
            <option value={f.team2}>{f.team2}</option>
          </select>
          <div style={{ flex: 1 }}><Field placeholder="Player name…" value={qName} onChange={setQName} /></div>
          <Btn sm onClick={addQ} disabled={!qName.trim()} style={{ alignSelf: "flex-end" }}>Add</Btn>
        </div>
      </Card>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: T.red, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <Btn full onClick={handleStart} disabled={loading}>
        {loading ? "⏳ Creating Match…" : "▶ Start Match"}
      </Btn>
    </div>
  );
}

// ─── SCORING ──────────────────────────────────────────────────────────────────
function Scoring({ t, m, f, dispatch }) {
  const [striker, setStriker] = useState(m.striker || "");
  const [nonStriker, setNonStriker] = useState(m.nonStriker || "");
  const [bowler, setBowler] = useState(m.bowler || "");
  const [editOvs, setEditOvs] = useState(false);
  const [newOvs, setNewOvs] = useState(String(m.overs));
  const [tab, setTab] = useState("score");

  const ik = m.status === "innings1" ? "innings1" : "innings2";
  const inn = m[ik];
  const done = m.status === "completed";
  const maxB = m.overs * 6;
  const target = m.status === "innings2" ? m.innings1.runs + 1 : null;

  const batP = inn.battingTeam === m.team1 ? m.t1p : m.t2p;
  const bowlP = inn.battingTeam === m.team1 ? m.t2p : m.t1p;

  const addBall = (runs, opts = {}) => {
    if (done) return;
    if (!striker || !bowler) { alert("Please select striker and bowler first!"); return; }
    dispatch({ type: "ADD_BALL", tid: t.id, mid: m.id, ball: { runs, isWide: opts.wide || false, isNoBall: opts.nb || false, isWicket: opts.wkt || false, bat: striker, bowl: bowler }, striker: opts.wkt ? "" : striker, nonStriker });
    if (opts.wkt) setStriker("");
  };

  const stBat = inn.bat?.find(b => b.name === striker);
  const nsBat = inn.bat?.find(b => b.name === nonStriker);
  const curBwl = inn.bowl?.find(b => b.name === bowler);

  const bc = (b) => b.isWicket ? T.red : (b.isWide || b.isNoBall) ? T.gold : b.totalRuns === 6 ? T.accent : b.totalRuns === 4 ? T.sky : b.totalRuns === 0 ? T.textDim : T.textMid;
  const recent = (inn.ballByBall || []).slice(-12);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>
      {/* Scoreboard */}
      <div style={{ background: `linear-gradient(135deg,${T.card},#0e1c30)`, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>
              {inn.battingTeam?.toUpperCase()} · {ik === "innings1" ? "1ST" : "2ND"} INNINGS
            </div>
            <div style={{ marginTop: 4, lineHeight: 1 }}>
              <span style={{ fontSize: 46, fontWeight: 900, color: T.text, letterSpacing: -1 }}>{inn.runs}</span>
              <span style={{ fontSize: 28, color: T.textDim }}>/</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: T.textDim }}>{inn.wickets}</span>
            </div>
            <div style={{ color: T.textDim, fontSize: 14, marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>{ovsDisp(inn.balls)} / {m.overs} ov</span>
              {target && <span style={{ color: T.gold, fontWeight: 700 }}>Need {Math.max(0, target - inn.runs)} off {Math.max(0, maxB - inn.balls)} balls</span>}
            </div>
            {m.status === "innings2" && (
              <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>
                {m.innings1.battingTeam}: {m.innings1.runs}/{m.innings1.wickets} ({ovsDisp(m.innings1.balls)} ov)
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {editOvs ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" value={newOvs} onChange={e => setNewOvs(e.target.value)}
                  style={{ width: 54, background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6, color: T.text, padding: "5px 8px", textAlign: "center", fontFamily: "inherit", fontSize: 14 }} />
                <Btn sm onClick={() => { dispatch({ type: "UPD_OVERS", tid: t.id, mid: m.id, overs: parseInt(newOvs) || m.overs }); setEditOvs(false); }}>✓</Btn>
                <Btn sm v="ghost" onClick={() => setEditOvs(false)}>✕</Btn>
              </div>
            ) : (
              <button onClick={() => setEditOvs(true)} style={{ background: "none", border: `1px dashed ${T.border}`, borderRadius: 8, color: T.textDim, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                {m.overs} overs ✎
              </button>
            )}
          </div>
        </div>
        {/* Recent balls */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {recent.length === 0 && <span style={{ color: T.textFaint, fontSize: 12 }}>No balls yet</span>}
          {recent.map((b, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: bc(b) + "20", border: `2px solid ${bc(b)}55`, color: bc(b), fontSize: 11, fontWeight: 700 }}>
              {b.isWicket ? "W" : b.isWide ? "Wd" : b.isNoBall ? "NB" : b.totalRuns}
            </div>
          ))}
        </div>
      </div>

      {done ? (
        <Card glow style={{ textAlign: "center", padding: "36px 20px", marginBottom: 14 }}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>🏆</div>
          <div style={{ color: T.accent, fontSize: 22, fontWeight: 900 }}>{m.result}</div>
          <div style={{ color: T.textDim, marginTop: 10 }}>Match Completed</div>
          <div style={{ marginTop: 18 }}><Btn v="ghost" sm onClick={() => dispatch({ type: "SET_VIEW", view: "fixtures" })}>← Back to Fixtures</Btn></div>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", gap: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, marginBottom: 14 }}>
            {[["score", "🏏 Scoring"], ["card", "📋 Scorecard"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, background: tab === k ? T.accent : "transparent", color: tab === k ? "#fff" : T.textDim, transition: "all 0.15s" }}>{l}</button>
            ))}
          </div>

          {tab === "score" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Sel label={`Striker · ${inn.battingTeam}`} value={striker} onChange={setStriker}
                  options={[{ value: "", label: "Select…" }, ...(batP || []).map(p => ({ value: p, label: p }))]} />
                <Sel label="Non-Striker" value={nonStriker} onChange={setNonStriker}
                  options={[{ value: "", label: "Select…" }, ...(batP || []).map(p => ({ value: p, label: p }))]} />
                <Sel label={`Bowler · ${inn.battingTeam === m.team1 ? m.team2 : m.team1}`} value={bowler} onChange={setBowler}
                  options={[{ value: "", label: "Select…" }, ...(bowlP || []).map(p => ({ value: p, label: p }))]} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[[striker, stBat, "Striker ●", T.sky], [nonStriker, nsBat, "Non-Striker", T.textDim]].map(([name, stats, lbl, c]) => (
                  <Card key={lbl} style={{ padding: "12px 14px" }}>
                    <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 4 }}>{lbl}</div>
                    <div style={{ color: c, fontWeight: 700, marginBottom: 3 }}>{name || "—"}</div>
                    {stats ? <div style={{ color: T.textDim, fontSize: 12 }}><span style={{ color: T.text, fontWeight: 700 }}>{stats.runs}</span>({stats.balls}) · {stats.fours}×4 · {stats.sixes}×6 · SR {sr(stats.runs, stats.balls)}</div>
                      : <div style={{ color: T.textFaint, fontSize: 11 }}>Not yet batted</div>}
                  </Card>
                ))}
              </div>

              {curBwl && (
                <Card style={{ padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.5 }}>BOWLER</div>
                      <div style={{ color: T.purple, fontWeight: 700, marginTop: 2 }}>{curBwl.name}</div>
                    </div>
                    <div style={{ color: T.textMid, fontSize: 13, textAlign: "right" }}>
                      <div>{ovsDisp(curBwl.balls)} ov · {curBwl.runs}R · <span style={{ color: T.accent, fontWeight: 700 }}>{curBwl.wkts}W</span></div>
                      <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>Economy: {econ(curBwl.runs, curBwl.balls)}</div>
                    </div>
                  </div>
                </Card>
              )}

              <Card style={{ marginBottom: 14 }}>
                <div style={{ color: T.textDim, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>RUNS</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(r => (
                    <button key={r} onClick={() => addBall(r)} style={{ width: 54, height: 54, borderRadius: 12, fontWeight: 900, fontSize: 22, cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit", border: `2px solid ${r === 4 ? T.sky + "66" : r === 6 ? T.accent + "66" : T.border}`, background: r === 4 ? T.sky + "15" : r === 6 ? T.accent + "15" : T.bg, color: r === 4 ? T.sky : r === 6 ? T.accent : T.text, boxShadow: r === 4 || r === 6 ? `0 0 10px ${r === 4 ? T.sky : T.accent}25` : "none" }}>
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn onClick={() => addBall(0, { wide: true })} style={{ background: T.goldDim, color: T.gold, border: `1px solid ${T.gold}44` }}>Wide +{t.wideRuns ?? 1}</Btn>
                  <Btn onClick={() => addBall(0, { nb: true })} style={{ background: "#1c1917", color: "#a8a29e", border: "1px solid #44403c" }}>No Ball +{t.noBallRuns ?? 1}</Btn>
                  <Btn onClick={() => addBall(0, { wkt: true })} v="danger">🔴 Wicket</Btn>
                  <Btn onClick={() => dispatch({ type: "UNDO", tid: t.id, mid: m.id })} v="ghost">↩ Undo</Btn>
                </div>
              </Card>
            </>
          )}

          {tab === "card" && (
            <div>
              {["innings1", "innings2"].map(k => {
                const i = m[k]; if (!i?.bat?.length) return null;
                return (
                  <div key={k} style={{ marginBottom: 18 }}>
                    <div style={{ color: T.accent, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{i.battingTeam} — {i.runs}/{i.wickets} ({ovsDisp(i.balls)} ov)</div>
                    <Card style={{ padding: "0 4px", marginBottom: 10, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>{["Batsman", "R", "B", "4s", "6s", "SR"].map(h => <th key={h} style={{ padding: "7px 8px", textAlign: h === "Batsman" ? "left" : "center", color: T.textDim, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                        <tbody>{i.bat.map(b => <tr key={b.name} style={{ borderTop: `1px solid ${T.border}` }}><td style={{ padding: "7px 8px", color: b.out ? T.textDim : T.text }}>{b.name}{b.out ? " †" : " *"}</td>{[b.runs, b.balls, b.fours, b.sixes].map((v, vi) => <td key={vi} style={{ padding: "7px 8px", textAlign: "center", color: T.textMid }}>{v}</td>)}<td style={{ padding: "7px 8px", textAlign: "center", color: T.gold }}>{sr(b.runs, b.balls)}</td></tr>)}</tbody>
                      </table>
                    </Card>
                    {i.bowl?.length > 0 && (
                      <Card style={{ padding: "0 4px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead><tr>{["Bowler", "O", "R", "W", "Wd", "NB", "Econ"].map(h => <th key={h} style={{ padding: "7px 8px", textAlign: h === "Bowler" ? "left" : "center", color: T.textDim, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                          <tbody>{i.bowl.map(b => <tr key={b.name} style={{ borderTop: `1px solid ${T.border}` }}><td style={{ padding: "7px 8px", color: T.text }}>{b.name}</td>{[ovsDisp(b.balls), b.runs, b.wkts, b.wides || 0, b.nb || 0].map((v, vi) => <td key={vi} style={{ padding: "7px 8px", textAlign: "center", color: vi === 2 ? T.accent : T.textMid, fontWeight: vi === 2 ? 700 : 400 }}>{v}</td>)}<td style={{ padding: "7px 8px", textAlign: "center", color: T.gold }}>{econ(b.runs, b.balls)}</td></tr>)}</tbody>
                        </table>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function TournamentSystem() {
  const [state, rawD] = useState(() => load() || INIT);
  const dispatch = useCallback(action => {
    rawD(prev => { const next = reducer(prev, action); persist(next); return next; });
  }, []);

  const t = state.activeTid ? state.tournaments.find(x => x.id === state.activeTid) : null;
  const f = t && state.activeFid ? t.fixtures?.find(x => x.id === state.activeFid) : null;

  // Auto-sync: when viewing a tournament, poll live fixtures to mark completed matches
  useEffect(() => {
    if (!t) return;
    const liveFixtures = (t.fixtures || []).filter(fx => fx.status === "live" && fx.realMatchId);
    if (!liveFixtures.length) return;
    const token = localStorage.getItem("token");
    liveFixtures.forEach(fx => {
      axios.get(`/api/matches/${fx.realMatchId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const m = r.data;
          if (m.status === "completed" && m.result) {
            dispatch({ type: "MARK_FIXTURE_COMPLETE", tid: t.id, matchId: m._id, result: m.result });
          }
        }).catch(() => {});
    });
  }, [t?.id, state.view]);

  const isMatch = state.view === "matchSetup";
  const tabs = [["setup", "⚙", "Setup"], ["fixtures", "📅", "Fixtures"], ["standings", "📊", "Table"], ["stats", "📈", "Stats"]];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        input[type=number]::-webkit-inner-spin-button{opacity:0.4}
        button:hover:not(:disabled){filter:brightness(1.12)}
        select option{background:${T.card}}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi 0.2s ease}
      `}</style>

      {/* Nav */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px", height: 52, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => dispatch({ type: "SET_VIEW", view: "home" })} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${T.accent},#c53030)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏏</div>
            <span style={{ color: T.accent, fontWeight: 900, fontSize: 15, letterSpacing: -0.3, fontFamily: "inherit" }}>CrickyWorld</span>
          </button>

          {t && <><span style={{ color: T.textFaint, fontSize: 16 }}>›</span><span style={{ color: T.textMid, fontSize: 13, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span></>}
          {isMatch && f && <><span style={{ color: T.textFaint, fontSize: 16 }}>›</span><span style={{ color: T.gold, fontSize: 12, fontWeight: 700 }}>{f.team1} vs {f.team2}</span></>}

          {t && !isMatch && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
              {tabs.map(([k, icon, label]) => (
                <button key={k} onClick={() => dispatch({ type: "SET_VIEW", view: k })}
                  style={{ background: state.view === k ? T.accent + "18" : "transparent", border: `1px solid ${state.view === k ? T.accent + "55" : "transparent"}`, borderRadius: 8, color: state.view === k ? T.accent : T.textDim, cursor: "pointer", fontFamily: "inherit", padding: "5px 12px", fontSize: 12, fontWeight: 700, transition: "all 0.14s" }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          )}
          {isMatch && <button onClick={() => dispatch({ type: "SET_VIEW", view: "fixtures" })} style={{ marginLeft: "auto", background: "none", border: `1px solid ${T.border}`, borderRadius: 8, color: T.textDim, cursor: "pointer", fontFamily: "inherit", padding: "5px 12px", fontSize: 12 }}>← Fixtures</button>}
        </div>
      </div>

      {/* Sub-bar */}
      {t && !isMatch && (
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px", height: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: T.textDim, fontSize: 11 }}>
              {FORMATS.find(f => f.key === t.format)?.label || t.format} · {(t.teams || []).filter(x => x).length} teams · {t.defaultOvers} overs
            </div>
            <div style={{ color: T.textDim, fontSize: 11 }}>
              {(t.fixtures || []).filter(f => f.status === "completed").length}/{(t.fixtures || []).length} matches played
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="fi" key={state.view}>
        {state.view === "home" && <Home state={state} dispatch={dispatch} />}
        {state.view === "setup" && t && <Setup t={t} dispatch={dispatch} />}
        {state.view === "fixtures" && t && <Fixtures t={t} dispatch={dispatch} />}
        {state.view === "standings" && t && <PointsTable t={t} dispatch={dispatch} />}
        {state.view === "stats" && t && <TStats t={t} />}
        {state.view === "matchSetup" && t && f && <MatchSetup t={t} f={f} dispatch={dispatch} />}
      </div>
    </div>
  );
}
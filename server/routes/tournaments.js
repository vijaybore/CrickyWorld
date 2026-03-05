const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const Tournament = require('../models/Tournament');
const Match      = require('../models/Match');

const JWT_SECRET = 'crickyworld_secret_key_2024';

// ── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// ── File upload setup ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Serve uploaded files
router.use('/files', express.static(uploadDir));

// ── Upload image ─────────────────────────────────────────────────────────────
router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `/api/tournaments/files/${req.file.filename}` });
});

// ── Get all tournaments ──────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const tournaments = await Tournament.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Create tournament ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, overs, teams } = req.body;
    const t = new Tournament({ name, overs: overs || 10, teams: teams || [], createdBy: req.user.userId });
    await t.save();
    res.status(201).json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Get single tournament ────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Update tournament (name, overs, status) ──────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const t = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Delete tournament ────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Add / update team ────────────────────────────────────────────────────────
router.post('/:id/teams', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    t.teams.push(req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/:id/teams/:teamId', auth, async (req, res) => {
  try {
    const t    = await Tournament.findById(req.params.id);
    const team = t.teams.id(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    Object.assign(team, req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id/teams/:teamId', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    t.teams.pull(req.params.teamId);
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Players inside a team ────────────────────────────────────────────────────
router.post('/:id/teams/:teamId/players', auth, async (req, res) => {
  try {
    const t    = await Tournament.findById(req.params.id);
    const team = t.teams.id(req.params.teamId);
    team.players.push(req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/:id/teams/:teamId/players/:playerId', auth, async (req, res) => {
  try {
    const t      = await Tournament.findById(req.params.id);
    const team   = t.teams.id(req.params.teamId);
    const player = team.players.id(req.params.playerId);
    Object.assign(player, req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id/teams/:teamId/players/:playerId', auth, async (req, res) => {
  try {
    const t    = await Tournament.findById(req.params.id);
    const team = t.teams.id(req.params.teamId);
    team.players.pull(req.params.playerId);
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
router.post('/:id/fixtures', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    // auto-generate round-robin or add manually
    const { fixtures } = req.body;
    if (fixtures) {
      t.fixtures.push(...fixtures);
    } else {
      t.fixtures.push(req.body);
    }
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/:id/fixtures/:fixtureId', auth, async (req, res) => {
  try {
    const t       = await Tournament.findById(req.params.id);
    const fixture = t.fixtures.id(req.params.fixtureId);
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
    Object.assign(fixture, req.body);
    await t.save();
    res.json(t);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id/fixtures/:fixtureId', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    t.fixtures.pull(req.params.fixtureId);
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Start a fixture match ─────────────────────────────────────────────────────
router.post('/:id/fixtures/:fixtureId/start', auth, async (req, res) => {
  try {
    const t       = await Tournament.findById(req.params.id);
    const fixture = t.fixtures.id(req.params.fixtureId);
    const { tossWinner, battingFirst } = req.body;

    // Create a new match
    const battingSecond = battingFirst === fixture.team1 ? fixture.team2 : fixture.team1;
    const match = new Match({
      team1: fixture.team1, team2: fixture.team2,
      overs: t.overs, tossWinner, battingFirst,
      team1Players: t.teams.find(tm => tm.name === fixture.team1)?.players.map(p => p.name) || [],
      team2Players: t.teams.find(tm => tm.name === fixture.team2)?.players.map(p => p.name) || [],
      status: 'innings1',
      innings1: { battingTeam: battingFirst, runs:0, wickets:0, balls:0, ballByBall:[], battingStats:[], bowlingStats:[] },
      innings2: { battingTeam: battingSecond, runs:0, wickets:0, balls:0, ballByBall:[], battingStats:[], bowlingStats:[] },
    });
    await match.save();

    fixture.matchId = match._id;
    fixture.status  = 'live';
    await t.save();

    res.json({ match, tournament: t });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Sync match result back to fixture ────────────────────────────────────────
router.post('/:id/fixtures/:fixtureId/sync', auth, async (req, res) => {
  try {
    const t       = await Tournament.findById(req.params.id);
    const fixture = t.fixtures.id(req.params.fixtureId);
    if (!fixture.matchId) return res.status(400).json({ message: 'No match linked' });

    const match = await Match.findById(fixture.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (match.status === 'completed') {
      fixture.status     = 'completed';
      fixture.result     = match.result;
      fixture.winner     = match.result?.includes(match.innings1.battingTeam) ? match.innings1.battingTeam : match.innings2.battingTeam;
      fixture.team1Score = `${match.innings1.runs}/${match.innings1.wickets} (${Math.floor(match.innings1.balls/6)}.${match.innings1.balls%6})`;
      fixture.team2Score = `${match.innings2.runs}/${match.innings2.wickets} (${Math.floor(match.innings2.balls/6)}.${match.innings2.balls%6})`;
    } else {
      fixture.status = 'live';
    }
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Generate round-robin fixtures ─────────────────────────────────────────────
router.post('/:id/generate-fixtures', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    const teams = t.teams.map(tm => tm.name);
    if (teams.length < 2) return res.status(400).json({ message: 'Need at least 2 teams' });

    const fixtures = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        fixtures.push({ team1: teams[i], team2: teams[j], stage: 'league', status: 'scheduled' });
      }
    }
    t.fixtures = fixtures;
    t.status   = 'league';
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Generate playoffs ─────────────────────────────────────────────────────────
// Accepts { format, fixtures } from frontend — fixtures already have teams resolved
router.post('/:id/generate-playoffs', auth, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);

    // Remove any existing playoff fixtures, keep league fixtures
    t.fixtures = t.fixtures.filter(f => f.stage === 'league');

    const { fixtures } = req.body;
    if (fixtures && Array.isArray(fixtures)) {
      // Frontend resolved teams from points table, just push them
      t.fixtures.push(...fixtures.map(f => ({
        team1:  f.team1  || 'TBD',
        team2:  f.team2  || 'TBD',
        stage:  f.stage,
        status: 'scheduled',
        date:   f.date   || '',
        time:   f.time   || '',
        venue:  f.venue  || '',
      })));
    }

    t.status = 'playoffs';
    await t.save();
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
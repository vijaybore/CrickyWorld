const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Player  = require('../models/Player');
const Match   = require('../models/Match');
const auth    = require('../middleware/auth');

// ── Multer setup (reuse same uploads folder as tournaments) ──────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `player_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Serve uploaded files
router.use('/files', express.static(uploadDir));

// ── Photo upload ──────────────────────────────────────────────────────────────
router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `/api/players/files/${req.file.filename}`;
  res.json({ url });
});

// ── GET all players (with computed career stats from matches) ─────────────────
router.get('/', auth, async (req, res) => {
  try {
    const players = await Player.find().sort({ totalRuns: -1 });
    res.json(players);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET single player ─────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Not found' });
    res.json(player);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST create player ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, photoUrl, role, battingStyle, bowlingStyle, jerseyNumber } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
    const player = new Player({ name: name.trim(), photoUrl, role, battingStyle, bowlingStyle, jerseyNumber });
    await player.save();
    res.status(201).json(player);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PATCH update player profile ───────────────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const allowed = ['name','photoUrl','role','battingStyle','bowlingStyle','jerseyNumber'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const player = await Player.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!player) return res.status(404).json({ message: 'Not found' });
    res.json(player);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── DELETE player ─────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST sync career stats from all matches ───────────────────────────────────
// Call this after matches complete to update a player's career totals
router.post('/:id/sync', auth, async (req, res) => {
  try {
    const player  = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Not found' });

    const matches = await Match.find({ status: 'completed' });
    const stats   = {
      totalMatches:0, totalRuns:0, totalBallsFaced:0, totalFours:0, totalSixes:0,
      totalFifties:0, totalHundreds:0, highestScore:0, timesOut:0,
      totalWickets:0, totalBallsBowled:0, totalRunsConceded:0,
      totalDotBalls:0, totalWides:0, fiveWickets:0,
      bestBowlingW:0, bestBowlingR:999,
    };
    const matchIds = new Set();

    matches.forEach(m => {
      [m.innings1, m.innings2].forEach(inn => {
        if (!inn) return;
        (inn.battingStats||[]).forEach(p => {
          if (p.name !== player.name) return;
          matchIds.add(m._id.toString());
          stats.totalRuns       += p.runs  || 0;
          stats.totalBallsFaced += p.balls || 0;
          stats.totalFours      += p.fours || 0;
          stats.totalSixes      += p.sixes || 0;
          if ((p.runs||0) >= 50 && (p.runs||0) < 100) stats.totalFifties++;
          if ((p.runs||0) >= 100) stats.totalHundreds++;
          if ((p.runs||0) > stats.highestScore) stats.highestScore = p.runs||0;
          if (p.isOut) stats.timesOut++;
        });
        (inn.bowlingStats||[]).forEach(p => {
          if (p.name !== player.name) return;
          matchIds.add(m._id.toString());
          const w = p.wickets||0, r = p.runs||0;
          stats.totalWickets      += w;
          stats.totalBallsBowled  += p.balls||0;
          stats.totalRunsConceded += r;
          stats.totalDotBalls     += p.dotBalls||0;
          stats.totalWides        += p.wides||0;
          if (w >= 5) stats.fiveWickets++;
          if (w > stats.bestBowlingW || (w === stats.bestBowlingW && r < stats.bestBowlingR)) {
            stats.bestBowlingW = w; stats.bestBowlingR = r;
          }
        });
      });
    });

    stats.totalMatches = matchIds.size;
    Object.assign(player, stats);
    await player.save();
    res.json(player);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
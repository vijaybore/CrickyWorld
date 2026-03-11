const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRoundRobinFixtures(teams, overs) {
  const fixtures = [];
  let matchNum = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({
        label: `Match ${matchNum++}`,
        team1: teams[i].name,
        team2: teams[j].name,
        stage: 'group',
        status: 'scheduled',
      });
    }
  }
  return fixtures;
}

function initPointsTable(teams) {
  return teams.map(t => ({
    team: t.name,
    played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
    points: 0, runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, nrr: 0,
  }));
}

function calcNRR(entry) {
  if (!entry.ballsFor || !entry.ballsAgainst) return 0;
  const rr1 = entry.runsFor / (entry.ballsFor / 6);
  const rr2 = entry.runsAgainst / (entry.ballsAgainst / 6);
  return Math.round((rr1 - rr2) * 1000) / 1000;
}

// ─── GET all ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { year, status } = req.query;
    const filter = {};
    if (year) filter.year = +year;
    if (status) filter.status = status;
    const list = await Tournament.find(filter).sort({ createdAt: -1 }).select('-fixtures -pointsTable');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST create ──────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, overs, format, playoffFormat, description, logoUrl, startDate, endDate } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Tournament name is required.' });
    }
    const parsedOvers = parseInt(overs, 10);
    if (!parsedOvers || parsedOvers < 1 || parsedOvers > 100) {
      return res.status(400).json({ message: 'Overs must be between 1 and 100.' });
    }

    const tournament = new Tournament({
      name: String(name).trim(),
      overs: parsedOvers,
      format: format || 'round-robin',
      playoffFormat: playoffFormat || 'semifinal',
      description: description || '',
      logoUrl: logoUrl || '',
      startDate: startDate || null,
      endDate: endDate || null,
      year: startDate ? new Date(startDate).getFullYear() : new Date().getFullYear(),
      teams: [],
      fixtures: [],
      pointsTable: [],
      status: 'upcoming',
      winner: '',
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── GET single ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT update meta ─────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'logoUrl', 'overs', 'format', 'playoffFormat',
      'status', 'winner', 'startDate', 'endDate'];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const t = await Tournament.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    res.json(t);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── TEAMS ────────────────────────────────────────────────────────────────────

// Add team
router.post('/:id/teams', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const { name, shortName, logoUrl, colorHex } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Team name required' });
    if (t.teams.find(tm => tm.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ message: 'Team already exists' });
    }

    t.teams.push({ name: name.trim(), shortName: shortName || '', logoUrl: logoUrl || '', colorHex: colorHex || '#22c55e', players: [] });
    t.pointsTable.push({ team: name.trim(), played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0 });

    // Regenerate fixtures if >= 2 teams
    if (t.teams.length >= 2) {
      const existing = t.fixtures.filter(f => f.stage !== 'group');
      t.fixtures = [...generateRoundRobinFixtures(t.teams, t.overs), ...existing];
    }

    t.markModified('teams');
    t.markModified('fixtures');
    t.markModified('pointsTable');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit team
router.put('/:id/teams/:teamId', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const team = t.teams.id(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const { name, shortName, logoUrl, colorHex } = req.body;
    const oldName = team.name;
    if (name) team.name = name.trim();
    if (shortName !== undefined) team.shortName = shortName;
    if (logoUrl !== undefined) team.logoUrl = logoUrl;
    if (colorHex) team.colorHex = colorHex;

    // Update name references if name changed
    if (name && name.trim() !== oldName) {
      const newName = name.trim();
      t.fixtures.forEach(f => {
        if (f.team1 === oldName) f.team1 = newName;
        if (f.team2 === oldName) f.team2 = newName;
        if (f.winner === oldName) f.winner = newName;
      });
      const pt = t.pointsTable.find(e => e.team === oldName);
      if (pt) pt.team = newName;
    }

    t.markModified('teams');
    t.markModified('fixtures');
    t.markModified('pointsTable');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add player to team
router.post('/:id/teams/:teamId/players', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const team = t.teams.id(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const { name, role } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Player name required' });

    team.players.push({ name: name.trim(), role: role || '' });
    t.markModified('teams');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove player from team
router.delete('/:id/teams/:teamId/players/:playerId', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    const team = t.teams.id(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.players.pull(req.params.playerId);
    t.markModified('teams');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FIXTURES ────────────────────────────────────────────────────────────────

// Add fixture manually
router.post('/:id/fixtures', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const { label, team1, team2, stage, scheduledAt, venue } = req.body;
    t.fixtures.push({ label: label || '', team1, team2, stage: stage || 'group', scheduledAt: scheduledAt || null, venue: venue || '', status: 'scheduled' });
    t.markModified('fixtures');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update fixture (schedule, label, link match)
router.put('/:id/fixtures/:fixtureId', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const fixture = t.fixtures.id(req.params.fixtureId);
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

    const fields = ['label', 'team1', 'team2', 'stage', 'scheduledAt', 'venue', 'status', 'matchId', 'result', 'winner', 'team1Score', 'team2Score'];
    for (const f of fields) {
      if (req.body[f] !== undefined) fixture[f] = req.body[f];
    }

    t.markModified('fixtures');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record fixture result + update points table
router.post('/:id/fixtures/:fixtureId/result', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    const fixture = t.fixtures.id(req.params.fixtureId);
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

    const { winner, tied, matchId,
      team1Runs, team1Balls, team1Wickets,
      team2Runs, team2Balls, team2Wickets, result } = req.body;

    fixture.status = 'completed';
    fixture.winner = tied ? '' : (winner || '');
    fixture.result = result || (tied ? 'Match Tied' : `${winner} won`);
    if (matchId) fixture.matchId = matchId;
    if (team1Runs != null) fixture.team1Score = { runs: team1Runs, wickets: team1Wickets || 0, balls: team1Balls || t.overs * 6 };
    if (team2Runs != null) fixture.team2Score = { runs: team2Runs, wickets: team2Wickets || 0, balls: team2Balls || t.overs * 6 };

    // Update points table (only for group stage)
    if (fixture.stage === 'group') {
      const pt1 = t.pointsTable.find(e => e.team === fixture.team1);
      const pt2 = t.pointsTable.find(e => e.team === fixture.team2);
      if (pt1 && pt2) {
        pt1.played += 1; pt2.played += 1;
        if (tied) {
          pt1.tied += 1; pt2.tied += 1;
          pt1.points += 1; pt2.points += 1;
        } else {
          const loser = winner === fixture.team1 ? fixture.team2 : fixture.team1;
          const winEntry = t.pointsTable.find(e => e.team === winner);
          const loseEntry = t.pointsTable.find(e => e.team === loser);
          if (winEntry) { winEntry.won += 1; winEntry.points += 2; }
          if (loseEntry) { loseEntry.lost += 1; }
        }
        // NRR
        if (team1Runs != null && team2Runs != null) {
          const b1 = team1Balls || t.overs * 6;
          const b2 = team2Balls || t.overs * 6;
          pt1.runsFor += team1Runs; pt1.ballsFor += b1;
          pt1.runsAgainst += team2Runs; pt1.ballsAgainst += b2;
          pt2.runsFor += team2Runs; pt2.ballsFor += b2;
          pt2.runsAgainst += team1Runs; pt2.ballsAgainst += b1;
          pt1.nrr = calcNRR(pt1);
          pt2.nrr = calcNRR(pt2);
        }
      }
    }

    // Update tournament status
    const allGroupDone = t.fixtures.filter(f => f.stage === 'group').every(f => f.status === 'completed');
    if (allGroupDone && t.status === 'upcoming') t.status = 'ongoing';

    t.markModified('fixtures');
    t.markModified('pointsTable');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate playoff fixtures
router.post('/:id/playoffs/generate', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });

    // Remove existing playoff fixtures
    t.fixtures = t.fixtures.filter(f => f.stage === 'group');

    const sorted = [...t.pointsTable].sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    const top = sorted.slice(0, Math.min(4, sorted.length));

    if (t.playoffFormat === 'ipl' && top.length >= 4) {
      t.fixtures.push({ label: 'Qualifier 1', team1: top[0].team, team2: top[1].team, stage: 'qualifier1', status: 'scheduled' });
      t.fixtures.push({ label: 'Eliminator', team1: top[2].team, team2: top[3].team, stage: 'eliminator', status: 'scheduled' });
      t.fixtures.push({ label: 'Qualifier 2', team1: 'Winner QF1', team2: 'Winner EL', stage: 'qualifier2', status: 'scheduled' });
      t.fixtures.push({ label: 'Final', team1: 'TBD', team2: 'TBD', stage: 'final', status: 'scheduled' });
    } else {
      if (top.length >= 4) {
        t.fixtures.push({ label: 'Semi Final 1', team1: top[0].team, team2: top[3].team, stage: 'semifinal1', status: 'scheduled' });
        t.fixtures.push({ label: 'Semi Final 2', team1: top[1].team, team2: top[2].team, stage: 'semifinal2', status: 'scheduled' });
      } else if (top.length >= 2) {
        t.fixtures.push({ label: 'Semi Final 1', team1: top[0].team, team2: top[1].team, stage: 'semifinal1', status: 'scheduled' });
      }
      t.fixtures.push({ label: 'Final', team1: 'TBD', team2: 'TBD', stage: 'final', status: 'scheduled' });
    }

    t.markModified('fixtures');
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
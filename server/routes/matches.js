const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

// Get all matches
router.get('/', async (req, res) => {
  try {
    const matches = await Match.find().sort({ createdAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new match (supports tournament linkage)
router.post('/', async (req, res) => {
  try {
    const {
      team1, team2, overs, tossWinner, battingFirst,
      wideRuns, noBallRuns, team1Players, team2Players,
      tournamentId, tournamentName, fixtureId
    } = req.body;

    const battingSecond = battingFirst === team1 ? team2 : team1;

    const match = new Match({
      team1, team2, overs, tossWinner, battingFirst,
      wideRuns: wideRuns ?? 1,
      noBallRuns: noBallRuns ?? 1,
      team1Players: team1Players || [],
      team2Players: team2Players || [],
      tournamentId: tournamentId || null,
      tournamentName: tournamentName || null,
      fixtureId: fixtureId || null,
      status: 'innings1',
      innings1: {
        battingTeam: battingFirst,
        runs: 0, wickets: 0, balls: 0,
        ballByBall: [], battingStats: [], bowlingStats: [],
      },
      innings2: {
        battingTeam: battingSecond,
        runs: 0, wickets: 0, balls: 0,
        ballByBall: [], battingStats: [], bowlingStats: [],
      },
    });

    await match.save();
    res.status(201).json(match);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get single match
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update match (status, overs, etc.)
router.put('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a ball (live scoring)
router.post('/:id/ball', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    const {
      runs, isWicket, isWide, isNoBall,
      batsmanName, bowlerName, extraRuns,
      wicketType, assistPlayer
    } = req.body;

    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2';
    const innings = match[inningsKey];

    const totalRuns = runs + (extraRuns || 0);

    // Add ball to history
    innings.ballByBall.push({
      runs: totalRuns, isWicket, isWide, isNoBall,
      batsmanName, bowlerName, wicketType, assistPlayer,
      extraRuns: extraRuns || 0,
    });

    // Update innings totals
    innings.runs += totalRuns;
    if (!isWide && !isNoBall) innings.balls += 1;
    if (isWicket) innings.wickets += 1;

    // Update batting stats
    if (batsmanName) {
      let batsman = innings.battingStats.find(p => p.name === batsmanName);
      if (!batsman) {
        innings.battingStats.push({ name: batsmanName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false });
        batsman = innings.battingStats[innings.battingStats.length - 1];
      }
      if (!isWide) {
        batsman.runs += runs;
        batsman.balls += 1;
        if (runs === 4) batsman.fours += 1;
        if (runs === 6) batsman.sixes += 1;
      }
      if (isWicket) {
        batsman.isOut = true;
        batsman.wicketType = wicketType;
        batsman.bowlerName = bowlerName;
        batsman.assistPlayer = assistPlayer;
      }
    }

    // Update bowling stats
    if (bowlerName) {
      let bowler = innings.bowlingStats.find(p => p.name === bowlerName);
      if (!bowler) {
        innings.bowlingStats.push({ name: bowlerName, overs: 0, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 });
        bowler = innings.bowlingStats[innings.bowlingStats.length - 1];
      }
      bowler.runs += totalRuns;
      if (isWide) bowler.wides += 1;
      else if (isNoBall) bowler.noBalls += 1;
      else {
        bowler.balls += 1;
        bowler.overs = Math.floor(bowler.balls / 6) + (bowler.balls % 6) / 10;
      }
      if (isWicket) bowler.wickets += 1;
    }

    // Check innings / match over
    const maxBalls = match.overs * 6;
    if (innings.balls >= maxBalls || innings.wickets >= 10) {
      if (match.status === 'innings1') {
        match.status = 'innings2';
      } else {
        match.status = 'completed';
        const i1 = match.innings1, i2 = match.innings2;
        if (i2.runs > i1.runs) {
          match.result = `${i2.battingTeam} won by ${10 - i2.wickets} wickets`;
        } else if (i1.runs > i2.runs) {
          match.result = `${i1.battingTeam} won by ${i1.runs - i2.runs} runs`;
        } else {
          match.result = 'Match Tied!';
        }
      }
    }

    match.markModified(inningsKey);
    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UNDO last ball
router.post('/:id/undo', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2';
    const innings = match[inningsKey];

    if (innings.ballByBall.length === 0) {
      return res.status(400).json({ message: 'Nothing to undo' });
    }

    const lastBall = innings.ballByBall.pop();

    innings.runs -= lastBall.runs;
    if (!lastBall.isWide && !lastBall.isNoBall) innings.balls -= 1;
    if (lastBall.isWicket) innings.wickets -= 1;

    const batsman = innings.battingStats.find(p => p.name === lastBall.batsmanName);
    if (batsman) {
      if (!lastBall.isWide) {
        batsman.runs -= (lastBall.runs - (lastBall.extraRuns || 0));
        batsman.balls -= 1;
        if (lastBall.runs === 4) batsman.fours -= 1;
        if (lastBall.runs === 6) batsman.sixes -= 1;
      }
      if (lastBall.isWicket) {
        batsman.isOut = false;
        batsman.wicketType = null;
        batsman.bowlerName = null;
        batsman.assistPlayer = null;
      }
    }

    const bowler = innings.bowlingStats.find(p => p.name === lastBall.bowlerName);
    if (bowler) {
      bowler.runs -= lastBall.runs;
      if (lastBall.isWide) bowler.wides -= 1;
      else if (lastBall.isNoBall) bowler.noBalls -= 1;
      else {
        bowler.balls -= 1;
        bowler.overs = Math.floor(bowler.balls / 6) + (bowler.balls % 6) / 10;
      }
      if (lastBall.isWicket) bowler.wickets -= 1;
    }

    match.markModified(inningsKey);
    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete match
router.delete('/:id', async (req, res) => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
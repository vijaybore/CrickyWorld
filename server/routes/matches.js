const express = require('express');
const router = express.Router();
const Match = require('./Match');

router.get('/', async (req, res) => {
  try {
    const matches = await Match.find().sort({ createdAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// FIXED: removed nested duplicate router.post
router.post('/', async (req, res) => {
  try {
    const { team1, team2, overs, tossWinner, battingFirst, wideRuns, noBallRuns } = req.body;
    const battingSecond = battingFirst === team1 ? team2 : team1;
    const match = new Match({
      team1, team2, overs, tossWinner, battingFirst,
      wideRuns: wideRuns || 0,
      noBallRuns: noBallRuns || 0,
      team1Players: [],
      team2Players: [],
      status: 'innings1',
      innings1: { battingTeam: battingFirst, runs: 0, wickets: 0, balls: 0, ballByBall: [], battingStats: [], bowlingStats: [] },
      innings2: { battingTeam: battingSecond, runs: 0, wickets: 0, balls: 0, ballByBall: [], battingStats: [], bowlingStats: [] },
    });
    await match.save();
    res.status(201).json(match);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/ball', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    const { runs, isWicket, isWide, isNoBall, batsmanName, bowlerName, extraRuns } = req.body;
    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2';
    const innings = match[inningsKey];
    const totalRuns = runs + (extraRuns || 0);

    innings.ballByBall.push({ runs: totalRuns, isWicket, isWide, isNoBall, batsmanName, bowlerName });
    innings.runs += totalRuns;
    if (!isWide && !isNoBall) innings.balls += 1;
    if (isWicket) innings.wickets += 1;

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
      if (isWicket) batsman.isOut = true;
    }

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

    const maxBalls = match.overs * 6;
    if (innings.balls >= maxBalls || innings.wickets >= 10) {
      if (match.status === 'innings1') {
        match.status = 'innings2';
      } else {
        match.status = 'completed';
        if (match.innings2.runs > match.innings1.runs) {
          match.result = `${match.innings2.battingTeam} won by ${10 - match.innings2.wickets} wickets`;
        } else if (match.innings1.runs > match.innings2.runs) {
          match.result = `${match.innings1.battingTeam} won by ${match.innings1.runs - match.innings2.runs} runs`;
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

router.post('/:id/undo', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    const inningsKey = match.status === 'innings1' ? 'innings1' : 'innings2';
    const innings = match[inningsKey];
    if (innings.ballByBall.length === 0) return res.status(400).json({ message: 'Nothing to undo' });

    const lastBall = innings.ballByBall.pop();
    innings.runs -= lastBall.runs;
    if (!lastBall.isWide && !lastBall.isNoBall) innings.balls -= 1;
    if (lastBall.isWicket) innings.wickets -= 1;

    const batsman = innings.battingStats.find(p => p.name === lastBall.batsmanName);
    if (batsman) {
      if (!lastBall.isWide) { batsman.runs -= lastBall.runs; batsman.balls -= 1; if (lastBall.runs === 4) batsman.fours -= 1; if (lastBall.runs === 6) batsman.sixes -= 1; }
      if (lastBall.isWicket) batsman.isOut = false;
    }

    const bowler = innings.bowlingStats.find(p => p.name === lastBall.bowlerName);
    if (bowler) {
      bowler.runs -= lastBall.runs;
      if (lastBall.isWide) bowler.wides -= 1;
      else if (lastBall.isNoBall) bowler.noBalls -= 1;
      else { bowler.balls -= 1; bowler.overs = Math.floor(bowler.balls / 6) + (bowler.balls % 6) / 10; }
      if (lastBall.isWicket) bowler.wickets -= 1;
    }

    match.markModified(inningsKey);
    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  photoUrl:         { type: String, default: '' },
  role:             { type: String, default: 'allrounder', enum: ['batsman','bowler','allrounder','wk-batsman'] },
  battingStyle:     { type: String, default: '' },   // e.g. "Right-hand bat"
  bowlingStyle:     { type: String, default: '' },   // e.g. "Right-arm fast"
  jerseyNumber:     { type: String, default: '' },

  // career batting (auto-updated when matches complete)
  totalMatches:     { type: Number, default: 0 },
  totalRuns:        { type: Number, default: 0 },
  totalBallsFaced:  { type: Number, default: 0 },
  totalFours:       { type: Number, default: 0 },
  totalSixes:       { type: Number, default: 0 },
  totalFifties:     { type: Number, default: 0 },
  totalHundreds:    { type: Number, default: 0 },
  highestScore:     { type: Number, default: 0 },
  timesOut:         { type: Number, default: 0 },

  // career bowling
  totalWickets:     { type: Number, default: 0 },
  totalBallsBowled: { type: Number, default: 0 },
  totalRunsConceded:{ type: Number, default: 0 },
  totalDotBalls:    { type: Number, default: 0 },
  totalWides:       { type: Number, default: 0 },
  fiveWickets:      { type: Number, default: 0 },
  bestBowlingW:     { type: Number, default: 0 },
  bestBowlingR:     { type: Number, default: 999 },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
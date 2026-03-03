const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalMatches: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalBallsBowled: { type: Number, default: 0 },
  totalBallsFaced: { type: Number, default: 0 },
  highestScore: { type: Number, default: 0 },
  bestBowling: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
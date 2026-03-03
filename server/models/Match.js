const mongoose = require('mongoose');

const ballSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  isWicket: { type: Boolean, default: false },
  isWide: { type: Boolean, default: false },
  isNoBall: { type: Boolean, default: false },
  batsmanName: String,
  bowlerName: String,
});

const battingStatsSchema = new mongoose.Schema({
  name: String,
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
});

const bowlingStatsSchema = new mongoose.Schema({
  name: String,
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
});

const inningsSchema = new mongoose.Schema({
  battingTeam: String,
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  ballByBall: [ballSchema],
  battingStats: [battingStatsSchema],
  bowlingStats: [bowlingStatsSchema],
});

const matchSchema = new mongoose.Schema({
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  team1Players: [String],
  team2Players: [String],
  overs: { type: Number, required: true },
  tossWinner: { type: String },
  battingFirst: { type: String },
  status: {
    type: String,
    enum: ['setup', 'innings1', 'innings2', 'completed'],
    default: 'setup'
  },
  innings1: { type: inningsSchema, default: () => ({}) },
  innings2: { type: inningsSchema, default: () => ({}) },
  wideRuns: { type: Number, default: 0 },
  noBallRuns: { type: Number, default: 0 },
  result: { type: String, default: '' },
}, { timestamps: true });

matchSchema.index({ createdAt: -1 })
matchSchema.index({ status: 1 })

module.exports = mongoose.model('Match', matchSchema);
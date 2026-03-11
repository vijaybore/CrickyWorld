const mongoose = require('mongoose');

const teamPlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['batsman', 'bowler', 'allrounder', 'wicketkeeper', ''], default: '' },
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  players: [teamPlayerSchema],
  colorHex: { type: String, default: '#22c55e' },
});

const fixtureSchema = new mongoose.Schema({
  label: { type: String, default: '' }, // e.g. "Match 1", "SF 1", "Final"
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  stage: { type: String, enum: ['group', 'qualifier1', 'eliminator', 'qualifier2', 'semifinal1', 'semifinal2', 'final'], default: 'group' },
  scheduledAt: { type: Date, default: null },
  venue: { type: String, default: '' },
  result: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'live', 'completed', 'cancelled'], default: 'scheduled' },
  team1Score: { runs: Number, wickets: Number, balls: Number },
  team2Score: { runs: Number, wickets: Number, balls: Number },
  winner: { type: String, default: '' },
});

const pointsEntrySchema = new mongoose.Schema({
  team: { type: String, required: true },
  played: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  tied: { type: Number, default: 0 },
  noResult: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  runsFor: { type: Number, default: 0 },
  ballsFor: { type: Number, default: 0 },
  runsAgainst: { type: Number, default: 0 },
  ballsAgainst: { type: Number, default: 0 },
  nrr: { type: Number, default: 0 },
});

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  overs: { type: Number, required: true, min: 1 },
  format: {
    type: String,
    enum: ['round-robin', 'knockout', 'round-robin-playoffs'],
    default: 'round-robin',
  },
  playoffFormat: {
    type: String,
    enum: ['ipl', 'semifinal'],
    default: 'semifinal',
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming',
  },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  teams: [teamSchema],
  fixtures: [fixtureSchema],
  pointsTable: [pointsEntrySchema],
  winner: { type: String, default: '' },
  year: { type: Number, default: () => new Date().getFullYear() },
}, { timestamps: true });

tournamentSchema.index({ createdAt: -1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ year: -1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
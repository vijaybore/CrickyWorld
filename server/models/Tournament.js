const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  imageUrl: { type: String, default: '' },
});

const teamSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  logoUrl:   { type: String, default: '' },
  players:   [playerSchema],
});

const fixtureSchema = new mongoose.Schema({
  team1:       { type: String, required: true },
  team2:       { type: String, required: true },
  date:        { type: String, default: '' },
  time:        { type: String, default: '' },
  venue:       { type: String, default: '' },
  stage:       { type: String, default: 'league' }, // league | sf1 | sf2 | q1 | q2 | elim | qf1 | qf2 | qf3 | qf4 | final
  matchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  status:      { type: String, enum: ['scheduled','live','completed'], default: 'scheduled' },
  result:      { type: String, default: '' },
  winner:      { type: String, default: '' },
  team1Score:  { type: String, default: '' },
  team2Score:  { type: String, default: '' },
});

const tournamentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  overs:      { type: Number, default: 10 },
  status:     { type: String, enum: ['setup','league','playoffs','completed'], default: 'setup' },
  teams:      [teamSchema],
  fixtures:   [fixtureSchema],
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
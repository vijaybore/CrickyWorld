const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const compression = require('compression');
app.use(compression());
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch((err) => console.log('❌ MongoDB Error:', err));

app.get("/", (req, res) => {
  res.send("Welcome to CrickyWorld API 🏏");
});

const playerRoutes = require('./routes/players');
const matchRoutes = require('./routes/matches');
const authRoutes = require('./routes/auth');

app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', require('./routes/tournaments'))

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log("CrickyWorld Server running on port " + PORT);
});
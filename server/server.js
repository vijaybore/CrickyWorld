const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const playersRoutes = require('./routes/players');
const matchesRoutes = require('./routes/matches');
const authRoutes = require('./routes/auth');
const tournamentsRoutes = require('./routes/tournaments');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

app.get("/", (req,res)=>{
  res.send("Welcome to CrickyWorld API 🏏");
});

app.use("/api/players", playersRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
  console.log(`CrickyWorld running on port ${PORT}`);
});
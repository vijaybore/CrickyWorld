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

app.get('/', (req, res) => res.send('Welcome to CrickyWorld API 🏏'));

app.use('/api/players',     require('./routes/players'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`CrickyWorld running on port ${PORT}`));
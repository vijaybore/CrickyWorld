const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const compression = require('compression');
require('dotenv').config();

const playersRoutes    = require('./routes/players');
const matchesRoutes    = require('./routes/matches');
const authRoutes       = require('./routes/auth');
const tournamentsRoutes = require('./routes/tournaments');

const app = express();

// ── CORS — allow Vercel frontend + local dev ──────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,          // set this in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'CrickyWorld API 🏏' }));

app.use('/api/players',     playersRoutes);
app.use('/api/matches',     matchesRoutes);
app.use('/api/auth',        authRoutes);
app.use('/api/tournaments', tournamentsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🏏 CrickyWorld running on port ${PORT}`));
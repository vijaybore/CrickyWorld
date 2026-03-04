const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

router.get('/', async (req, res) => {
  try {
    const players = await Player.find().sort({ totalRuns: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const player = new Player({ name: req.body.name });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
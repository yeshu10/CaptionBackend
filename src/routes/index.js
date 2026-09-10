const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const captionRoutes = require('./captionRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AI Instagram Caption Generator API'
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/captions', captionRoutes);

module.exports = router;

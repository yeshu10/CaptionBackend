const express = require('express');
const router = express.Router();
const {
  generateCaption,
  saveCaption,
  getUserCaptions,
  getCaptionById,
  updateCaption,
  deleteCaption
} = require('../controllers/captionController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All caption routes are protected by JWT authentication
router.use(protect);

router.post('/generate', upload.single('image'), generateCaption);
router.post('/save', saveCaption);
router.get('/', getUserCaptions);
router.get('/:id', getCaptionById);
router.put('/:id', updateCaption);
router.delete('/:id', deleteCaption);

module.exports = router;

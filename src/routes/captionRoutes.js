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
router.get('/generate', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Caption Generation endpoint is active. Submit a POST request with multipart/form-data containing an image file, contentType, mood, and length to generate captions.',
    endpoint: '/api/captions/generate',
    method: 'POST',
    acceptedContentTypes: ['multipart/form-data'],
    requiredFields: ['image'],
    optionalFields: ['contentType', 'mood', 'length', 'additionalInstructions']
  });
});
router.post('/save', saveCaption);
router.get('/', getUserCaptions);
router.get('/:id', getCaptionById);
router.put('/:id', updateCaption);
router.delete('/:id', deleteCaption);

module.exports = router;

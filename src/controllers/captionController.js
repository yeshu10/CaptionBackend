const mongoose = require('mongoose');
const captionService = require('../services/captionService');
const { generateCaptionWithGemini } = require('../services/geminiService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Generate structured Instagram caption from uploaded image & preferences
 * @route   POST /api/captions/generate
 * @access  Private
 */
const generateCaption = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Please upload an image for caption generation', 400);
    }

    const {
      contentType = 'Personal',
      mood = 'Aesthetic',
      length = 'Medium',
      additionalInstructions = ''
    } = req.body;

    const validContentTypes = ['Painting', 'Reel', 'Product', 'Personal'];
    const validMoods = ['Cute', 'Aesthetic', 'Funny', 'Emotional', 'Professional', 'Minimal', 'Romantic'];
    const validLengths = ['Short', 'Medium', 'Long'];

    if (!validContentTypes.includes(contentType)) {
      return errorResponse(res, `Invalid content type. Must be one of: ${validContentTypes.join(', ')}`, 400);
    }

    if (!validMoods.includes(mood)) {
      return errorResponse(res, `Invalid mood. Must be one of: ${validMoods.join(', ')}`, 400);
    }

    if (!validLengths.includes(length)) {
      return errorResponse(res, `Invalid length. Must be one of: ${validLengths.join(', ')}`, 400);
    }

    // Generate with Gemini Vision
    const aiResult = await generateCaptionWithGemini({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      contentType,
      mood,
      length,
      additionalInstructions
    });

    // Create Base64 data URL for preview and saving
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    return successResponse(
      res,
      {
        ...aiResult,
        imagePreview: base64Image,
        preferences: {
          contentType,
          mood,
          length,
          additionalInstructions
        }
      },
      'AI Caption generated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save generated or edited caption to database
 * @route   POST /api/captions/save
 * @access  Private
 */
const saveCaption = async (req, res, next) => {
  try {
    const {
      image,
      contentType,
      mood,
      length,
      additionalInstructions,
      caption,
      hook,
      cta,
      keywords,
      hashtags
    } = req.body;

    if (!caption || !caption.trim()) {
      return errorResponse(res, 'Caption content is required', 400);
    }

    const newCaption = await captionService.saveCaption({
      userId: req.user._id,
      image: image || '',
      contentType: contentType || 'Personal',
      mood: mood || 'Aesthetic',
      length: length || 'Medium',
      additionalInstructions: additionalInstructions || '',
      caption,
      hook: hook || '',
      cta: cta || '',
      keywords: Array.isArray(keywords) ? keywords : [],
      hashtags: Array.isArray(hashtags) ? hashtags : []
    });

    return successResponse(res, newCaption, 'Caption saved to history successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's saved captions with search and filters
 * @route   GET /api/captions
 * @access  Private
 */
const getUserCaptions = async (req, res, next) => {
  try {
    const { search, contentType, mood, page, limit } = req.query;

    const result = await captionService.getCaptionsByUser(req.user._id, {
      search,
      contentType,
      mood,
      page: page || 1,
      limit: limit || 18
    });

    return successResponse(res, result, 'Captions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single caption by ID
 * @route   GET /api/captions/:id
 * @access  Private
 */
const getCaptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid caption ID format', 400);
    }

    const caption = await captionService.getCaptionById(id, req.user._id);
    if (!caption) {
      return errorResponse(res, 'Caption not found or unauthorized', 404);
    }

    return successResponse(res, caption, 'Caption retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing saved caption
 * @route   PUT /api/captions/:id
 * @access  Private
 */
const updateCaption = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid caption ID format', 400);
    }

    const { caption, hook, cta, keywords, hashtags, contentType, mood, length } = req.body;

    const updateFields = {};
    if (caption !== undefined) updateFields.caption = caption;
    if (hook !== undefined) updateFields.hook = hook;
    if (cta !== undefined) updateFields.cta = cta;
    if (keywords !== undefined) updateFields.keywords = keywords;
    if (hashtags !== undefined) updateFields.hashtags = hashtags;
    if (contentType !== undefined) updateFields.contentType = contentType;
    if (mood !== undefined) updateFields.mood = mood;
    if (length !== undefined) updateFields.length = length;

    const updated = await captionService.updateCaption(id, req.user._id, updateFields);
    if (!updated) {
      return errorResponse(res, 'Caption not found or unauthorized', 404);
    }

    return successResponse(res, updated, 'Caption updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a saved caption
 * @route   DELETE /api/captions/:id
 * @access  Private
 */
const deleteCaption = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid caption ID format', 400);
    }

    const deleted = await captionService.deleteCaption(id, req.user._id);
    if (!deleted) {
      return errorResponse(res, 'Caption not found or unauthorized', 404);
    }

    return successResponse(res, { id }, 'Caption deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCaption,
  saveCaption,
  getUserCaptions,
  getCaptionById,
  updateCaption,
  deleteCaption
};

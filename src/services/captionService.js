const Caption = require('../models/Caption');

/**
 * Persist a new caption to database
 */
const saveCaption = async (captionData) => {
  return await Caption.create(captionData);
};

/**
 * Fetch paginated captions for a user with optional search & filters
 */
const getCaptionsByUser = async (userId, { search, contentType, mood, page = 1, limit = 20 } = {}) => {
  const query = { userId };

  if (contentType && contentType !== 'All') {
    query.contentType = contentType;
  }

  if (mood && mood !== 'All') {
    query.mood = mood;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { caption: searchRegex },
      { hook: searchRegex },
      { cta: searchRegex },
      { keywords: searchRegex },
      { hashtags: searchRegex },
      { additionalInstructions: searchRegex }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [captions, total] = await Promise.all([
    Caption.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Caption.countDocuments(query)
  ]);

  return {
    captions,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  };
};

/**
 * Fetch a single caption by ID and verify ownership
 */
const getCaptionById = async (id, userId) => {
  return await Caption.findOne({ _id: id, userId });
};

/**
 * Update a caption by ID
 */
const updateCaption = async (id, userId, updateData) => {
  return await Caption.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

/**
 * Delete a caption by ID
 */
const deleteCaption = async (id, userId) => {
  return await Caption.findOneAndDelete({ _id: id, userId });
};

module.exports = {
  saveCaption,
  getCaptionsByUser,
  getCaptionById,
  updateCaption,
  deleteCaption
};

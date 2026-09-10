const mongoose = require('mongoose');

const captionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    image: {
      type: String, // Base64 Data URI or image reference URL/path
      default: ''
    },
    contentType: {
      type: String,
      enum: ['Painting', 'Reel', 'Product', 'Personal'],
      default: 'Personal'
    },
    mood: {
      type: String,
      enum: ['Cute', 'Aesthetic', 'Funny', 'Emotional', 'Professional', 'Minimal', 'Romantic'],
      default: 'Aesthetic'
    },
    length: {
      type: String,
      enum: ['Short', 'Medium', 'Long'],
      default: 'Medium'
    },
    additionalInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    caption: {
      type: String,
      required: [true, 'Caption content is required']
    },
    hook: {
      type: String,
      default: ''
    },
    cta: {
      type: String,
      default: ''
    },
    keywords: {
      type: [String],
      default: []
    },
    hashtags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Add index on userId and createdAt for fast history queries
captionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Caption', captionSchema);

const dotenv = require('dotenv');
dotenv.config();

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('[Gemini Config] Warning: GEMINI_API_KEY is not set or using placeholder.');
  }
  return key;
};

const getModelName = () => {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
};

module.exports = {
  getApiKey,
  getModelName
};

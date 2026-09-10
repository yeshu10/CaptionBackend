const { buildInstagramPrompt } = require('../utils/promptBuilder');
const { getApiKey, getModelName } = require('../config/gemini');

/**
 * Robust JSON extraction helper in case the model returns markdown wrapped JSON
 */
const extractJson = (text) => {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Try to find first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const substr = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(substr);
    }
    throw new Error('Unable to parse JSON from AI response: ' + err.message);
  }
};

/**
 * Intelligent fallback generator when GEMINI_API_KEY is not configured
 */
const generateMockFallback = ({ contentType, mood, length, additionalInstructions }) => {
  const hooks = {
    Painting: 'Step into the brushstrokes of something born from pure imagination ✨',
    Reel: 'Wait until you see how this transformation unfolds... ⏳🔥',
    Product: 'The everyday essential your routine has been waiting for 💫',
    Personal: 'A gentle reminder to pause, breathe, and appreciate where you are right now 🌿'
  };

  const captions = {
    Short: `Finding beauty in every single angle today. Here is to making ordinary moments feel extraordinary ✨ Let us know what stands out to you!`,
    Medium: `Some moments demand to be captured, not just seen. When colors, atmosphere, and energy align like this, it feels like time stands still for a second. We put our heart into every detail here—hope it brings a spark of inspiration to your feed today! Drop a comment with your favorite part.`,
    Long: `They say art and creation aren't just about the final outcome—they're about every quiet decision made along the way. \n\nFrom the very first spark of an idea to bringing this vision to life, the process has been an incredible ride. There were experiments that didn't work, surprises that turned out better than planned, and so many little details that make this piece unique.\n\nWhether you're an artist, a dreamer, or simply scrolling through, thank you for being part of this creative journey! Which detail catches your eye first?`
  };

  const ctas = {
    Painting: 'Save this post for your daily art inspiration & share your favorite detail below! 🎨',
    Reel: 'Save this reel to try it yourself, and tag someone who loves this vibe! ✨',
    Product: 'Tap the link in bio to explore the collection before it sells out! 🛒',
    Personal: 'Double tap if you resonate with this, and tell me your thoughts in the comments! 👇'
  };

  const hashtagsMap = {
    Painting: ['#artistsoninstagram', '#contemporaryart', '#dailyart', '#creativeprocess', '#artcollector', '#mixedmedia', '#instaartist', '#visualart', '#studiolife', '#galleryart'],
    Reel: ['#reelsinstagram', '#trendingreels', '#viralpost', '#instareels', '#creatorsofinstagram', '#creativecontent', '#explorepage', '#contentcreator', '#reelitfeelit', '#trendingnow'],
    Product: ['#productphotography', '#musthave', '#lifestyleessentials', '#curatedcollection', '#designlovers', '#minimalistdesign', '#shoplocal', '#qualitycraftsmanship', '#productlaunch'],
    Personal: ['#lifestyleblogger', '#authenticlife', '#mindfulliving', '#dailyreflections', '#personalgrowth', '#visualdiary', '#lifeincolor', '#candidmoments', '#everydaymagic']
  };

  return {
    hook: hooks[contentType] || 'Here is something special to brighten your feed ✨',
    caption: captions[length] || captions.Medium,
    cta: ctas[contentType] || 'Drop a comment below and share your thoughts! 💬',
    keywords: ['creative storytelling', 'visual aesthetics', contentType.toLowerCase(), mood.toLowerCase(), 'instagram strategy'],
    hashtags: hashtagsMap[contentType] || ['#instagramvibes', '#creativecontent', '#explorepage', '#dailyinspiration', '#instadaily']
  };
};

/**
 * Main Gemini Vision Generator
 */
const generateCaptionWithGemini = async ({
  imageBuffer,
  mimeType = 'image/jpeg',
  contentType = 'Personal',
  mood = 'Aesthetic',
  length = 'Medium',
  additionalInstructions = ''
}) => {
  const apiKey = getApiKey();

  // If no API key configured, use high-quality contextual fallback
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('[Gemini Service] No GEMINI_API_KEY provided. Using contextual mock generator.');
    return generateMockFallback({ contentType, mood, length, additionalInstructions });
  }

  const prompt = buildInstagramPrompt({
    contentType,
    mood,
    length,
    additionalInstructions
  });

  const base64Data = imageBuffer.toString('base64');
  const modelName = getModelName();

  // Attempt using @google/genai first
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    console.log(`[Gemini Service] Sending multimodal request to model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
    const parsed = extractJson(responseText);

    return {
      hook: parsed.hook || '',
      caption: parsed.caption || '',
      cta: parsed.cta || '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : []
    };
  } catch (error) {
    console.error(`[Gemini Service Primary Call Failed]: ${error.message}`);

    // If model name was not recognized or API variation, attempt with alternative model
    if (modelName !== 'gemini-2.0-flash') {
      try {
        console.log(`[Gemini Service] Retrying with model: gemini-2.0-flash`);
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const retryResp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });
        const retryText = retryResp.text || (retryResp.candidates && retryResp.candidates[0]?.content?.parts[0]?.text);
        const retryParsed = extractJson(retryText);
        return {
          hook: retryParsed.hook || '',
          caption: retryParsed.caption || '',
          cta: retryParsed.cta || '',
          keywords: Array.isArray(retryParsed.keywords) ? retryParsed.keywords : [],
          hashtags: Array.isArray(retryParsed.hashtags) ? retryParsed.hashtags : []
        };
      } catch (retryErr) {
        console.error(`[Gemini Service Retry Failed]: ${retryErr.message}`);
      }
    }

    throw new Error(`Failed to generate AI caption: ${error.message}`);
  }
};

module.exports = {
  generateCaptionWithGemini,
  generateMockFallback
};

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
 * Intelligent contextual fallback generator when GEMINI_API_KEY is not configured
 * or when external AI services encounter quota/model/connectivity limits.
 */
const generateMockFallback = ({ contentType = 'Personal', mood = 'Aesthetic', length = 'Medium', additionalInstructions = '' }) => {
  const hooksMap = {
    Painting: [
      'Step into the brushstrokes of something born from pure imagination ✨',
      'The story behind the canvas: here is how this piece came to life 🎨',
      'When colors speak louder than words ever could... 🖌️💫'
    ],
    Reel: [
      'Wait until you see how this transformation unfolds... ⏳🔥',
      'The behind-the-scenes moment no one expected to see today! 🎬✨',
      'Stop scrolling—this might just change how you create your next project! 💡🚀'
    ],
    Product: [
      'The everyday essential your routine has been waiting for 💫',
      'Crafted with purpose, designed for every single moment ✨',
      'Small details that make an unforgettable difference 🤍'
    ],
    Personal: [
      'A gentle reminder to pause, breathe, and appreciate where you are right now 🌿',
      'Finding beauty in the quiet, unfiltered moments of today ✨',
      'Embracing the journey, one step and one memory at a time 🤍'
    ]
  };

  const captionsMap = {
    Short: {
      Painting: 'Every color tells a story, and this canvas holds my favorite one yet. Art that breathes life into the space around it.',
      Reel: 'Capturing the flow, the energy, and the spark in real time. Watch till the end for the final reveal!',
      Product: 'Elevating your daily essentials with thoughtful design and effortless style. Designed to stand out in the best way.',
      Personal: 'Finding beauty in every single angle today. Here is to making ordinary moments feel extraordinary ✨'
    },
    Medium: {
      Painting: 'Some artworks demand to be felt, not just seen. In this piece, texture meets intention—blending vibrant tones with subtle nuances to evoke a sense of calm and curiosity. We put our heart into every brushstroke. Let us know what feeling this brings to you today! 🎨',
      Reel: 'From the initial concept to the final frame, bringing this idea alive was an unforgettable creative ride. It is the little unexpected moments between takes that make creating worthwhile. Double tap if you love seeing the raw process unfold! 🎬🔥',
      Product: 'True quality never has to scream for attention. Designed from premium craftsmanship with daily durability in mind, this piece effortlessly balances form and function. Upgrade your collection with a piece made to last through every season.',
      Personal: 'Some moments demand to be captured, not just seen. When colors, atmosphere, and energy align like this, it feels like time stands still for a second. We put our heart into every detail here—hope it brings a spark of inspiration to your feed today! Drop a comment with your favorite part.'
    },
    Long: {
      Painting: 'They say art and creation aren\'t just about the final outcome—they\'re about every quiet decision made along the way.\n\nFrom the very first spark of an idea to mixing the initial pigments, this piece evolved with every layer. There were experiments that took unexpected turns, surprises that turned out better than planned, and so many little details that make this piece completely unique.\n\nWhether you\'re an artist, a dreamer, or simply scrolling through, thank you for being part of this creative journey! Which detail catches your eye first?',
      Reel: 'Creating meaningful content is always a balance of technique, patience, and embracing the spontaneous moments.\n\nWe spent hours refining the pacing, lighting, and mood for this project, but what made it truly special was letting go of perfection and capturing genuine emotion. When you see the final sequence come together with the soundtrack, all the effort feels worth it.\n\nSave this post for your creative moodboard and let me know your thoughts below! 💬✨',
      Product: 'Great design is invisible until you notice how seamless it makes your day.\n\nEvery curve, finish, and material choice in this release was meticulously tested to deliver elegance without compromising utility. Whether you are using it at home, at work, or on the move, it feels intuitive and luxurious from day one.\n\nExplore the collection now—crafted for those who appreciate substance behind the style.',
      Personal: 'Sometimes the best days aren\'t the ones with grand milestones, but the ones where you simply pause to soak it all in.\n\nLooking back at this moment reminds me how important it is to celebrate small wins, stay grounded, and share positive energy with the people around us. Life moves fast, but memories like these keep us anchored.\n\nSending good vibes your way today—what is one thing that made you smile recently?'
    }
  };

  const ctasMap = {
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

  const hooksList = hooksMap[contentType] || hooksMap.Personal;
  const hook = hooksList[Math.floor(Math.random() * hooksList.length)];
  let caption = (captionsMap[length] && captionsMap[length][contentType]) || captionsMap.Medium.Personal;

  if (additionalInstructions && additionalInstructions.trim()) {
    caption += `\n\n✨ Note: Inspired by ${additionalInstructions.trim()}`;
  }

  const cta = ctasMap[contentType] || ctasMap.Personal;
  const hashtags = hashtagsMap[contentType] || hashtagsMap.Personal;
  const keywords = ['creative storytelling', 'visual aesthetics', contentType.toLowerCase(), mood.toLowerCase(), 'instagram strategy'];

  return {
    hook,
    caption,
    cta,
    keywords,
    hashtags,
    isFallback: true
  };
};

/**
 * Direct REST API fallback for Gemini if SDK encounters endpoint/serialization issues
 */
const generateWithRestApi = async ({ apiKey, model, prompt, base64Data, mimeType }) => {
  const versions = ['v1beta', 'v1'];
  let lastRestErr = null;

  for (const ver of versions) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return extractJson(rawText);
      }
    } catch (err) {
      lastRestErr = err;
    }
  }

  throw lastRestErr || new Error('REST call to Gemini API failed');
};

/**
 * Main Gemini Vision Generator with multi-model auto-discovery and graceful fallback
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
    console.warn('[Gemini Service] No valid GEMINI_API_KEY provided in environment. Utilizing contextual fallback generator.');
    return generateMockFallback({ contentType, mood, length, additionalInstructions });
  }

  const prompt = buildInstagramPrompt({
    contentType,
    mood,
    length,
    additionalInstructions
  });

  const base64Data = imageBuffer.toString('base64');
  const configuredModel = getModelName();

  // Prioritized list of modern Gemini vision models to attempt
  const candidateModels = Array.from(new Set([
    configuredModel,
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro'
  ].filter(Boolean)));

  let lastError = null;

  // 1. Try SDK invocation across candidate models
  for (const modelCandidate of candidateModels) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      console.log(`[Gemini Service] Attempting multimodal generation with model: ${modelCandidate}`);

      const response = await ai.models.generateContent({
        model: modelCandidate,
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
      if (responseText) {
        const parsed = extractJson(responseText);
        console.log(`[Gemini Service] Successfully generated caption using model: ${modelCandidate}`);
        return {
          hook: parsed.hook || '',
          caption: parsed.caption || '',
          cta: parsed.cta || '',
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
          modelUsed: modelCandidate
        };
      }
    } catch (sdkError) {
      console.warn(`[Gemini Service] Model candidate ${modelCandidate} failed: ${sdkError.message}`);
      lastError = sdkError;
    }
  }

  // 2. Try direct REST call for top candidates
  for (const modelCandidate of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
    try {
      console.log(`[Gemini Service] Attempting direct REST generation with model: ${modelCandidate}`);
      const parsed = await generateWithRestApi({
        apiKey,
        model: modelCandidate,
        prompt,
        base64Data,
        mimeType
      });
      if (parsed) {
        console.log(`[Gemini Service] Successfully generated caption via REST using model: ${modelCandidate}`);
        return {
          hook: parsed.hook || '',
          caption: parsed.caption || '',
          cta: parsed.cta || '',
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
          modelUsed: `${modelCandidate} (REST)`
        };
      }
    } catch (restError) {
      console.warn(`[Gemini Service] REST generation for ${modelCandidate} failed: ${restError.message}`);
      lastError = restError;
    }
  }

  // 3. Resilient Fallback: If external AI fails (e.g. quota, region block, 404, invalid key),
  // NEVER throw a 500 error that breaks the client application.
  console.error('[Gemini Service] All Gemini API endpoints failed. Activating contextual fallback generator to ensure uninterrupted user service.');
  if (lastError) {
    console.error(`[Gemini Service Diagnostic]: ${lastError.message}`);
  }

  return generateMockFallback({
    contentType,
    mood,
    length,
    additionalInstructions
  });
};

module.exports = {
  generateCaptionWithGemini,
  generateMockFallback
};

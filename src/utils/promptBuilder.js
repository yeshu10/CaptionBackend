/**
 * Prompt Builder utility for crafting high-converting Instagram caption prompts
 */

const buildInstagramPrompt = ({
  contentType = 'Personal',
  mood = 'Aesthetic',
  length = 'Medium',
  additionalInstructions = ''
}) => {
  const lengthGuidelines = {
    Short: '1 to 2 punchy, attention-grabbing sentences (approx 15-35 words).',
    Medium: '3 to 5 engaging sentences with clean paragraph spacing (approx 50-100 words).',
    Long: 'A rich mini-blog style caption with deep storytelling, narrative arc, or bulleted tips (approx 120-200 words).'
  };

  const contentTypeGuidelines = {
    Painting: 'Artistic appreciation, creative journey, emotional resonance, color palette, medium, texture, and visual storytelling.',
    Reel: 'High-energy hook designed for the first 3 seconds, curiosity gap, quick pacing, and strong incentive to watch/save/share.',
    Product: 'Highlighting craft, quality, lifestyle appeal, user benefits, and compelling reason to purchase or check the link in bio.',
    Personal: 'Authentic voice, relatable thought or milestone, conversational warmth, and open-ended conversation starter.'
  };

  const moodGuidelines = {
    Cute: 'Sweet, playful, bubbly, warm, adorable phrasing with delightful emojis.',
    Aesthetic: 'Curated, poetic, moody, artistic, effortless cool with elegant spacing and subtle emojis.',
    Funny: 'Witty, humorous, relatable sarcasm, punchy comedic timing, and playful self-awareness.',
    Emotional: 'Heartfelt, vulnerable, poignant, touching, and profoundly thoughtful.',
    Professional: 'Polished, insightful, authoritative yet friendly, providing tangible value or industry perspective.',
    Minimal: 'Striking, crisp, no fluff, powerful brevity, maximum impact with few words.',
    Romantic: 'Dreamy, affectionate, nostalgic, gentle, evoking warmth and love.'
  };

  return `
You are an elite Instagram copywriter and social media strategist known for writing viral, high-engagement captions for world-class creators, artists, and brands.

Analyze the provided image thoroughly. Inspect its subject matter, focal points, lighting, color harmony, atmosphere, emotions, and visual details.

Generate an Instagram post tailored specifically to these parameters:
- **Content Type**: ${contentType} (${contentTypeGuidelines[contentType] || 'Engaging content'})
- **Mood / Tone**: ${mood} (${moodGuidelines[mood] || 'Balanced and modern'})
- **Caption Length**: ${length} (${lengthGuidelines[length] || 'Engaging standard length'})
${additionalInstructions ? `- **Custom Creator Instructions**: "${additionalInstructions}"` : ''}

Strict Output Requirements:
1. "hook": A magnetic 1-sentence opening hook that stops the user from scrolling.
2. "caption": The complete Instagram caption matching the requested length and mood, formatted with clean line breaks and tasteful, natural emojis.
3. "cta": A clear, high-converting call to action tailored to boost saves, comments, or shares (e.g. "Save this for your next project", "Comment your favorite detail below", "Tag someone who needs to see this").
4. "keywords": An array of 4-7 SEO discovery keywords and search terms relevant to the image and niche.
5. "hashtags": An array of 10-18 targeted, high-performing Instagram hashtags, including relevant niche tags, community tags, and broad discovery tags (each starting with '#').

Respond ONLY with a valid JSON object strictly matching this schema:
{
  "hook": "string",
  "caption": "string",
  "cta": "string",
  "keywords": ["string"],
  "hashtags": ["string"]
}
`;
};

module.exports = { buildInstagramPrompt };

export default async function handler(req, res) {
  // CORS — allow your Netlify frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server not configured' });

  const platform =
    url.includes('tiktok') ? 'TikTok' :
    url.includes('instagram') ? 'Instagram' :
    url.includes('youtube') || url.includes('youtu.be') ? 'YouTube' :
    url.includes('pinterest') ? 'Pinterest' :
    'social media';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `A user shared this ${platform} URL: ${url}

Identify the product likely being featured. Use the URL slug, username, or any keywords to make your best guess.

Respond ONLY with this JSON (no markdown, no explanation):
{"product":"<specific product name with brand>","description":"<one sentence description>","searchQuery":"<best Amazon search query>"}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse AI response' });

    const result = JSON.parse(match[0]);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

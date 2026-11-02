// api/analyze-wine.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                data: imageData.split(',')[1]
              }
            },
            {
              type: 'text',
              text: `Analyze this wine label image and extract the following information. Return ONLY a valid JSON object with these exact fields (use empty string "" if information is not visible or unclear):

{
  "name": "full wine name from the label",
  "vintage": "year as a number (e.g., 2019) or empty string",
  "type": "Red or White or Rosé or Sparkling or empty string",
  "country": "country of origin",
  "region": "wine region or appellation"
}

IMPORTANT: Return ONLY the JSON object, no other text, no markdown formatting, no explanations.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return res.status(response.status).json({ error: 'API request failed' });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
    const wineInfo = JSON.parse(cleanText);

    return res.status(200).json(wineInfo);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

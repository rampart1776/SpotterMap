exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let postUrl, username;
  try {
    const body = JSON.parse(event.body);
    postUrl = body.postUrl;
    username = body.username;
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!postUrl || typeof postUrl !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'postUrl is required' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Extract aviation details from this X/Twitter post URL. The username is @${username}. Return ONLY a valid JSON object with these fields: aircraft_type (e.g. B777), airline, registration (tail number if present), airport_icao, is_video (boolean). Use null for anything not determinable. URL: ${postUrl}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Extraction failed' }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ extraction: json })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong' }) };
  }
};

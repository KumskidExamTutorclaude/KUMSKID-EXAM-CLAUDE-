export default {
  async fetch(request, env) {

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { image, mimeType } = await request.json();

      if (!image || !mimeType) {
        return new Response(JSON.stringify({ error: 'Image and mimeType required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Call Claude Haiku 4.5 vision
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: image
                }
              },
              {
                type: 'text',
                text: 'This is an exam question paper photo from a Nigerian student. Read the question(s) clearly and return the full text of the question(s) exactly as written. If there are multiple questions include all of them. Only return the question text nothing else.'
              }
            ]
          }]
        })
      });

      const claudeData = await claudeRes.json();

      if (!claudeRes.ok || !claudeData.content || !claudeData.content[0]) {
        return new Response(JSON.stringify({ 
          error: claudeData.error?.message || 'Claude could not read the image' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Return extracted text to KUMSKID platform
      return new Response(JSON.stringify({ 
        text: claudeData.content[0].text 
      }), {
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};

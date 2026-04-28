export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/stock') return handleStock(url, env, cors);
      if (path === '/api/transcribe') return handleTranscribe(request, env, cors);
      if (path === '/api/analyze') return handleAnalyze(request, env, cors);
      return json({ error: 'Not found' }, 404, cors);
    } catch (e) {
      return json({ error: e.message }, 500, cors);
    }
  }
};

// ===== STOCK PRICE =====
const priceCache = new Map();

async function handleStock(url, env, cors) {
  const ticker = url.searchParams.get('ticker');
  const exchange = url.searchParams.get('exchange') || 'NASDAQ';
  if (!ticker) return json({ error: 'ticker required' }, 400, cors);

  const cacheKey = `${ticker}:${exchange}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
    return json({ ...cached.data, cached: true }, 200, cors);
  }

  let data = { ticker, exchange, price: null, name: null, source: null };

  // 1) Try Google Finance HTML scrape
  data = await fetchGoogleFinance(ticker, exchange, data);

  // 2) Fallback: Alpha Vantage
  if (!data.price) {
    data = await fetchAlphaVantage(ticker, data);
  }

  if (data.price) {
    priceCache.set(cacheKey, { data, ts: Date.now() });
  }
  return json(data, data.price ? 200 : 404, cors);
}

async function fetchGoogleFinance(ticker, exchange, result) {
  try {
    const resp = await fetch(
      `https://www.google.com/finance/quote/${ticker}:${exchange}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }
    );
    if (!resp.ok) return result;
    const html = await resp.text();

    // data-last-price (may be present in server-rendered HTML)
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    if (priceMatch) {
      result.price = parseFloat(priceMatch[1]);
      result.source = 'google';
    }

    // Title for company name
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const parts = titleMatch[1].split(' - ');
      if (parts.length > 1) result.name = parts[1].split('|')[0].trim();
    }
  } catch (e) { /* fallback */ }
  return result;
}

async function fetchAlphaVantage(ticker, result) {
  try {
    const resp = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=demo`
    );
    if (!resp.ok) return result;
    const data = await resp.json();
    const quote = data['Global Quote'];
    if (quote && quote['05. price']) {
      result.price = parseFloat(quote['05. price']);
      result.name = result.name || quote['01. symbol'];
      result.source = 'alphavantage';
      result.details = {
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        change: quote['09. change'],
        changePercent: quote['10. change percent'],
        tradingDay: quote['07. latest trading day'],
      };
    }
  } catch (e) { /* no data */ }
  return result;
}

// ===== TRANSCRIBE: Azure OpenAI gpt-4o-transcribe =====
async function handleTranscribe(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405, cors);

  const formData = await request.formData();
  const audioFile = formData.get('audio');
  if (!audioFile) return json({ error: 'audio file required' }, 400, cors);

  const azureUrl = `${env.AZURE_OPENAI_ENDPOINT}openai/deployments/gpt-4o-transcribe/audio/transcriptions?api-version=2025-04-01-preview`;

  const body = new FormData();
  body.append('file', audioFile, 'audio.webm');
  body.append('model', 'gpt-4o-transcribe');

  const resp = await fetch(azureUrl, {
    method: 'POST',
    headers: { 'api-key': env.AZURE_OPENAI_API_KEY },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: 'Transcription failed', detail: err }, resp.status, cors);
  }

  const result = await resp.json();
  return json({ text: result.text }, 200, cors);
}

// ===== ANALYZE: Groq LLM =====
async function handleAnalyze(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405, cors);

  const body = await request.json();
  const preds = body.predictions;
  if (!preds || !preds.length) return json({ error: 'predictions required' }, 400, cors);

  const resolved = preds.filter(p => p.status !== 'pending');
  const pending = preds.filter(p => p.status === 'pending');

  const prompt = `You are a prediction accuracy analyst. Analyze this user's prediction track record and provide deep insights.

RESOLVED PREDICTIONS (${resolved.length}):
${resolved.map(p => `- [${p.result}] ${p.type === 'stock' ? p.ticker + ' ' + p.direction + ' $' + p.targetPrice : p.text} | confidence: ${p.confidence} | category: ${p.category || p.type} | reasoning: "${p.reasoning || 'none'}"`).join('\n')}

PENDING PREDICTIONS (${pending.length}):
${pending.map(p => `- ${p.type === 'stock' ? p.ticker + ' ' + p.direction + ' $' + p.targetPrice : p.text} | confidence: ${p.confidence} | deadline: ${p.deadline}`).join('\n')}

Respond ONLY with valid JSON:
{"overall_accuracy":"X%","calibration":"overconfident/underconfident/well-calibrated","strengths":["..."],"weaknesses":["..."],"patterns":["..."],"recommendations":["..."],"blind_spots":["..."],"summary":"2-3 sentences"}`;

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.GROQ_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: 'Analysis failed', detail: err }, resp.status, cors);
  }

  const result = await resp.json();
  try {
    const analysis = JSON.parse(result.choices[0].message.content);
    return json(analysis, 200, cors);
  } catch (e) {
    return json({ error: 'Failed to parse analysis', raw: result.choices[0].message.content }, 500, cors);
  }
}

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

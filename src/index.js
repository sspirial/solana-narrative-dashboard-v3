const express = require('express');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const NARRATIVE_RULES = [
  {
    name: 'RWA Renaissance',
    keywords: ['rwa', 'tokenized', 'treasury', 'equity', 'asset', 'bond'],
    ideas: [
      'Compliant RWA Yield Router: optimize across tokenized T‑Bills with unified KYC.',
      'Tokenized Equity Collateral: borrow USDC/SOL against on‑chain equities.',
      'RWA AMM with trading-hours + compliance hooks for institutional flows.'
    ]
  },
  {
    name: 'Stablecoin Micropayments',
    keywords: ['stablecoin', 'micropayment', 'payment', 'usdc', 'remittance'],
    ideas: [
      'Stream‑to‑Pay API: per‑second USDC payments for content & APIs.',
      'Remittance Blinks: send USDC from social apps to bank rails via actions.',
      'Merchant loyalty on USDC: auto‑cashback tokens at purchase.'
    ]
  },
  {
    name: 'Agent Economy',
    keywords: ['agent', 'autonomous', 'ai agent', 'multi‑agent', 'workflow'],
    ideas: [
      'Agent‑to‑Agent marketplace: agents buy data/compute with instant payouts.',
      'Autonomous treasury ops: policy‑bound agent that executes DAO decisions.',
      'Agent wallet standard: limits, allowances, and accounting baked in.'
    ]
  },
  {
    name: 'Network Resilience (Firedancer)',
    keywords: ['firedancer', 'client diversity', 'validator', 'performance'],
    ideas: [
      'Client‑diversity staking dashboard with incentives to balance clients.',
      'Realtime infra verification for DePIN using high‑throughput finality.',
      'Stress‑test sandbox: simulate load for Solana apps pre‑mainnet.'
    ]
  }
];

async function braveSearch(query, apiKey) {
  if (!apiKey) throw new Error('Missing BRAVE_API_KEY');
  const res = await axios.get(BRAVE_API_URL, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
    params: { q: query, count: 10 }
  });
  return res.data?.web?.results || [];
}

function scoreNarratives(text) {
  const lower = text.toLowerCase();
  return NARRATIVE_RULES.map(rule => {
    const score = rule.keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    return { ...rule, score };
  }).filter(n => n.score > 0).sort((a,b) => b.score - a.score);
}

async function fetchGithubSignals() {
  const q = 'topic:solana stars:>50';
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`;
  const res = await axios.get(url, { headers: { 'Accept': 'application/vnd.github+json' } });
  return res.data.items.map(r => ({ name: r.full_name, stars: r.stargazers_count, url: r.html_url }));
}

async function fetchSolanaSignals() {
  const txCount = await axios.post(SOLANA_RPC, { jsonrpc: '2.0', id: 1, method: 'getTransactionCount' });
  const epoch = await axios.post(SOLANA_RPC, { jsonrpc: '2.0', id: 2, method: 'getEpochInfo' });
  return {
    transactionCount: txCount.data.result,
    epoch: epoch.data.result.epoch,
    slot: epoch.data.result.absoluteSlot
  };
}

const app = express();
app.use(express.json());

app.get('/api/narratives', async (req, res) => {
  try {
    const apiKey = req.query.key;
    const results = await braveSearch('Solana ecosystem trends February 2026', apiKey);
    const text = results.map(r => `${r.title} ${r.description || ''}`).join(' ');
    const narratives = scoreNarratives(text);
    res.json({ narratives, sources: results.slice(0, 6) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Request failed' });
  }
});

app.get('/api/signals', async (_req, res) => {
  try {
    const [github, solana] = await Promise.all([fetchGithubSignals(), fetchSolanaSignals()]);
    res.json({ github, solana });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Signal fetch failed' });
  }
});

app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Solana Narrative Dashboard</title>
<style>
  body{font-family:system-ui;background:#0b0f19;color:#e5e7eb;padding:24px}
  .container{max-width:980px;margin:0 auto}
  h1{font-size:28px;margin-bottom:6px}
  .sub{color:#9ca3af;margin-bottom:24px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin-bottom:16px}
  .badge{display:inline-block;background:#1f2937;color:#93c5fd;padding:4px 10px;border-radius:999px;font-size:12px;margin-left:8px}
  .input{width:100%;padding:10px;border-radius:8px;border:1px solid #374151;background:#0f172a;color:#e5e7eb}
  button{padding:10px 14px;border-radius:8px;border:0;background:#2563eb;color:white;font-weight:600;cursor:pointer}
  a{color:#93c5fd}
  .muted{color:#9ca3af}
  details summary{cursor:pointer}
</style>
</head>
<body>
<div class="container">
  <h1>Solana Narrative Dashboard</h1>
  <div class="sub">Live signals → explainable narratives → build ideas</div>

  <div class="card">
    <h3>Signals (live)</h3>
    <div id="signals" class="muted">Loading signals…</div>
  </div>

  <div class="card">
    <h3>Connect your Brave API key</h3>
    <p class="muted">Your key is used for this request only. It is not stored.</p>
    <input class="input" id="key" placeholder="Paste Brave API key" />
    <button onclick="run()">Run Analysis</button>
    <div id="status" class="muted" style="margin-top:8px"></div>
  </div>

  <div id="results"></div>
</div>

<script>
async function loadSignals(){
  const el = document.getElementById('signals');
  try{
    const res = await fetch('/api/signals');
    const data = await res.json();
    if(data.error){ el.textContent = data.error; return; }
    const gh = data.github.map(r => '<li><a href="'+r.url+'" target="_blank">'+r.name+'</a> — ★'+r.stars+'</li>').join('');
    el.innerHTML = '<b>Solana RPC:</b> txCount '+data.solana.transactionCount+', epoch '+data.solana.epoch+', slot '+data.solana.slot+'<br/><b>GitHub:</b><ul>'+gh+'</ul>';
  }catch(e){ el.textContent = 'Failed to load signals.'; }
}

async function run(){
  const key = document.getElementById('key').value.trim();
  const status = document.getElementById('status');
  status.textContent = 'Running...';
  if(!key){ status.textContent='Please paste your Brave API key.'; return; }
  const res = await fetch('/api/narratives?key='+encodeURIComponent(key));
  const data = await res.json();
  if(data.error){ status.textContent = data.error; return; }
  status.textContent = 'Updated just now.';
  const results = document.getElementById('results');
  results.innerHTML = '';
  data.narratives.forEach(n => {
    const card = document.createElement('div');
    card.className='card';
    const ideas = n.ideas.map(i => '<li>'+i+'</li>').join('');
    card.innerHTML = '<h2>'+n.name+'<span class="badge">score '+n.score+'</span></h2><ul>'+ideas+'</ul>';
    results.appendChild(card);
  });
  const src = document.createElement('div');
  src.className='card';
  const sources = data.sources.map(s => '<li><a href="'+s.url+'" target="_blank">'+s.title+'</a><br/><span class="muted">'+(s.description||'')+'</span></li>').join('');
  src.innerHTML = '<details open><summary>Sources</summary><ul>'+sources+'</ul></details>';
  results.appendChild(src);
}

loadSignals();
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});

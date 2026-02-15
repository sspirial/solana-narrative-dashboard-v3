const express = require('express');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

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

async function braveSearch(query) {
  if (!BRAVE_API_KEY) {
    throw new Error('Missing BRAVE_API_KEY');
  }
  const res = await axios.get(BRAVE_API_URL, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    },
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

function renderHTML(narratives, sources, error) {
  const head = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Solana Narrative Dashboard</title>
  <style>body{font-family:system-ui;background:#0d1117;color:#c9d1d9;padding:24px}h1,h2{color:#58a6ff}a{color:#8b949e}section{border:1px solid #30363d;padding:16px;border-radius:8px;margin-bottom:16px}</style>
  </head><body>`;
  const footer = `</body></html>`;

  if (error) {
    return head + `<section><h2>Error</h2><p>${error}</p></section>` + footer;
  }

  const narrativesHtml = narratives.map(n => `
    <section>
      <h2>${n.name} (score: ${n.score})</h2>
      <ul>${n.ideas.map(i => `<li>${i}</li>`).join('')}</ul>
    </section>`).join('');

  const sourcesHtml = sources.map(s => `
    <li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a><br/><small>${s.description || ''}</small></li>`).join('');

  return head + `
    <h1>Solana Narrative Dashboard</h1>
    <p>Live signals + explainable narrative detection</p>
    ${narrativesHtml || '<section><p>No narratives detected from current sources.</p></section>'}
    <section><h2>Sources</h2><ul>${sourcesHtml}</ul></section>
  ` + footer;
}

const app = express();

app.get('/', async (_req, res) => {
  try {
    const results = await braveSearch('Solana ecosystem trends February 2026');
    const text = results.map(r => `${r.title} ${r.description || ''}`).join(' ');
    const narratives = scoreNarratives(text);
    const html = renderHTML(narratives, results.slice(0, 6));
    res.send(html);
  } catch (err) {
    res.status(500).send(renderHTML([], [], err.message));
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});

# Solana Narrative Dashboard (v3)

A live, tested dashboard that ingests current web signals (Brave Search API) to detect emerging Solana narratives and generate 3–5 build ideas per narrative.

## Run
```bash
npm install
BRAVE_API_KEY=your_key npm start
```
Open http://localhost:3000

## How it works
- Pulls live web results for Solana trends
- Scores narratives by keyword signals
- Shows build ideas + sources

## Output
- Narrative sections with ideas
- Sources list (links + snippets)

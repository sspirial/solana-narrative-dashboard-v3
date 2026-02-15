# Solana Narrative Dashboard (v3)

Live, explainable Solana narrative dashboard that **does not use the owner’s API key**. Each user provides their own Brave Search API key in the UI.

## Run
```bash
npm install
npm start
```
Open http://localhost:3000 and paste your Brave API key.

## How it works
- UI asks the user for their Brave API key
- Server uses that key for a single request
- Narratives are scored via keyword rules
- Output shows sources + 3–5 ideas per narrative

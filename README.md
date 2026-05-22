# BioSignal

Longitudinal biomarker prediction platform. Tracks how blood panel markers change over time, correlates them with wearable data, and projects where they're heading.

## What it does

- **16 biomarkers** — cortisol, TSH, testosterone, free T, DHEA-S, prolactin, vitamin D, B12, ferritin, insulin, HbA1c, estradiol, progesterone, LH, FSH, iron saturation
- **Linear regression trending** — slope, R², and 30/60/90-day predictions for every marker
- **Wearable integration** — Oura Ring data (HRV, resting HR, deep sleep, temperature, sleep score, steps) with trend analysis
- **Cross-correlation** — which wearable metrics track with which biomarker changes
- **Predictive alerts** — flags markers moving toward or away from optimal ranges
- **AI summary** — Claude-powered narrative report via serverless API

## Architecture

```
frontend/
├── src/App.jsx          # Single-file React app with analysis engine
├── api/generate-report.js  # Vercel serverless function (Claude API)
├── vercel.json          # Routing config
└── package.json         # React 18, Vite, Recharts, Lucide
```

All analysis runs client-side in JavaScript (linear regression, correlations, alerts). The only server-side component is the Claude API call, which runs as a Vercel serverless function to keep the API key secure.

## Local development

```bash
cd frontend
npm install
npm run dev
```

For the AI summary feature, set `ANTHROPIC_API_KEY` in `.env.local` and use the Vercel CLI:

```bash
npx vercel dev
```

## Deploy

```bash
cd frontend
npx vercel --prod
```

Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard.

## Reference ranges

All ranges are calibrated for female patients based on clinical lab reference intervals. Optimal ranges represent functional medicine targets, not just "normal."

## Stack

- React 18 + Vite
- Recharts for data visualization
- Lucide React for icons
- DM Sans / DM Serif Display / IBM Plex Mono
- Vercel serverless functions
- Anthropic Claude API

# BioSignal

**[Live Demo →](https://biosignal-aakritisuri.vercel.app)**

Longitudinal biomarker prediction platform. Tracks blood panel changes over time, correlates with wearable data, and predicts where markers are heading — 30, 60, and 90 days out.

---

## The Problem

A blood panel is a snapshot. It tells you where your biomarkers are *right now*, but not where they're *going*. Two panels three months apart contain trajectory information that standard lab reports ignore entirely.

BioSignal extracts that trajectory. Given two or more blood panel snapshots, it runs linear regression on each biomarker, classifies trend direction, projects future values, and flags markers that are heading toward or away from optimal ranges. Add wearable data (HRV, resting HR, sleep quality) and it correlates daily biometrics with quarterly lab changes.

## Features

### Biomarker Trajectory Analysis
- **16 biomarkers** across 5 categories (hormones, thyroid, metabolic, reproductive, nutrients)
- Linear regression with R² goodness-of-fit for every marker
- 30/60/90-day projections plotted as dashed trend lines
- Three-tier status: **optimal** (functional medicine target), **in range** (standard lab reference), **out of range**

### Wearable Data Integration
- Oura Ring / Whoop / Apple Watch CSV import
- 6 daily metrics: HRV, resting HR, deep sleep %, temperature deviation, sleep score, steps
- Rolling averages, trend slopes, and volatility scores
- Cross-correlation between wearable windows and biomarker deltas

### Predictive Alerts
- Automated flags for markers projected to enter or leave optimal/reference ranges
- Rapid change warnings when slope exceeds 15% of baseline per month
- Wearable-derived alerts (HRV trending up → autonomic improvement, resting HR declining → cardio fitness)

### AI Clinical Summary
- Claude-powered narrative synthesis of the full longitudinal analysis
- Mechanistic insights, key improvements, remaining concerns, protocol suggestions
- Runs via Vercel serverless function — API key never touches the browser

---

## Architecture

```
biosignal/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Entire app: landing, input, dashboard, analysis engine
│   │   ├── main.jsx             ← React 18 entry point
│   │   └── index.css            ← CSS variables, typography
│   ├── api/
│   │   └── generate-report.js   ← Vercel serverless function (Claude API)
│   ├── index.html               ← DM Sans, DM Serif Display, IBM Plex Mono
│   ├── vite.config.js
│   ├── vercel.json              ← SPA routing + API rewrites
│   └── package.json
└── README.md
```

**Key design decisions:**
- **No backend.** All analysis (regression, correlation, alerts) runs client-side in JavaScript. Zero latency, zero server costs, full privacy.
- **Single-file architecture.** `App.jsx` contains the analysis engine, all components, and all views. No premature abstraction — everything in one searchable file.
- **Serverless API only for Claude.** The only server-side code is `api/generate-report.js`, which proxies the Anthropic API so the key stays secret.

---

## Biomarker Reference Ranges

All ranges calibrated for **female patients**. Optimal ranges represent functional medicine targets, not just "normal."

| Biomarker | Unit | Reference Range | Optimal Range | Category |
|-----------|------|----------------|---------------|----------|
| Cortisol | µg/dL | 4–22 | 6–15 | Hormones |
| TSH | mIU/L | 0.4–4.5 | 1–2.5 | Thyroid |
| Testosterone | ng/dL | 15–70 | 30–55 | Hormones |
| Free T | pg/mL | 0.1–6.4 | 1.5–4.5 | Hormones |
| DHEA-S | µg/dL | 35–430 | 150–350 | Hormones |
| Prolactin | ng/mL | 2–29 | 5–20 | Hormones |
| Vitamin D | ng/mL | 20–100 | 40–60 | Nutrients |
| B12 | pg/mL | 200–900 | 400–800 | Nutrients |
| Ferritin | ng/mL | 12–150 | 40–100 | Nutrients |
| Insulin | µIU/mL | 2–25 | 3–8 | Metabolic |
| HbA1c | % | 4–5.6 | 4.5–5.3 | Metabolic |
| Estradiol | pg/mL | 15–350 | 30–200 | Reproductive |
| Progesterone | ng/mL | 0.1–25 | 0.5–20 | Reproductive |
| LH | mIU/mL | 1–95 | 2–15 | Reproductive |
| FSH | mIU/mL | 1.5–135 | 3–10 | Reproductive |
| Iron Sat | % | 12–45 | 20–35 | Nutrients |

---

## Analysis Engine

The analysis engine runs entirely in the browser with no dependencies beyond standard JS math.

**Linear regression:** OLS fit on day-offsets from the earliest panel date. Returns slope (per day), intercept, R², and extrapolated values at +30, +60, +90 days from the last data point.

**Trend classification:** A marker is "increasing" or "declining" if its 30-day projected change exceeds 2% of the initial value. Otherwise "stable."

**Status classification:** Each marker value is checked against two ranges — the standard clinical reference range and a tighter functional medicine optimal range.

**Correlation analysis:** For each consecutive panel pair, BioSignal computes the biomarker delta and the average of each wearable metric in the window between draws. Direction agreement determines correlation sign.

**Alert generation:** Three trigger conditions:
1. Marker projected to *enter* optimal range within 90 days → positive alert
2. Marker projected to *leave* reference range within 90 days → warning alert
3. Monthly rate of change exceeds 15% of current value → rapid change alert

---

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. All analysis works locally — no backend needed.

For the AI summary feature during development:

```bash
# Create .env.local with your key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Use Vercel CLI for serverless function support
npx vercel dev
```

---

## Deploy

```bash
cd frontend
npx vercel --prod
```

Then in the Vercel dashboard:
1. Set **Root Directory** to `frontend`
2. Add `ANTHROPIC_API_KEY` to **Settings → Environment Variables**

Auto-deploys on every push to `main` via GitHub integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Charts | Recharts |
| Icons | Lucide React |
| Typography | DM Sans, DM Serif Display, IBM Plex Mono |
| AI | Claude API (Sonnet 4) via Vercel serverless |
| Hosting | Vercel |
| Analysis | Pure JavaScript (no external math libraries in browser) |

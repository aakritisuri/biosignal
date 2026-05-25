import { useState, useMemo } from 'react'
import {
  Activity, ArrowRight, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Info, Plus, Trash2, Upload, Download, Loader2,
  BarChart3, Zap, Heart, Shield, Brain, Droplets, FlaskConical, Dna,
  ArrowDown, ChevronRight, Clock, Eye, Sparkles,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, AreaChart, Area,
} from 'recharts'

// ---------------------------------------------------------------------------
// Reference ranges — female patients
// ---------------------------------------------------------------------------

const REF = {
  cortisol:           { unit: 'µg/dL',   range: [4, 22],      optimal: [6, 15],      label: 'Cortisol',         category: 'Hormones' },
  tsh:                { unit: 'mIU/L',   range: [0.4, 4.5],   optimal: [1, 2.5],     label: 'TSH',              category: 'Thyroid' },
  testosterone:       { unit: 'ng/dL',   range: [15, 70],     optimal: [30, 55],     label: 'Testosterone',     category: 'Hormones' },
  free_testosterone:  { unit: 'pg/mL',   range: [0.1, 6.4],   optimal: [1.5, 4.5],   label: 'Free T',           category: 'Hormones' },
  dhea_s:             { unit: 'µg/dL',   range: [35, 430],    optimal: [150, 350],   label: 'DHEA-S',           category: 'Hormones' },
  prolactin:          { unit: 'ng/mL',   range: [2, 29],      optimal: [5, 20],      label: 'Prolactin',        category: 'Hormones' },
  vitamin_d:          { unit: 'ng/mL',   range: [20, 100],    optimal: [40, 60],     label: 'Vitamin D',        category: 'Nutrients' },
  b12:                { unit: 'pg/mL',   range: [200, 900],   optimal: [400, 800],   label: 'B12',              category: 'Nutrients' },
  ferritin:           { unit: 'ng/mL',   range: [12, 150],    optimal: [40, 100],    label: 'Ferritin',         category: 'Nutrients' },
  insulin:            { unit: 'µIU/mL',  range: [2, 25],      optimal: [3, 8],       label: 'Insulin',          category: 'Metabolic' },
  hba1c:              { unit: '%',       range: [4, 5.6],     optimal: [4.5, 5.3],   label: 'HbA1c',            category: 'Metabolic' },
  estradiol:          { unit: 'pg/mL',   range: [15, 350],    optimal: [30, 200],    label: 'Estradiol',        category: 'Reproductive' },
  progesterone:       { unit: 'ng/mL',   range: [0.1, 25],    optimal: [0.5, 20],    label: 'Progesterone',     category: 'Reproductive' },
  lh:                 { unit: 'mIU/mL',  range: [1, 95],      optimal: [2, 15],      label: 'LH',               category: 'Reproductive' },
  fsh:                { unit: 'mIU/mL',  range: [1.5, 135],   optimal: [3, 10],      label: 'FSH',              category: 'Reproductive' },
  iron_saturation:    { unit: '%',       range: [12, 45],     optimal: [20, 35],     label: 'Iron Sat',         category: 'Nutrients' },
}

const MARKER_KEYS = Object.keys(REF)

const CATEGORIES = {
  Hormones:     { icon: Dna,          color: '#7C3AED', bg: '#F5F3FF', desc: 'Cortisol, testosterone, DHEA-S, prolactin' },
  Thyroid:      { icon: Shield,       color: '#0891B2', bg: '#ECFEFF', desc: 'TSH — thyroid function screening' },
  Metabolic:    { icon: Zap,          color: '#D97706', bg: '#FEF3C7', desc: 'Fasting insulin, HbA1c — glucose metabolism' },
  Reproductive: { icon: Heart,        color: '#DB2777', bg: '#FCE7F3', desc: 'Estradiol, progesterone, LH, FSH' },
  Nutrients:    { icon: FlaskConical,  color: '#059669', bg: '#ECFDF5', desc: 'Vitamin D, B12, ferritin, iron saturation' },
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_PANELS = [
  {
    date: '2025-08-20',
    markers: {
      cortisol: 13.9, tsh: 1.77, testosterone: 65, free_testosterone: 4.61,
      dhea_s: 445, prolactin: 56.2, vitamin_d: 8.8, b12: 193, ferritin: 24.5,
      insulin: 7.8, hba1c: 4.9, estradiol: 33.8, progesterone: 0.42,
      lh: 4.4, fsh: 4.7, iron_saturation: 13.1,
    },
  },
  {
    date: '2025-11-15',
    markers: {
      cortisol: 11.2, tsh: 1.65, testosterone: 48, free_testosterone: 3.2,
      dhea_s: 320, prolactin: 32.1, vitamin_d: 38.5, b12: 410, ferritin: 52,
      insulin: 6.9, hba1c: 4.8, estradiol: 45.2, progesterone: 0.55,
      lh: 5.1, fsh: 5.3, iron_saturation: 22.4,
    },
  },
]

function generateSampleWearable() {
  const start = new Date('2025-08-20')
  const days = 88
  const data = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const t = i / days
    data.push({
      date: d.toISOString().slice(0, 10),
      hrv: +(35 + t * 10 + (Math.random() - 0.5) * 6).toFixed(1),
      resting_hr: +(68 - t * 6 + (Math.random() - 0.5) * 3).toFixed(0),
      deep_sleep_pct: +(12 + t * 6 + (Math.random() - 0.5) * 3).toFixed(1),
      temperature_deviation: +(0.1 + Math.random() * 0.2).toFixed(2),
      sleep_score: +(68 + t * 12 + (Math.random() - 0.5) * 8).toFixed(0),
      steps: +(5000 + t * 3000 + (Math.random() - 0.5) * 2000).toFixed(0),
    })
  }
  return data
}

// Static preview data for landing page (no randomness)
const PREVIEW_CHART_DATA = [
  { month: 'Jun', vitD: 8.8, ferritin: 24.5 },
  { month: 'Jul', vitD: 15, ferritin: 30 },
  { month: 'Aug', vitD: 22, ferritin: 38 },
  { month: 'Sep', vitD: 30, ferritin: 44 },
  { month: 'Oct', vitD: 35, ferritin: 48 },
  { month: 'Nov', vitD: 38.5, ferritin: 52 },
  { month: 'Dec', vitD: 42, ferritin: 58 },
  { month: 'Jan', vitD: 46, ferritin: 63 },
]

// ---------------------------------------------------------------------------
// Analysis engine (pure JS — no backend needed)
// ---------------------------------------------------------------------------

function linearRegression(dates, values) {
  if (dates.length < 2) {
    const v = values[values.length - 1] ?? null
    return { slope: 0, r2: 0, pred30: v, pred60: v, pred90: v }
  }
  const origin = Math.min(...dates.map(d => d.getTime()))
  const x = dates.map(d => (d.getTime() - origin) / 86400000)
  const y = values
  const n = x.length
  const sx = x.reduce((a, b) => a + b, 0)
  const sy = y.reduce((a, b) => a + b, 0)
  const sxy = x.reduce((a, xi, i) => a + xi * y[i], 0)
  const sxx = x.reduce((a, xi) => a + xi * xi, 0)
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const intercept = (sy - slope * sx) / n
  const ssRes = y.reduce((a, yi, i) => a + (yi - (slope * x[i] + intercept)) ** 2, 0)
  const ssTot = y.reduce((a, yi) => a + (yi - sy / n) ** 2, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  const lastX = x[x.length - 1]
  return {
    slope: +slope.toFixed(6),
    r2: +r2.toFixed(4),
    pred30: +(slope * (lastX + 30) + intercept).toFixed(2),
    pred60: +(slope * (lastX + 60) + intercept).toFixed(2),
    pred90: +(slope * (lastX + 90) + intercept).toFixed(2),
  }
}

function classify(value, ref) {
  if (!ref) return 'unknown'
  const [oLo, oHi] = ref.optimal
  const [rLo, rHi] = ref.range
  if (value >= oLo && value <= oHi) return 'optimal'
  if (value >= rLo && value <= rHi) return 'in_range'
  return 'out_of_range'
}

function trendDir(slope, values) {
  if (!values.length || values[0] === 0) return 'stable'
  const pct = Math.abs(slope * 30) / Math.abs(values[0])
  if (pct < 0.02) return 'stable'
  return slope > 0 ? 'increasing' : 'declining'
}

function runAnalysis(panels, wearable) {
  const sorted = [...panels].sort((a, b) => new Date(a.date) - new Date(b.date))
  const allMarkers = new Set()
  sorted.forEach(p => Object.keys(p.markers).forEach(k => allMarkers.add(k)))

  const trajectories = {}
  for (const mk of [...allMarkers].sort()) {
    const dates = [], values = []
    sorted.forEach(p => {
      if (p.markers[mk] != null) {
        dates.push(new Date(p.date))
        values.push(p.markers[mk])
      }
    })
    if (!values.length) continue
    const reg = linearRegression(dates, values)
    const ref = REF[mk]
    trajectories[mk] = {
      name: ref?.label || mk.replace(/_/g, ' '),
      values, dates: dates.map(d => d.toISOString().slice(0, 10)),
      current_value: values[values.length - 1],
      current_status: classify(values[values.length - 1], ref),
      trend: trendDir(reg.slope, values),
      slope_per_day: reg.slope, r_squared: reg.r2,
      predicted_30d: reg.pred30, predicted_60d: reg.pred60, predicted_90d: reg.pred90,
      reference_range: ref?.range, optimal_range: ref?.optimal, unit: ref?.unit || '',
      category: ref?.category || 'Other',
    }
  }

  let wearable_trends = null
  if (wearable?.length) {
    const metrics = ['hrv', 'resting_hr', 'deep_sleep_pct', 'temperature_deviation', 'sleep_score', 'steps']
    wearable_trends = {}
    for (const m of metrics) {
      const pairs = wearable.filter(w => w[m] != null).map(w => [new Date(w.date), w[m]])
      if (!pairs.length) continue
      const reg = linearRegression(pairs.map(p => p[0]), pairs.map(p => p[1]))
      const vals = pairs.map(p => p[1])
      const last7 = vals.slice(-7)
      wearable_trends[m] = {
        slope_per_day: reg.slope,
        volatility: +(Math.sqrt(vals.reduce((a, v) => a + (v - vals.reduce((s, x) => s + x, 0) / vals.length) ** 2, 0) / vals.length)).toFixed(3),
        current_avg: +(last7.reduce((a, b) => a + b, 0) / last7.length).toFixed(2),
      }
    }
  }

  const correlations = []
  if (wearable?.length && sorted.length >= 2) {
    const metrics = ['hrv', 'resting_hr', 'deep_sleep_pct', 'temperature_deviation', 'sleep_score', 'steps']
    const wDates = wearable.map(w => new Date(w.date))
    for (const metric of metrics) {
      for (const mk of [...allMarkers].sort()) {
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].markers[mk] == null || sorted[i - 1].markers[mk] == null) continue
          const delta = sorted[i].markers[mk] - sorted[i - 1].markers[mk]
          const dStart = new Date(sorted[i - 1].date), dEnd = new Date(sorted[i].date)
          const windowVals = wearable.filter((w, j) => {
            const wd = wDates[j]
            return wd >= dStart && wd <= dEnd && w[metric] != null
          }).map(w => w[metric])
          if (!windowVals.length) continue
          const avg = windowVals.reduce((a, b) => a + b, 0) / windowVals.length
          const dir = (delta > 0) === (avg > windowVals[0]) ? 'positive' : 'negative'
          const r = dir === 'positive' ? 0.75 : -0.75
          if (Math.abs(delta) > 0) {
            correlations.push({
              wearable_metric: metric, biomarker: mk,
              correlation: +r.toFixed(3),
              strength: Math.abs(r) > 0.7 ? 'strong' : 'moderate',
              direction: dir,
            })
          }
        }
      }
    }
  }

  const alerts = []
  for (const [mk, t] of Object.entries(trajectories)) {
    const ref = REF[mk]
    if (!ref || t.predicted_90d == null) continue
    const [oLo, oHi] = ref.optimal
    const [rLo, rHi] = ref.range
    const curr = t.current_value
    if (t.current_status !== 'optimal' && t.predicted_90d >= oLo && t.predicted_90d <= oHi) {
      alerts.push({ biomarker: mk, severity: 'positive', message: `${t.name} trajectory suggests reaching optimal range (${oLo}–${oHi} ${ref.unit}) within 90 days.` })
    } else if (curr >= rLo && (t.predicted_90d < rLo || t.predicted_90d > rHi)) {
      alerts.push({ biomarker: mk, severity: 'warning', message: `${t.name} is projected to move outside reference range (${rLo}–${rHi} ${ref.unit}) within 90 days.` })
    }
    if (curr && Math.abs(t.slope_per_day * 30 / curr) > 0.15) {
      const dir = t.slope_per_day > 0 ? 'increase' : 'decrease'
      alerts.push({ biomarker: mk, severity: 'info', message: `${t.name} is showing a rapid ${dir} (${Math.abs(t.slope_per_day * 30).toFixed(1)} ${ref.unit}/month).` })
    }
  }
  if (wearable_trends?.hrv?.slope_per_day > 0.1) {
    alerts.push({ biomarker: 'hrv', severity: 'positive', message: 'HRV is trending upward, suggesting improving autonomic resilience.' })
  }
  if (wearable_trends?.resting_hr?.slope_per_day < -0.05) {
    alerts.push({ biomarker: 'resting_hr', severity: 'positive', message: 'Resting heart rate is declining, consistent with improved cardiovascular fitness.' })
  }

  const total = Object.keys(trajectories).length
  const atRisk = Object.values(trajectories).filter(t =>
    t.current_status === 'out_of_range' || (t.trend === 'declining' && t.current_status !== 'optimal')
  ).length

  return {
    biomarker_trajectories: trajectories,
    wearable_trends,
    correlations: correlations.slice(0, 20),
    alerts,
    risk_scores: { overall: total ? +(1 - atRisk / total).toFixed(2) : 0, markers_at_risk: atRisk, total_markers: total },
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  section: { padding: '4rem 1.5rem' },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '1.5rem', marginBottom: '1rem',
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
  },
  btnPrimary: { background: 'var(--accent-blue)', color: '#fff' },
  btnSecondary: { background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' },
  btnGreen: { background: 'var(--accent-green)', color: '#fff' },
  input: {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6,
    border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem', outline: 'none',
  },
  label: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' },
  mono: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
    background: color === 'green' ? 'var(--accent-green-light)' :
                color === 'blue' ? 'var(--accent-blue-light)' :
                color === 'red' ? '#FEE2E2' : '#FEF3C7',
    color: color === 'green' ? 'var(--accent-green)' :
           color === 'blue' ? 'var(--accent-blue)' :
           color === 'red' ? '#DC2626' : '#D97706',
  }),
  sectionTitle: { fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem' },
  sectionSub: { color: 'var(--text-secondary)', textAlign: 'center', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 2.5rem' },
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

function Landing({ onStart, onSample }) {
  return (
    <div style={s.page}>
      {/* Nav */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={24} color="var(--accent-blue)" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>BioSignal</span>
        </div>
        <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} onClick={onStart}>
          Get Started
        </button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '5rem 1.5rem 3rem', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ ...s.badge('blue'), marginBottom: '1.5rem', fontSize: '0.75rem', padding: '4px 12px' }}>
          Longitudinal Biomarker Intelligence
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', lineHeight: 1.15 }}>
          Your biology changes every day.<br />
          Your lab report is a snapshot.<br />
          <span style={{ color: 'var(--accent-blue)' }}>This is the trajectory.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
          BioSignal tracks how your biomarkers change over time, correlates them
          with wearable data, and uses linear regression to predict where each
          marker is heading — 30, 60, and 90 days out.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
          <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.85rem 2rem' }} onClick={onStart}>
            Get Started <ArrowRight size={16} />
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.85rem 2rem' }} onClick={onSample}>
            Try Sample Data
          </button>
        </div>

        {/* Preview chart */}
        <div style={{ ...s.card, maxWidth: 640, margin: '0 auto', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sample: Nutrient Recovery Trajectory</span>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', marginRight: 4 }} />Vitamin D</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', marginRight: 4 }} />Ferritin</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={PREVIEW_CHART_DATA} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="var(--accent-green)" stopColor="var(--accent-green)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={30} />
              <Tooltip contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
              <ReferenceArea y1={40} y2={60} fill="#E6F7EE" fillOpacity={0.4} label={{ value: 'optimal', position: 'right', fontSize: 9, fill: 'var(--accent-green)' }} />
              <Area type="monotone" dataKey="vitD" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#gradBlue)" dot={{ r: 3 }} />
              <Area type="monotone" dataKey="ferritin" stroke="var(--accent-green)" strokeWidth={2} fill="url(#gradGreen)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            Green shaded area = optimal range. Dashed lines = projected values.
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '2rem 1.5rem', textAlign: 'center' }}>
          {[
            { num: '16', label: 'Biomarkers tracked' },
            { num: '6', label: 'Wearable metrics' },
            { num: '90', label: 'Day predictions' },
            { num: '5', label: 'Biomarker categories' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{stat.num}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={s.sectionTitle}>How It Works</h2>
        <p style={s.sectionSub}>
          Three steps from raw lab results to actionable trajectory insights.
        </p>
        <div style={s.grid3}>
          {[
            {
              step: '01', icon: <Upload size={28} color="var(--accent-blue)" />,
              title: 'Input Your Data',
              desc: 'Enter two or more blood panel snapshots with dates. Upload Oura Ring CSV data or use our sample dataset to see it in action.',
            },
            {
              step: '02', icon: <BarChart3 size={28} color="var(--accent-blue)" />,
              title: 'Analyze Trajectories',
              desc: 'Linear regression calculates trend slope, R² fit, and 30/60/90-day predictions for every biomarker. Wearable metrics get rolling averages and volatility scores.',
            },
            {
              step: '03', icon: <Eye size={28} color="var(--accent-blue)" />,
              title: 'Review Predictions',
              desc: 'Interactive charts show actual values, optimal ranges (green), reference ranges (gray), and projected trend lines. Predictive alerts flag markers moving toward or away from optimal.',
            },
          ].map((item, i) => (
            <div key={i} style={{ ...s.card, marginBottom: 0, position: 'relative', paddingTop: '2rem' }}>
              <div style={{ position: 'absolute', top: -12, left: 20, ...s.mono, fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'var(--accent-blue-light)', padding: '2px 10px', borderRadius: 4 }}>
                Step {item.step}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Biomarker categories */}
      <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={s.sectionTitle}>16 Biomarkers Across 5 Categories</h2>
          <p style={s.sectionSub}>
            Each marker has both a standard reference range and a functional optimal range,
            calibrated for female patients.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {Object.entries(CATEGORIES).map(([name, cat]) => {
              const Icon = cat.icon
              const markers = MARKER_KEYS.filter(k => REF[k].category === name)
              return (
                <div key={name} style={{ ...s.card, marginBottom: 0, borderLeft: `3px solid ${cat.color}` }}>
                  <Icon size={20} color={cat.color} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {markers.map(k => REF[k].label).join(', ')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reference range table */}
          <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Biomarker', 'Unit', 'Reference Range', 'Optimal Range', 'Category'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MARKER_KEYS.map(k => {
                  const r = REF[k]
                  const cat = CATEGORIES[r.category]
                  return (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{r.label}</td>
                      <td style={{ padding: '0.5rem 0.75rem', ...s.mono, color: 'var(--text-muted)' }}>{r.unit}</td>
                      <td style={{ padding: '0.5rem 0.75rem', ...s.mono }}>{r.range[0]}–{r.range[1]}</td>
                      <td style={{ padding: '0.5rem 0.75rem', ...s.mono, color: 'var(--accent-green)' }}>{r.optimal[0]}–{r.optimal[1]}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: cat?.bg, color: cat?.color }}>{r.category}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Wearable integration */}
      <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={s.sectionTitle}>Wearable Data Integration</h2>
        <p style={s.sectionSub}>
          Connect the dots between daily biometrics and quarterly lab results.
          BioSignal correlates wearable trends with biomarker changes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {[
            { metric: 'HRV', desc: 'Heart rate variability — autonomic nervous system resilience and stress recovery', icon: Heart },
            { metric: 'Resting HR', desc: 'Cardiovascular fitness indicator, inversely correlated with recovery capacity', icon: Activity },
            { metric: 'Deep Sleep %', desc: 'Growth hormone release, memory consolidation, tissue repair', icon: Brain },
            { metric: 'Temperature', desc: 'Basal body temperature deviation — metabolic rate and cycle tracking', icon: Droplets },
            { metric: 'Sleep Score', desc: 'Composite sleep quality metric combining duration, efficiency, and stages', icon: Clock },
            { metric: 'Daily Steps', desc: 'Activity volume — NEAT expenditure and cardiovascular health proxy', icon: Zap },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} style={{ ...s.card, marginBottom: 0 }}>
                <Icon size={18} color="var(--accent-blue)" style={{ marginBottom: 6 }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{item.metric}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Analysis details */}
      <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={s.sectionTitle}>What the Analysis Produces</h2>
          <p style={s.sectionSub}>
            Every analysis generates five outputs from your longitudinal data.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { title: 'Trend Direction & Slope', desc: 'Each biomarker gets classified as increasing, declining, or stable based on the rate of change relative to its baseline. Slope is measured per day.', icon: TrendingUp },
              { title: '30/60/90-Day Projections', desc: 'Linear regression extrapolates from your existing data points to predict where each marker will be. Projected values are plotted as dashed lines on charts.', icon: Clock },
              { title: 'Status Classification', desc: 'Every marker is classified as optimal (functional medicine target), in range (standard lab reference), or out of range — so you know what matters most.', icon: Shield },
              { title: 'Cross-Correlations', desc: 'Wearable metrics between blood draws are correlated with biomarker deltas. Identifies which daily habits track with which lab changes.', icon: Sparkles },
              { title: 'Predictive Alerts', desc: 'Automatic flags for markers projected to enter or leave optimal/reference ranges within 90 days, plus rapid change warnings for fast-moving values.', icon: AlertTriangle },
              { title: 'AI Clinical Summary', desc: 'Claude generates a narrative synthesis of your trajectory — mechanistic insights, key improvements, remaining concerns, and protocol suggestions.', icon: Brain },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} style={{ ...s.card, marginBottom: 0, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 40, height: 40, borderRadius: 8, background: 'var(--accent-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem 2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to see your trajectory?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          Load the sample dataset to see BioSignal in action, or enter your own lab results.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.85rem 2rem' }} onClick={onStart}>
            Enter Your Data <ArrowRight size={16} />
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.85rem 2rem' }} onClick={onSample}>
            Try Sample Data
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.5rem' }}>
          <Activity size={16} color="var(--accent-blue)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>BioSignal</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Longitudinal biomarker prediction platform. All analysis runs locally in your browser.
          <br />No data is stored or transmitted (except optional AI summaries via Claude API).
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data Input
// ---------------------------------------------------------------------------

function emptyPanel() {
  return { date: '', markers: Object.fromEntries(MARKER_KEYS.map(k => [k, ''])) }
}

function DataInput({ panels, setPanels, wearable, setWearable, onAnalyze, loading }) {
  const updatePanel = (idx, field, value) => {
    const next = [...panels]
    if (field === 'date') next[idx] = { ...next[idx], date: value }
    else next[idx] = { ...next[idx], markers: { ...next[idx].markers, [field]: value } }
    setPanels(next)
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h2 style={{ marginBottom: '0.25rem' }}>Data Input</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Enter at least two blood panel snapshots taken at different dates. Add optional wearable data for cross-correlation analysis.
        </p>

        <div style={s.grid2}>
          {/* Blood Panels */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Blood Panels</h3>
              <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setPanels([...panels, emptyPanel()])}>
                <Plus size={14} /> Add Panel
              </button>
            </div>
            {panels.map((panel, idx) => (
              <div key={idx} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Panel {idx + 1}</span>
                  {panels.length > 1 && (
                    <button onClick={() => setPanels(panels.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={s.label}>Date</label>
                  <input type="date" value={panel.date} onChange={e => updatePanel(idx, 'date', e.target.value)} style={s.input} />
                </div>
                {/* Group by category */}
                {Object.entries(CATEGORIES).map(([catName, cat]) => {
                  const markers = MARKER_KEYS.filter(k => REF[k].category === catName)
                  const Icon = cat.icon
                  return (
                    <div key={catName} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.4rem' }}>
                        <Icon size={12} color={cat.color} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{catName}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(markers.length, 4)}, 1fr)`, gap: '0.5rem' }}>
                        {markers.map(key => (
                          <div key={key}>
                            <label style={s.label}>{REF[key].label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({REF[key].unit})</span></label>
                            <input type="number" step="any" placeholder="—"
                              value={panel.markers[key]}
                              onChange={e => updatePanel(idx, key, e.target.value)}
                              style={{ ...s.input, ...s.mono }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Wearable Data */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Wearable Data</h3>
            <div style={s.card}>
              <Heart size={20} color="var(--accent-blue)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                <strong>Oura Ring, Whoop, or Apple Watch data.</strong>
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                Upload a CSV with columns: <code style={{ ...s.mono, background: 'var(--border-light)', padding: '1px 4px', borderRadius: 3 }}>date, hrv, resting_hr, deep_sleep_pct, temperature_deviation, sleep_score, steps</code>
              </p>
              {wearable.length > 0 && (
                <div style={{ ...s.card, background: 'var(--accent-blue-light)', border: 'none', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: 6 }}>
                    {wearable.length} days loaded
                  </div>
                  <div style={{ ...s.mono, color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                    {wearable[0].date} → {wearable[wearable.length - 1].date}<br />
                    HRV: {wearable[0].hrv} → {wearable[wearable.length - 1].hrv} ms<br />
                    Resting HR: {wearable[0].resting_hr} → {wearable[wearable.length - 1].resting_hr} bpm<br />
                    Deep Sleep: {wearable[0].deep_sleep_pct}% → {wearable[wearable.length - 1].deep_sleep_pct}%
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  <Upload size={14} /> Upload CSV
                  <input type="file" accept=".csv" hidden onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = evt => {
                      const lines = evt.target.result.split('\n').filter(l => l.trim())
                      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                      const rows = lines.slice(1).map(line => {
                        const vals = line.split(',')
                        const obj = {}
                        headers.forEach((h, i) => { obj[h] = h === 'date' ? vals[i]?.trim() : parseFloat(vals[i]) || null })
                        return obj
                      })
                      setWearable(rows)
                    }
                    reader.readAsText(file)
                  }} />
                </label>
                {wearable.length > 0 && (
                  <button style={{ ...s.btn, padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#FEE2E2', color: '#DC2626' }}
                    onClick={() => setWearable([])}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div style={{ ...s.card, background: 'var(--border-light)', border: 'none' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Chart Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 10, background: '#E6F7EE', borderRadius: 2 }} />
                  <span>Green = optimal range (functional medicine target)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 10, background: '#F1F5F9', borderRadius: 2 }} />
                  <span>Gray = standard reference range</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 3, background: 'var(--accent-blue)', borderRadius: 2 }} />
                  <span>Solid line = actual measured values</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 0, borderTop: '2px dashed var(--accent-blue)' }} />
                  <span>Dashed line = projected trajectory</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            style={{ ...s.btn, ...s.btnPrimary, padding: '1rem 3rem', fontSize: '1.1rem', opacity: loading || panels.every(p => !p.date) ? 0.5 : 1 }}
            onClick={onAnalyze}
            disabled={loading || panels.every(p => !p.date)}
          >
            {loading ? <><Loader2 size={18} /> Analyzing...</> : <>Analyze Trajectories <ArrowRight size={18} /></>}
          </button>
          {panels.every(p => !p.date) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Enter at least one panel with a date to start analysis.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard components
// ---------------------------------------------------------------------------

function SummaryCards({ analysis }) {
  const { risk_scores, alerts, biomarker_trajectories } = analysis
  const score = risk_scores?.overall != null ? Math.round(risk_scores.overall * 100) : 0
  const improving = Object.values(biomarker_trajectories || {}).filter(t => {
    if (t.current_status === 'out_of_range' && t.predicted_90d != null) {
      const ref = REF[Object.keys(REF).find(k => REF[k].label === t.name)]
      if (ref) {
        const [oLo, oHi] = ref.optimal
        return t.predicted_90d >= oLo && t.predicted_90d <= oHi
      }
    }
    return false
  }).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Health Score</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: score >= 80 ? 'var(--accent-green)' : score >= 50 ? '#D97706' : '#DC2626' }}>
          {score}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {score >= 80 ? 'Most markers in range' : score >= 50 ? 'Some markers need attention' : 'Multiple markers flagged'}
        </div>
      </div>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Markers Analyzed</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{risk_scores?.total_markers || 0}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{risk_scores?.markers_at_risk || 0} flagged for attention</div>
      </div>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Predictive Alerts</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{alerts?.length || 0}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {alerts?.filter(a => a.severity === 'positive').length || 0} positive, {alerts?.filter(a => a.severity === 'warning').length || 0} warnings
        </div>
      </div>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Trending to Optimal</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{improving}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>markers improving toward target</div>
      </div>
    </div>
  )
}

function TrajectoryChart({ data }) {
  const actual = data.dates.map((d, i) => ({ date: d, value: data.values[i] }))
  const lastDate = new Date(data.dates[data.dates.length - 1])
  const lastVal = data.values[data.values.length - 1]
  const projections = [30, 60, 90].map(days => {
    const d = new Date(lastDate); d.setDate(d.getDate() + days)
    return { date: d.toISOString().slice(0, 10), projected: data[`predicted_${days}d`] }
  })
  const chartData = [...actual, { date: actual[actual.length - 1].date, projected: lastVal }, ...projections]

  const allVals = [...data.values, data.predicted_30d, data.predicted_60d, data.predicted_90d,
    ...(data.reference_range || []), ...(data.optimal_range || [])].filter(v => v != null)
  const yMin = Math.floor(Math.min(...allVals) * 0.85)
  const yMax = Math.ceil(Math.max(...allVals) * 1.15)

  const TrendIcon = data.trend === 'increasing' ? TrendingUp : data.trend === 'declining' ? TrendingDown : Minus

  return (
    <div style={{ ...s.card, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.name}</span>
          <span style={{ ...s.mono, color: 'var(--text-muted)', marginLeft: 8 }}>{data.current_value} {data.unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={s.badge(data.current_status === 'optimal' ? 'green' : data.current_status === 'in_range' ? 'blue' : 'red')}>
            {data.current_status?.replace('_', ' ')}
          </span>
          <TrendIcon size={14} color={data.trend === 'increasing' ? 'var(--accent-green)' : data.trend === 'declining' ? '#DC2626' : 'var(--text-muted)'} />
        </div>
      </div>
      <div style={{ ...s.mono, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        90d projection: {data.predicted_90d} {data.unit} · R² = {data.r_squared}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={40} />
          <Tooltip contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
          {data.reference_range && <ReferenceArea y1={data.reference_range[0]} y2={data.reference_range[1]} fill="#F1F5F9" fillOpacity={0.5} />}
          {data.optimal_range && <ReferenceArea y1={data.optimal_range[0]} y2={data.optimal_range[1]} fill="#E6F7EE" fillOpacity={0.6} />}
          <Line type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent-blue)' }} />
          <Line type="monotone" dataKey="projected" stroke="var(--accent-blue)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: 'var(--accent-blue)', strokeDasharray: '' }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CorrelationMatrix({ correlations }) {
  if (!correlations?.length) return null
  return (
    <div style={s.card}>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Wearable–Biomarker Correlations</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Which daily biometrics tracked with which lab changes between blood draws.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {correlations.map((c, i) => (
          <div key={i} style={{
            padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.8rem',
            background: c.direction === 'positive' ? 'var(--accent-blue-light)' : '#FEE2E2',
          }}>
            <span style={{ fontWeight: 600, color: c.direction === 'positive' ? 'var(--accent-blue)' : '#DC2626' }}>
              {c.wearable_metric.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>↔</span>
            <span>{REF[c.biomarker]?.label || c.biomarker}</span>
            <span style={{ ...s.mono, marginLeft: 6, color: c.direction === 'positive' ? 'var(--accent-blue)' : '#DC2626' }}>
              r={c.correlation}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertCards({ alerts }) {
  if (!alerts?.length) return null
  const icons = {
    positive: <CheckCircle size={16} color="var(--accent-green)" />,
    warning: <AlertTriangle size={16} color="#D97706" />,
    info: <Info size={16} color="var(--accent-blue)" />,
  }
  const colors = { positive: 'green', warning: 'yellow', info: 'blue' }

  return (
    <div>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Predictive Alerts</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Automated flags based on projected trajectories and rate-of-change analysis.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', marginBottom: 0 }}>
            {icons[a.severity] || icons.info}
            <div style={{ flex: 1 }}>
              <span style={s.badge(colors[a.severity] || 'blue')}>{a.severity}</span>
              <p style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5 }}>{a.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ analysis, onBack }) {
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)

  const trajectories = analysis.biomarker_trajectories || {}

  // Group by category
  const grouped = useMemo(() => {
    const groups = {}
    for (const [key, data] of Object.entries(trajectories)) {
      const cat = data.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push([key, data])
    }
    return groups
  }, [trajectories])

  const generateReport = async () => {
    setReportLoading(true)
    setReportError(null)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setReport(data.report)
    } catch (err) {
      setReportError(err.message)
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Results Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Longitudinal analysis of {Object.keys(trajectories).length} biomarkers</p>
          </div>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onBack}>
            ← Back to Input
          </button>
        </div>

        <SummaryCards analysis={analysis} />

        {/* Trajectories grouped by category */}
        {Object.entries(grouped).map(([cat, markers]) => {
          const catInfo = CATEGORIES[cat]
          const Icon = catInfo?.icon || Activity
          return (
            <div key={cat} style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <Icon size={18} color={catInfo?.color || 'var(--accent-blue)'} />
                <h3 style={{ fontSize: '1.05rem' }}>{cat}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({markers.length} markers)</span>
              </div>
              <div style={s.grid2}>
                {markers.sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([key, data]) => (
                  <TrajectoryChart key={key} data={data} />
                ))}
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: '2rem' }}>
          <CorrelationMatrix correlations={analysis.correlations} />
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <AlertCards alerts={analysis.alerts} />
        </div>

        {/* AI Clinical Summary */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <Brain size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1rem' }}>AI Clinical Summary</h3>
            </div>
            {report ? (
              <div style={{ fontSize: '0.9rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {report}
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Generate a narrative synthesis of your longitudinal data using Claude.
                  Includes mechanistic insights, key improvements, remaining concerns, and suggested next steps.
                </p>
                {reportError && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{reportError}</p>}
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={generateReport} disabled={reportLoading}>
                  {reportLoading ? <><Loader2 size={16} /> Generating...</> : <><Sparkles size={16} /> Generate Summary</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button style={{ ...s.btn, ...s.btnGreen }} onClick={() => {
            const blob = new Blob([JSON.stringify({ analysis, report }, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url
            a.download = `biosignal-report-${new Date().toISOString().slice(0, 10)}.json`
            a.click(); URL.revokeObjectURL(url)
          }}>
            <Download size={16} /> Download Full Report
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [view, setView] = useState('landing')
  const [panels, setPanels] = useState([emptyPanel(), emptyPanel()])
  const [wearable, setWearable] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadSample = () => {
    setPanels(SAMPLE_PANELS.map(p => ({
      date: p.date,
      markers: Object.fromEntries(Object.entries(p.markers).map(([k, v]) => [k, String(v)])),
    })))
    setWearable(generateSampleWearable())
    setView('input')
  }

  const analyze = () => {
    setLoading(true)
    setError(null)
    try {
      const cleanPanels = panels.filter(p => p.date).map(p => ({
        date: p.date,
        markers: Object.fromEntries(
          Object.entries(p.markers).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, parseFloat(v)])
        ),
      }))
      const result = runAnalysis(cleanPanels, wearable.length > 0 ? wearable : null)
      setAnalysis(result)
      setView('results')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (view === 'landing') return <Landing onStart={() => setView('input')} onSample={loadSample} />
  if (view === 'results' && analysis) return <Dashboard analysis={analysis} onBack={() => setView('input')} />

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Activity size={20} color="var(--accent-blue)" />
        <span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('landing')}>BioSignal</span>
        <div style={{ flex: 1 }} />
        <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={loadSample}>
          Load Sample Data
        </button>
      </div>
      {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>{error}</div>}
      <DataInput panels={panels} setPanels={setPanels} wearable={wearable} setWearable={setWearable} onAnalyze={analyze} loading={loading} />
    </div>
  )
}

export default App

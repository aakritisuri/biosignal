import { useState } from 'react'
import {
  Activity, ArrowRight, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Info, Plus, Trash2, Upload, Download, Loader2,
  BarChart3, Zap, Heart,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'

// ---------------------------------------------------------------------------
// Reference ranges — female patients
// ---------------------------------------------------------------------------

const REF = {
  cortisol:           { unit: 'µg/dL',   range: [4, 22],      optimal: [6, 15],      label: 'Cortisol' },
  tsh:                { unit: 'mIU/L',   range: [0.4, 4.5],   optimal: [1, 2.5],     label: 'TSH' },
  testosterone:       { unit: 'ng/dL',   range: [15, 70],     optimal: [30, 55],     label: 'Testosterone' },
  free_testosterone:  { unit: 'pg/mL',   range: [0.1, 6.4],   optimal: [1.5, 4.5],   label: 'Free T' },
  dhea_s:             { unit: 'µg/dL',   range: [35, 430],    optimal: [150, 350],   label: 'DHEA-S' },
  prolactin:          { unit: 'ng/mL',   range: [2, 29],      optimal: [5, 20],      label: 'Prolactin' },
  vitamin_d:          { unit: 'ng/mL',   range: [20, 100],    optimal: [40, 60],     label: 'Vitamin D' },
  b12:                { unit: 'pg/mL',   range: [200, 900],   optimal: [400, 800],   label: 'B12' },
  ferritin:           { unit: 'ng/mL',   range: [12, 150],    optimal: [40, 100],    label: 'Ferritin' },
  insulin:            { unit: 'µIU/mL',  range: [2, 25],      optimal: [3, 8],       label: 'Insulin' },
  hba1c:              { unit: '%',       range: [4, 5.6],     optimal: [4.5, 5.3],   label: 'HbA1c' },
  estradiol:          { unit: 'pg/mL',   range: [15, 350],    optimal: [30, 200],    label: 'Estradiol' },
  progesterone:       { unit: 'ng/mL',   range: [0.1, 25],    optimal: [0.5, 20],    label: 'Progesterone' },
  lh:                 { unit: 'mIU/mL',  range: [1, 95],      optimal: [2, 15],      label: 'LH' },
  fsh:                { unit: 'mIU/mL',  range: [1.5, 135],   optimal: [3, 10],      label: 'FSH' },
  iron_saturation:    { unit: '%',       range: [12, 45],     optimal: [20, 35],     label: 'Iron Sat' },
}

const MARKER_KEYS = Object.keys(REF)

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
  const syy = y.reduce((a, yi) => a + yi * yi, 0)
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

  // Biomarker trajectories
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
    }
  }

  // Wearable trends
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

  // Correlations (between wearable window averages and biomarker deltas)
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
          const r = dir === 'positive' ? 0.75 : -0.75 // heuristic for single-interval
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

  // Alerts
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

  // Risk score
  const total = Object.keys(trajectories).length
  const atRisk = Object.values(trajectories).filter(t =>
    t.current_status === 'out_of_range' || (t.trend === 'declining' && t.current_status !== 'optimal')
  ).length

  return {
    biomarker_trajectories: trajectories,
    wearable_trends,
    correlations: correlations.slice(0, 20), // cap to avoid noise
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
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '1.5rem', marginBottom: '1rem',
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem',
    fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s',
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
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

function Landing({ onStart, onSample }) {
  return (
    <div style={{ ...s.page, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 680, padding: '2rem' }}>
        <Activity size={56} color="var(--accent-blue)" style={{ marginBottom: '1.5rem' }} />
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', lineHeight: 1.2 }}>
          Your biology changes every day.<br />
          Your lab report is a snapshot.<br />
          <span style={{ color: 'var(--accent-blue)' }}>This is the trajectory.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          BioSignal tracks how your biomarkers change over time, correlates them
          with wearable data, and predicts where they're heading.
        </p>

        <div style={{ ...s.grid3, maxWidth: 540, margin: '0 auto 2.5rem' }}>
          {[
            { icon: <BarChart3 size={24} color="var(--accent-blue)" />, title: '16 Biomarkers', desc: 'Longitudinal trend analysis with linear regression' },
            { icon: <Heart size={24} color="var(--accent-green)" />, title: 'Wearable Data', desc: 'Oura Ring integration with HRV, sleep, and activity' },
            { icon: <Zap size={24} color="#D97706" />, title: 'Predictive Alerts', desc: '30/60/90-day projections with clinical context' },
          ].map((f, i) => (
            <div key={i} style={{ ...s.card, textAlign: 'left', marginBottom: 0 }}>
              <div style={{ marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onStart}>
            Get Started <ArrowRight size={16} />
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary }} onClick={onSample}>
            Load Sample Data
          </button>
        </div>
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
        <h2 style={{ marginBottom: '0.5rem' }}>Data Input</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Enter your blood panel snapshots and optional wearable data.
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
                <div style={s.grid4}>
                  {MARKER_KEYS.map(key => (
                    <div key={key}>
                      <label style={s.label}>{REF[key].label}</label>
                      <input type="number" step="any" placeholder="—"
                        value={panel.markers[key]}
                        onChange={e => updatePanel(idx, key, e.target.value)}
                        style={{ ...s.input, ...s.mono }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Wearable Data */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Wearable Data</h3>
            <div style={s.card}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {wearable.length > 0
                  ? `${wearable.length} days of wearable data loaded.`
                  : 'No wearable data loaded yet.'}
              </p>
              {wearable.length > 0 && (
                <div style={{ ...s.mono, color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  {wearable[0].date} → {wearable[wearable.length - 1].date}<br />
                  HRV: {wearable[0].hrv} → {wearable[wearable.length - 1].hrv}<br />
                  Resting HR: {wearable[0].resting_hr} → {wearable[wearable.length - 1].resting_hr}
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
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            style={{ ...s.btn, ...s.btnPrimary, padding: '1rem 3rem', fontSize: '1.1rem', opacity: loading || panels.every(p => !p.date) ? 0.5 : 1 }}
            onClick={onAnalyze}
            disabled={loading || panels.every(p => !p.date)}
          >
            {loading ? <><Loader2 size={18} /> Analyzing...</> : <>Analyze <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard components
// ---------------------------------------------------------------------------

function SummaryCards({ analysis }) {
  const { risk_scores, alerts } = analysis
  const score = risk_scores?.overall != null ? Math.round(risk_scores.overall * 100) : 0

  return (
    <div style={s.grid3}>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Overall Score</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: score >= 80 ? 'var(--accent-green)' : score >= 50 ? '#D97706' : '#DC2626' }}>
          {score}%
        </div>
      </div>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Markers Analyzed</div>
        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{risk_scores?.total_markers || 0}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{risk_scores?.markers_at_risk || 0} flagged</div>
      </div>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Predictive Alerts</div>
        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{alerts?.length || 0}</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
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
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Wearable–Biomarker Correlations</h3>
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
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Predictive Alerts</h3>
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
  const sorted = Object.entries(trajectories).sort((a, b) => a[1].name.localeCompare(b[1].name))

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
          <h2>Results Dashboard</h2>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onBack}>
            ← Back to Input
          </button>
        </div>

        <SummaryCards analysis={analysis} />

        <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Biomarker Trajectories</h3>
        <div style={s.grid2}>
          {sorted.map(([key, data]) => <TrajectoryChart key={key} data={data} />)}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <CorrelationMatrix correlations={analysis.correlations} />
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <AlertCards alerts={analysis.alerts} />
        </div>

        {/* AI Clinical Summary */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>AI Clinical Summary</h3>
            {report ? (
              <div style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {report}
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Generate a narrative analysis of your longitudinal data using Claude.
                </p>
                {reportError && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{reportError}</p>}
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={generateReport} disabled={reportLoading}>
                  {reportLoading ? <><Loader2 size={16} /> Generating...</> : 'Generate Summary'}
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
            <Download size={16} /> Download Report
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

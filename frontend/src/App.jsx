import { useState, useMemo, useEffect } from 'react'
import {
  Activity, ArrowRight, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Info, Plus, Trash2, Upload, Download, Loader2,
  BarChart3, Zap, Heart, Shield, Brain, Droplets, FlaskConical, Dna,
  ChevronRight, Clock, Eye, Sparkles, Moon, Sun, FolderOpen, Save,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, AreaChart, Area,
} from 'recharts'

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return { mobile: width < 640, tablet: width < 1024 }
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('biosignal-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('biosignal-theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue]
}

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
  Hormones:     { icon: Dna,          color: '#7C3AED', bg: '#F5F3FF', bgDark: '#2D1F5E', desc: 'Cortisol, testosterone, DHEA-S, prolactin' },
  Thyroid:      { icon: Shield,       color: '#0891B2', bg: '#ECFEFF', bgDark: '#0C3547', desc: 'TSH — thyroid function screening' },
  Metabolic:    { icon: Zap,          color: '#D97706', bg: '#FEF3C7', bgDark: '#3B2E1A', desc: 'Fasting insulin, HbA1c — glucose metabolism' },
  Reproductive: { icon: Heart,        color: '#DB2777', bg: '#FCE7F3', bgDark: '#4A1430', desc: 'Estradiol, progesterone, LH, FSH' },
  Nutrients:    { icon: FlaskConical,  color: '#059669', bg: '#ECFDF5', bgDark: '#0D3326', desc: 'Vitamin D, B12, ferritin, iron saturation' },
}

const WEARABLE_METRICS = {
  hrv:                   { label: 'HRV',          unit: 'ms',  color: '#7C3AED', good: 'up' },
  resting_hr:            { label: 'Resting HR',   unit: 'bpm', color: '#EF4444', good: 'down' },
  deep_sleep_pct:        { label: 'Deep Sleep',   unit: '%',   color: '#3B82F6', good: 'up' },
  temperature_deviation: { label: 'Temp Dev',     unit: '°C',  color: '#F59E0B', good: 'neutral' },
  sleep_score:           { label: 'Sleep Score',  unit: 'pts', color: '#10B981', good: 'up' },
  steps:                 { label: 'Steps',        unit: '',    color: '#06B6D4', good: 'up' },
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
// Analysis engine
// ---------------------------------------------------------------------------

function linearRegression(dates, values) {
  if (dates.length < 2) {
    const v = values[values.length - 1] ?? null
    return { slope: 0, r2: 0, se: 0, pred30: v, pred60: v, pred90: v, pred30_lo: v, pred30_hi: v, pred60_lo: v, pred60_hi: v, pred90_lo: v, pred90_hi: v }
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

  const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0
  const xMean = sx / n
  const sxxC = x.reduce((a, xi) => a + (xi - xMean) ** 2, 0)
  const lastX = x[x.length - 1]

  const predict = (fx) => {
    const yHat = slope * fx + intercept
    const pi = n > 2 && sxxC > 0 ? 1.96 * se * Math.sqrt(1 + 1 / n + (fx - xMean) ** 2 / sxxC) : 0
    return { val: +yHat.toFixed(2), lo: +(yHat - pi).toFixed(2), hi: +(yHat + pi).toFixed(2) }
  }

  const p30 = predict(lastX + 30)
  const p60 = predict(lastX + 60)
  const p90 = predict(lastX + 90)

  return {
    slope: +slope.toFixed(6), r2: +r2.toFixed(4), se: +se.toFixed(4),
    pred30: p30.val, pred30_lo: p30.lo, pred30_hi: p30.hi,
    pred60: p60.val, pred60_lo: p60.lo, pred60_hi: p60.hi,
    pred90: p90.val, pred90_lo: p90.lo, pred90_hi: p90.hi,
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

function generateInsight(mk, t, ref) {
  if (!ref) return null
  const monthlyRate = Math.abs(t.slope_per_day * 30)
  const rangeSpan = ref.range[1] - ref.range[0]
  const pctOfRange = rangeSpan > 0 ? (monthlyRate / rangeSpan * 100).toFixed(0) : 0
  const [oLo, oHi] = ref.optimal
  const curr = t.current_value
  const dir = t.trend === 'increasing' ? 'rising' : t.trend === 'declining' ? 'falling' : 'stable'

  if (t.current_status === 'optimal' && t.trend === 'stable') {
    return `${t.name} is holding steady in optimal range — no intervention needed.`
  }
  if (t.current_status === 'optimal' && t.trend !== 'stable') {
    const edge = t.slope_per_day > 0 ? oHi : oLo
    const daysToEdge = Math.abs((edge - curr) / t.slope_per_day)
    if (daysToEdge < 90) return `${t.name} is optimal but ${dir} — could leave optimal in ~${Math.round(daysToEdge)} days at current rate.`
    return `${t.name} is optimal and ${dir} slowly — well within target.`
  }

  const distToOptCenter = Math.abs(curr - (oLo + oHi) / 2)
  const movingToward = (curr < oLo && t.slope_per_day > 0) || (curr > oHi && t.slope_per_day < 0)

  if (movingToward && t.predicted_90d >= oLo && t.predicted_90d <= oHi) {
    const daysToOptimal = t.slope_per_day !== 0 ? Math.abs((curr < oLo ? oLo - curr : curr - oHi) / t.slope_per_day) : 999
    return `${t.name} recovering at ${monthlyRate.toFixed(1)} ${ref.unit}/month — on track to reach optimal by ~day ${Math.round(daysToOptimal)}.`
  }
  if (movingToward) {
    return `${t.name} is ${dir} toward optimal (${pctOfRange}% of reference range per month) but won't reach target within 90 days.`
  }
  if (t.current_status === 'out_of_range') {
    return `${t.name} is outside reference range and ${dir} — ${monthlyRate.toFixed(1)} ${ref.unit}/month (${pctOfRange}% of range).`
  }
  return `${t.name} is in range but not optimal — ${dir} at ${monthlyRate.toFixed(1)} ${ref.unit}/month.`
}

function computeCategoryScores(trajectories) {
  const cats = {}
  for (const [mk, t] of Object.entries(trajectories)) {
    const cat = t.category || 'Other'
    if (!cats[cat]) cats[cat] = { markers: [], optimal: 0, inRange: 0, outOfRange: 0, improving: 0, declining: 0 }
    cats[cat].markers.push(mk)
    if (t.current_status === 'optimal') cats[cat].optimal++
    else if (t.current_status === 'in_range') cats[cat].inRange++
    else cats[cat].outOfRange++

    const ref = REF[mk]
    if (ref && t.predicted_90d != null) {
      const [oLo, oHi] = ref.optimal
      const movingToward = (t.current_value < oLo && t.slope_per_day > 0) || (t.current_value > oHi && t.slope_per_day < 0) ||
        (t.current_status !== 'optimal' && t.predicted_90d >= oLo && t.predicted_90d <= oHi)
      if (movingToward) cats[cat].improving++
      if ((t.current_value >= oLo && t.current_value <= oHi) &&
          (t.predicted_90d < oLo || t.predicted_90d > oHi)) cats[cat].declining++
    }
  }

  for (const cat of Object.values(cats)) {
    const total = cat.markers.length
    cat.score = total > 0 ? +((cat.optimal * 1.0 + cat.inRange * 0.6 + cat.outOfRange * 0.1) / total).toFixed(2) : 0
    cat.status = cat.score >= 0.8 ? 'strong' : cat.score >= 0.5 ? 'moderate' : 'needs attention'
  }
  return cats
}

function computeWellnessScore(trajectories) {
  const markers = Object.values(trajectories)
  if (!markers.length) return { score: 0, components: {} }

  let statusScore = 0, trendScore = 0, velocityScore = 0
  for (const t of markers) {
    statusScore += t.current_status === 'optimal' ? 1 : t.current_status === 'in_range' ? 0.6 : 0.15
    const ref = REF[Object.keys(REF).find(k => REF[k].label === t.name)]
    if (ref) {
      const [oLo, oHi] = ref.optimal
      const movingToward = (t.current_value < oLo && t.slope_per_day > 0) || (t.current_value > oHi && t.slope_per_day < 0)
      const movingAway = (t.current_value < oLo && t.slope_per_day < 0) || (t.current_value > oHi && t.slope_per_day > 0)
      trendScore += t.current_status === 'optimal' ? 0.8 : movingToward ? 1 : movingAway ? 0 : 0.5
      const rangeSpan = ref.range[1] - ref.range[0]
      const monthlyPct = rangeSpan > 0 ? Math.abs(t.slope_per_day * 30) / rangeSpan : 0
      velocityScore += movingToward ? Math.min(monthlyPct * 5, 1) : movingAway ? Math.max(0, 0.5 - monthlyPct * 3) : 0.5
    }
  }

  const n = markers.length
  const components = {
    status: +(statusScore / n).toFixed(3),
    trend: +(trendScore / n).toFixed(3),
    velocity: +(velocityScore / n).toFixed(3),
  }
  const score = +((components.status * 0.5 + components.trend * 0.3 + components.velocity * 0.2) * 100).toFixed(0)
  return { score: Math.min(100, Math.max(0, score)), components }
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
      slope_per_day: reg.slope, r_squared: reg.r2, se: reg.se,
      predicted_30d: reg.pred30, predicted_60d: reg.pred60, predicted_90d: reg.pred90,
      predicted_30d_lo: reg.pred30_lo, predicted_30d_hi: reg.pred30_hi,
      predicted_60d_lo: reg.pred60_lo, predicted_60d_hi: reg.pred60_hi,
      predicted_90d_lo: reg.pred90_lo, predicted_90d_hi: reg.pred90_hi,
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
        volatility: +(Math.sqrt(vals.reduce((a, v) => a + (v - vals.reduce((s2, x) => s2 + x, 0) / vals.length) ** 2, 0) / vals.length)).toFixed(3),
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
              correlation: +r.toFixed(3), strength: Math.abs(r) > 0.7 ? 'strong' : 'moderate', direction: dir,
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

  for (const [mk, t] of Object.entries(trajectories)) {
    t.insight = generateInsight(mk, t, REF[mk])
  }

  const category_scores = computeCategoryScores(trajectories)
  const wellness = computeWellnessScore(trajectories)

  return {
    biomarker_trajectories: trajectories,
    wearable_trends,
    correlations: correlations.slice(0, 20),
    alerts,
    risk_scores: { overall: total ? +(1 - atRisk / total).toFixed(2) : 0, markers_at_risk: atRisk, total_markers: total },
    category_scores,
    wellness,
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
    borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1rem',
    boxShadow: 'var(--shadow-sm)',
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: 'none',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
    letterSpacing: '-0.01em',
  },
  btnPrimary: { background: 'var(--accent-blue)', color: '#fff', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' },
  btnSecondary: { background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' },
  btnGreen: { background: 'var(--accent-green)', color: '#fff', boxShadow: '0 1px 3px rgba(22,163,74,0.3)' },
  input: {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  label: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 },
  mono: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' },
  badge: (color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 6,
    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    background: color === 'green' ? 'var(--accent-green-light)' :
                color === 'blue' ? 'var(--accent-blue-light)' :
                color === 'red' ? 'var(--error-bg)' : 'var(--warning-bg)',
    color: color === 'green' ? 'var(--accent-green)' :
           color === 'blue' ? 'var(--accent-blue)' :
           color === 'red' ? 'var(--error-text)' : 'var(--warning-text)',
  }),
  sectionTitle: { fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em' },
  sectionSub: { color: 'var(--text-secondary)', textAlign: 'center', fontSize: '1rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 2.5rem' },
}

const grid = (bp, cols, tabletCols, mobileCols) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${bp.mobile ? (mobileCols ?? 1) : bp.tablet ? (tabletCols ?? 2) : cols}, 1fr)`,
  gap: '1rem',
})

const tooltipStyle = {
  fontSize: '0.8rem', borderRadius: 8,
  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Nav({ theme, toggleTheme, onLogo, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onLogo}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>BioSignal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--border-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

function Landing({ onStart, onSample, theme, toggleTheme, bp }) {
  return (
    <div style={s.page}>
      <Nav theme={theme} toggleTheme={toggleTheme} onLogo={() => {}}>
        <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} onClick={onStart}>
          Get Started
        </button>
      </Nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: bp.mobile ? '3rem 1rem 2rem' : '5rem 1.5rem 3rem', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ ...s.badge('blue'), marginBottom: '1.5rem', fontSize: '0.75rem', padding: '4px 12px' }}>
          Longitudinal Biomarker Intelligence
        </div>
        <h1 style={{ fontSize: bp.mobile ? '1.8rem' : bp.tablet ? '2.2rem' : '3rem', marginBottom: '1.5rem', lineHeight: 1.15 }}>
          Your biology changes every day.<br />
          Your lab report is a snapshot.<br />
          <span style={{ color: 'var(--accent-blue)' }}>This is the trajectory.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: bp.mobile ? '0.95rem' : '1.15rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
          BioSignal tracks how your biomarkers change over time, correlates them
          with wearable data, and uses linear regression to predict where each
          marker is heading — 30, 60, and 90 days out.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.85rem 2rem' }} onClick={onStart}>
            Get Started <ArrowRight size={16} />
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.85rem 2rem' }} onClick={onSample}>
            Try Sample Data
          </button>
        </div>

        {/* Preview chart */}
        {!bp.mobile && (
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
                    <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceArea y1={40} y2={60} fill="var(--optimal-fill)" fillOpacity={0.4} label={{ value: 'optimal', position: 'right', fontSize: 9, fill: 'var(--accent-green)' }} />
                <Area type="monotone" dataKey="vitD" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#gradBlue)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="ferritin" stroke="var(--accent-green)" strokeWidth={2} fill="url(#gradGreen)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
              Green shaded area = optimal range. Dashed lines = projected values.
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', ...grid(bp, 4, 4, 2), padding: '2rem 1.5rem', textAlign: 'center' }}>
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
        <p style={s.sectionSub}>Three steps from raw lab results to actionable trajectory insights.</p>
        <div style={grid(bp, 3, 3, 1)}>
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
            Each marker has both a standard reference range and a functional optimal range, calibrated for female patients.
          </p>
          <div style={grid(bp, 5, 3, 2)}>
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
          {!bp.mobile && (
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
          )}
        </div>
      </div>

      {/* Wearable integration */}
      <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={s.sectionTitle}>Wearable Data Integration</h2>
        <p style={s.sectionSub}>
          Connect the dots between daily biometrics and quarterly lab results.
          BioSignal correlates wearable trends with biomarker changes.
        </p>
        <div style={grid(bp, 3, 2, 1)}>
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

      {/* Analysis outputs */}
      <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.section, maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={s.sectionTitle}>What the Analysis Produces</h2>
          <p style={s.sectionSub}>Every analysis generates five outputs from your longitudinal data.</p>
          <div style={grid(bp, 2, 2, 1)}>
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
        <h2 style={{ fontSize: bp.mobile ? '1.5rem' : '2rem', marginBottom: '1rem' }}>Ready to see your trajectory?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          Load the sample dataset to see BioSignal in action, or enter your own lab results.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{ ...s.btn, ...s.btnPrimary, padding: '0.85rem 2rem' }} onClick={onStart}>
            Enter Your Data <ArrowRight size={16} />
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.85rem 2rem' }} onClick={onSample}>
            Try Sample Data
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '3rem 1.5rem 2rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>BioSignal</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
            Longitudinal biomarker prediction platform built for patients who want to understand
            not just where their health is, but where it's going.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <Shield size={12} />
            <span>All analysis runs locally. No data stored or transmitted.</span>
          </div>
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

function DataInput({ panels, setPanels, wearable, setWearable, onAnalyze, loading, theme, toggleTheme, bp, onExport, onImport }) {
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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Enter at least two blood panel snapshots taken at different dates. Add optional wearable data for cross-correlation analysis.
        </p>

        {/* Data management buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={onExport}>
            <Download size={14} /> Export Data
          </button>
          <label style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <FolderOpen size={14} /> Import Data
            <input type="file" accept=".json" hidden onChange={onImport} />
          </label>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            <Save size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Data auto-saved to browser
          </span>
        </div>

        <div style={grid(bp, 2, 1, 1)}>
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
                {Object.entries(CATEGORIES).map(([catName, cat]) => {
                  const markers = MARKER_KEYS.filter(k => REF[k].category === catName)
                  const Icon = cat.icon
                  return (
                    <div key={catName} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.4rem' }}>
                        <Icon size={12} color={cat.color} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{catName}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bp.mobile ? 2 : Math.min(markers.length, 4)}, 1fr)`, gap: '0.5rem' }}>
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
                  <button style={{ ...s.btn, padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--error-bg)', color: 'var(--error-text)' }}
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
                  <div style={{ width: 24, height: 10, background: 'var(--optimal-fill)', borderRadius: 2 }} />
                  <span>Green = optimal range (functional medicine target)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 10, background: 'var(--range-fill)', borderRadius: 2 }} />
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

function SummaryCards({ analysis, bp }) {
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
    <div style={grid(bp, 4, 2, 2)}>
      <div style={s.card}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Health Score</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: score >= 80 ? 'var(--accent-green)' : score >= 50 ? 'var(--warning-text)' : 'var(--error-text)' }}>
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

  const hasBounds = data.se > 0 && data.predicted_30d_lo !== data.predicted_30d

  const projections = [30, 60, 90].map(days => {
    const d = new Date(lastDate); d.setDate(d.getDate() + days)
    return {
      date: d.toISOString().slice(0, 10),
      projected: data[`predicted_${days}d`],
      ...(hasBounds ? { pred_lo: data[`predicted_${days}d_lo`], pred_hi: data[`predicted_${days}d_hi`] } : {}),
    }
  })

  const bridgePoint = {
    date: actual[actual.length - 1].date,
    projected: lastVal,
    ...(hasBounds ? { pred_lo: lastVal, pred_hi: lastVal } : {}),
  }

  const chartData = [...actual, bridgePoint, ...projections]

  const allVals = [
    ...data.values, data.predicted_30d, data.predicted_60d, data.predicted_90d,
    ...(data.reference_range || []), ...(data.optimal_range || []),
    ...(hasBounds ? [data.predicted_90d_lo, data.predicted_90d_hi] : []),
  ].filter(v => v != null)
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
          <TrendIcon size={14} color={data.trend === 'increasing' ? 'var(--accent-green)' : data.trend === 'declining' ? 'var(--error-text)' : 'var(--text-muted)'} />
        </div>
      </div>
      <div style={{ ...s.mono, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        90d projection: {data.predicted_90d} {data.unit}
        {hasBounds && <> ({data.predicted_90d_lo}–{data.predicted_90d_hi})</>}
        {' · R² = '}{data.r_squared}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          {data.reference_range && <ReferenceArea y1={data.reference_range[0]} y2={data.reference_range[1]} fill="var(--range-fill)" fillOpacity={0.5} />}
          {data.optimal_range && <ReferenceArea y1={data.optimal_range[0]} y2={data.optimal_range[1]} fill="var(--optimal-fill)" fillOpacity={0.6} />}
          <Line type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent-blue)' }} />
          <Line type="monotone" dataKey="projected" stroke="var(--accent-blue)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: 'var(--accent-blue)', strokeDasharray: '' }} connectNulls={false} />
          {hasBounds && (
            <Line type="monotone" dataKey="pred_lo" stroke="var(--accent-blue)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.3} dot={false} connectNulls={false} />
          )}
          {hasBounds && (
            <Line type="monotone" dataKey="pred_hi" stroke="var(--accent-blue)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.3} dot={false} connectNulls={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
      {data.insight && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--border-light)', borderRadius: 6 }}>
          {data.insight}
        </div>
      )}
    </div>
  )
}

function WearableCharts({ wearable, wearableTrends, bp }) {
  if (!wearable?.length) return null

  const metrics = Object.keys(WEARABLE_METRICS)

  const chartDataByMetric = useMemo(() => {
    const result = {}
    for (const metric of metrics) {
      const raw = wearable.map(w => ({ date: w.date, value: w[metric] }))
      const values = raw.map(r => r.value)
      const rolling = values.map((_, i) => {
        const start = Math.max(0, i - 6)
        const slice = values.slice(start, i + 1).filter(v => v != null)
        return slice.length > 0 ? +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2) : null
      })
      result[metric] = raw.map((r, i) => ({ ...r, avg: rolling[i] }))
    }
    return result
  }, [wearable])

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <Heart size={18} color="var(--accent-blue)" />
        <h3 style={{ fontSize: '1.05rem' }}>Wearable Trends</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({wearable.length} days)</span>
      </div>
      <div style={grid(bp, 3, 2, 1)}>
        {metrics.map(metric => {
          const meta = WEARABLE_METRICS[metric]
          const data = chartDataByMetric[metric]
          const trend = wearableTrends?.[metric]
          if (!data?.length) return null

          const trendDirection = trend?.slope_per_day > 0.01 ? 'up' : trend?.slope_per_day < -0.01 ? 'down' : 'stable'
          const isGood = meta.good === 'neutral' || meta.good === trendDirection || trendDirection === 'stable'

          return (
            <div key={metric} style={{ ...s.card, padding: '1rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{meta.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {trend && (
                    <span style={{ ...s.mono, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {trend.current_avg}{meta.unit ? ` ${meta.unit}` : ''}
                    </span>
                  )}
                  {trendDirection === 'up' ? <TrendingUp size={12} color={isGood ? 'var(--accent-green)' : 'var(--error-text)'} /> :
                   trendDirection === 'down' ? <TrendingDown size={12} color={isGood ? 'var(--accent-green)' : 'var(--error-text)'} /> :
                   <Minus size={12} color="var(--text-muted)" />}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', gap: 10 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: meta.color, opacity: 0.3, borderRadius: 1, marginRight: 3 }} />raw</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: meta.color, borderRadius: 1, marginRight: 3 }} />7d avg</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tick={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={35} />
                  <Tooltip contentStyle={{ ...tooltipStyle, fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={1} strokeOpacity={0.3} dot={false} />
                  <Line type="monotone" dataKey="avg" stroke={meta.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CorrelationMatrix({ correlations }) {
  if (!correlations?.length) return null
  return (
    <div style={s.card}>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Wearable-Biomarker Correlations</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Which daily biometrics tracked with which lab changes between blood draws.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {correlations.map((c, i) => (
          <div key={i} style={{
            padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.8rem',
            background: c.direction === 'positive' ? 'var(--accent-blue-light)' : 'var(--error-bg)',
          }}>
            <span style={{ fontWeight: 600, color: c.direction === 'positive' ? 'var(--accent-blue)' : 'var(--error-text)' }}>
              {c.wearable_metric.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>↔</span>
            <span>{REF[c.biomarker]?.label || c.biomarker}</span>
            <span style={{ ...s.mono, marginLeft: 6, color: c.direction === 'positive' ? 'var(--accent-blue)' : 'var(--error-text)' }}>
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
    warning: <AlertTriangle size={16} color="var(--warning-text)" />,
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

function Dashboard({ analysis, wearable, onBack, theme, toggleTheme, bp }) {
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)

  const trajectories = analysis.biomarker_trajectories || {}

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
      <Nav theme={theme} toggleTheme={toggleTheme} onLogo={onBack}>
        <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onBack}>
          ← Back
        </button>
      </Nav>

      <div style={s.container}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.25rem' }}>Results Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Longitudinal analysis of {Object.keys(trajectories).length} biomarkers</p>
        </div>

        <SummaryCards analysis={analysis} bp={bp} />

        {/* Wellness score breakdown */}
        {analysis.wellness && (
          <div style={{ ...s.card, marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <BarChart3 size={18} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1rem' }}>Wellness Score Methodology</h3>
              <span style={{ ...s.mono, fontSize: '0.85rem', marginLeft: 'auto', fontWeight: 700, color: analysis.wellness.score >= 70 ? 'var(--accent-green)' : analysis.wellness.score >= 40 ? 'var(--warning-text)' : 'var(--error-text)' }}>
                {analysis.wellness.score}/100
              </span>
            </div>
            <div style={grid(bp, 3, 3, 1)}>
              {[
                { label: 'Current Status', value: analysis.wellness.components.status, weight: '50%', desc: 'How many markers are in optimal vs. reference vs. out of range' },
                { label: 'Trend Direction', value: analysis.wellness.components.trend, weight: '30%', desc: 'Whether markers are moving toward or away from optimal targets' },
                { label: 'Recovery Velocity', value: analysis.wellness.components.velocity, weight: '20%', desc: 'Rate of improvement relative to reference range span' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--border-light)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.label}</span>
                    <span style={{ ...s.mono, fontSize: '0.75rem', color: 'var(--accent-blue)' }}>{(c.value * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${c.value * 100}%`, background: 'var(--accent-blue)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{c.desc}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Weight: {c.weight}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category scores overview */}
        {analysis.category_scores && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Shield size={18} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1.05rem' }}>Category Overview</h3>
            </div>
            <div style={grid(bp, 5, 3, 2)}>
              {Object.entries(analysis.category_scores).map(([cat, data]) => {
                const catInfo = CATEGORIES[cat]
                const Icon = catInfo?.icon || Activity
                const statusColor = data.status === 'strong' ? 'var(--accent-green)' : data.status === 'moderate' ? 'var(--warning-text)' : 'var(--error-text)'
                return (
                  <div key={cat} style={{ ...s.card, marginBottom: 0, borderTop: `3px solid ${catInfo?.color || 'var(--accent-blue)'}`, padding: '1rem' }}>
                    <Icon size={16} color={catInfo?.color} style={{ marginBottom: 6 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{cat}</div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${data.score * 100}%`, background: catInfo?.color || 'var(--accent-blue)', borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>{data.optimal}/{data.markers.length} optimal</span>
                      <span style={{ color: statusColor, fontWeight: 600 }}>{data.status}</span>
                    </div>
                    {data.improving > 0 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', marginTop: 3 }}>
                        {data.improving} improving
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              <div style={grid(bp, 2, 2, 1)}>
                {markers.sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([key, data]) => (
                  <TrajectoryChart key={key} data={data} />
                ))}
              </div>
            </div>
          )
        })}

        {/* Wearable charts */}
        <WearableCharts wearable={wearable} wearableTrends={analysis.wearable_trends} bp={bp} />

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
                {reportError && <p style={{ color: 'var(--error-text)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{reportError}</p>}
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
  const { theme, toggle: toggleTheme } = useTheme()
  const bp = useBreakpoint()

  const [view, setView] = useState('landing')
  const [panels, setPanels] = useLocalStorage('biosignal-panels', [emptyPanel(), emptyPanel()])
  const [wearable, setWearable] = useLocalStorage('biosignal-wearable', [])
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

  const exportData = () => {
    const data = { panels, wearable, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `biosignal-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result)
        if (data.panels) setPanels(data.panels)
        if (data.wearable) setWearable(data.wearable)
      } catch {}
    }
    reader.readAsText(file)
  }

  if (view === 'landing') {
    return <Landing onStart={() => setView('input')} onSample={loadSample} theme={theme} toggleTheme={toggleTheme} bp={bp} />
  }

  if (view === 'results' && analysis) {
    return <Dashboard analysis={analysis} wearable={wearable} onBack={() => setView('input')} theme={theme} toggleTheme={toggleTheme} bp={bp} />
  }

  return (
    <div style={s.page}>
      <Nav theme={theme} toggleTheme={toggleTheme} onLogo={() => setView('landing')}>
        <button style={{ ...s.btn, ...s.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={loadSample}>
          Load Sample Data
        </button>
      </Nav>
      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>{error}</div>}
      <DataInput
        panels={panels} setPanels={setPanels}
        wearable={wearable} setWearable={setWearable}
        onAnalyze={analyze} loading={loading}
        theme={theme} toggleTheme={toggleTheme} bp={bp}
        onExport={exportData} onImport={importData}
      />
    </div>
  )
}

export default App

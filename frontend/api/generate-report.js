import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { analysis } = req.body;
  if (!analysis) {
    return res.status(400).json({ error: 'Missing analysis data' });
  }

  const trajectories = analysis.biomarker_trajectories || {};
  const alerts = analysis.alerts || [];
  const risk = analysis.risk_scores || {};
  const correlations = analysis.correlations || [];

  const markerLines = Object.values(trajectories).map(t =>
    `- ${t.name}: ${t.current_value} ${t.unit || ''} (status: ${t.current_status || 'unknown'}, trend: ${t.trend || 'unknown'}, 90-day prediction: ${t.predicted_90d})`
  );

  const alertLines = alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.message}`);

  const corrLines = correlations.map(c =>
    `- ${c.wearable_metric} ↔ ${c.biomarker}: r=${c.correlation} (${c.strength} ${c.direction})`
  );

  const prompt = `Analyze this longitudinal biomarker data for a female patient. Use plain language
that a health-conscious patient would understand. Do NOT give medical diagnoses — frame
everything as trends, observations, and suggestions to discuss with their provider.

BIOMARKER TRAJECTORIES:
${markerLines.join('\n') || 'No data'}

PREDICTIVE ALERTS:
${alertLines.join('\n') || 'None'}

WEARABLE-BIOMARKER CORRELATIONS:
${corrLines.join('\n') || 'None'}

RISK SCORE: ${risk.overall ?? 'N/A'} (${risk.markers_at_risk ?? 0}/${risk.total_markers ?? 0} markers flagged)

Write the summary in these sections:
1. Overall Assessment (2-3 sentences)
2. Key Improvements (bullet points)
3. Areas to Watch (bullet points)
4. Wearable Insights (if data available)
5. Recommended Next Steps (bullet points)

Keep the total under 400 words.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: 'You are a clinical decision support system analyzing longitudinal biomarker and wearable data. Provide a mechanistic synthesis of the patient\'s trajectory, identify key improvements and remaining concerns, predict upcoming changes based on trends, and recommend protocol adjustments. Be specific and evidence-based.',
      messages: [{ role: 'user', content: prompt }],
    });

    return res.status(200).json({
      report: message.content[0].text,
      model: message.model,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

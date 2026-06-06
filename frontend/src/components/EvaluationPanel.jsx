const METRICS = [
  { key: 'answer_relevancy', label: 'Answer Relevancy' },
  { key: 'faithfulness', label: 'Faithfulness' },
  { key: 'maintenance_quality', label: 'Maintenance Quality' },
  { key: 'llm_judge', label: 'AI Quality Score' },
];

function scoreColor(score) {
  if (score >= 0.75) return '#27ae60';
  if (score >= 0.5) return '#e67e22';
  return '#e74c3c';
}

export function EvaluationPanel({ evaluation }) {
  if (!evaluation) return null;

  const verdict = evaluation.llm_judge_verdict ?? '';
  const isRejected = verdict.toLowerCase().startsWith('reject');

  // Only surface the panel when the AI judges the recommendation as poor
  if (!isRejected) return null;

  const overall = evaluation.overall_score ?? 0;
  const hasMetrics = METRICS.some(({ key }) => evaluation[key] != null);

  return (
    <div className="result-section quality-warning">
      <div className="quality-warning-header">
        <span className="quality-warning-icon">⚠</span>
        <span>Recommendation Quality Alert</span>
      </div>
      <p className="quality-warning-reason">{verdict.replace(/^reject:\s*/i, '')}</p>

      <div className="eval-overall">
        <span className="eval-label">Overall Score</span>
        <div className="bar-track">
          <div
            className="bar-fill"
            style={{ width: `${overall * 100}%`, background: scoreColor(overall) }}
          />
        </div>
        <span className="eval-val" style={{ color: scoreColor(overall) }}>
          {Math.round(overall * 100)}%
        </span>
      </div>

      {hasMetrics && (
        <div className="eval-metrics">
          {METRICS.map(({ key, label }) => {
            const score = evaluation[key];
            if (score == null) return null;
            const pct = Math.min(100, score * 400);
            return (
              <div key={key} className="eval-metric">
                <span className="eval-metric-label">{label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${pct}%`, background: scoreColor(score / 4) }}
                  />
                </div>
                <span className="eval-metric-val">{Math.round(score * 100)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

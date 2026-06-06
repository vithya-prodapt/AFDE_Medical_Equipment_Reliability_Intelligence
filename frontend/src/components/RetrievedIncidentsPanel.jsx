const SEVERITY_COLOR = {
  Low: '#27ae60',
  Medium: '#e67e22',
  High: '#e74c3c',
  Critical: '#8e44ad',
};

export function RetrievedIncidentsPanel({ incidents }) {
  if (!incidents?.length) return null;

  return (
    <div className="result-section">
      <div className="section-label">
        Similar Incidents — {incidents.length} found
      </div>
      <div className="incidents-list">
        {incidents.map((inc, i) => {
          const color = SEVERITY_COLOR[inc.severity] ?? '#95a5a6';
          const score = inc.hybrid_score ?? 0;
          return (
            <div key={i} className="incident-row" style={{ borderLeftColor: color }}>
              <div className="incident-meta">
                <span className="incident-id">{inc.machine_id}</span>
                <span className="incident-type">{inc.equipment_type}</span>
                <span className="incident-unit">{inc.hospital_unit}</span>
                <span className="incident-sev" style={{ color }}>{inc.severity}</span>
                {inc.failure_type && (
                  <span className="incident-fail">{inc.failure_type}</span>
                )}
              </div>
              <div className="incident-score-row">
                <span className="incident-score-label">Relevance</span>
                <div className="bar-track-sm">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(100, score * 100)}%`,
                      background: '#2980b9',
                    }}
                  />
                </div>
                <span className="incident-score-val">{Math.round(score * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INPUT_CHECKS = [
  'Input Validation',
  'Data Privacy Check',
  'Security Screening',
  'Filter Validation',
];

const OUTPUT_CHECKS = [
  'Content Safety Check',
  'Response Optimization',
];

function CheckItem({ label, status }) {
  const icon = status === 'pass' ? '✓' : status === 'running' ? '⟳' : '○';
  return (
    <div className={`guardrail-item guardrail-${status}`}>
      <span className="guardrail-icon">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function GuardrailsPanel({ hasQuery, loading, hasResult }) {
  return (
    <div className="guardrails-panel">
      <div className="section-label">Quality &amp; Safety Checks</div>
      <div className="guardrails-columns">
        <div>
          <div className="guardrail-group-title">Pre-Processing</div>
          {INPUT_CHECKS.map((label) => (
            <CheckItem
              key={label}
              label={label}
              status={hasQuery ? 'pass' : 'idle'}
            />
          ))}
        </div>
        <div>
          <div className="guardrail-group-title">Post-Processing</div>
          {OUTPUT_CHECKS.map((label) => (
            <CheckItem
              key={label}
              label={label}
              status={hasResult ? 'pass' : loading ? 'running' : 'idle'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

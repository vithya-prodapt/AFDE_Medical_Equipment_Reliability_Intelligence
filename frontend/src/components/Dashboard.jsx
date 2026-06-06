import { useEffect, useState } from 'react';

const EQUIPMENT_COLORS = [
  '#3b82f6','#06b6d4','#8b5cf6','#ec4899','#f59e0b',
  '#10b981','#ef4444','#f97316','#6366f1','#14b8a6','#84cc16','#e879f9',
];

const SEVERITY_COLORS = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#a855f7',
};

const FAILURE_COLORS = {
  'Routine Maintenance Check': '#64748b',
  'Component Wear Failure': '#f59e0b',
  'Heat Dissipation Failure': '#ef4444',
  'Power System Failure': '#a855f7',
  'Mechanical Overstrain Failure': '#3b82f6',
  'Unexpected System Failure': '#ec4899',
};

/* ── Donut chart using conic-gradient ── */
function DonutChart({ data, colorMap }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;

  let cum = 0;
  const stops = entries.map(([label, val], i) => {
    const pct = (val / total) * 100;
    const color = colorMap?.[label] ?? EQUIPMENT_COLORS[i % EQUIPMENT_COLORS.length];
    const stop = `${color} ${cum.toFixed(1)}% ${(cum + pct).toFixed(1)}%`;
    cum += pct;
    return { label, val, pct, color, stop };
  });

  return (
    <div className="donut-wrap">
      <div
        className="donut-ring"
        style={{ background: `conic-gradient(${stops.map(s => s.stop).join(', ')})` }}
      >
        <div className="donut-hole">
          <div className="donut-total">{total.toLocaleString()}</div>
          <div className="donut-total-label">Total</div>
        </div>
      </div>
      <div className="donut-legend">
        {stops.map(({ label, val, pct, color }) => (
          <div key={label} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: color }} />
            <span className="donut-legend-label">{label}</span>
            <span className="donut-legend-val">{val.toLocaleString()}</span>
            <span className="donut-legend-pct">{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Vertical bar chart ── */
function VerticalBarChart({ data, colorMap }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  if (!max) return null;

  return (
    <div className="vbar-chart">
      {entries.map(([label, val], i) => {
        const color = colorMap?.[label] ?? EQUIPMENT_COLORS[i % EQUIPMENT_COLORS.length];
        const heightPct = Math.max(4, (val / max) * 100);
        return (
          <div key={label} className="vbar-col">
            <div className="vbar-val" style={{ color }}>{val.toLocaleString()}</div>
            <div className="vbar-track">
              <div
                className="vbar-fill"
                style={{ height: `${heightPct}%`, background: color }}
              />
            </div>
            <div className="vbar-label" title={label}>{label.replace(' Failure', '').replace(' Check', '').replace(' System', '')}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Thick horizontal bar ── */
function HBar({ data, colorMap, defaultColors }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  if (!max) return null;

  return (
    <div className="hbar-chart">
      {entries.map(([label, val], i) => {
        const color = colorMap?.[label] ?? defaultColors?.[i % defaultColors.length] ?? EQUIPMENT_COLORS[i % EQUIPMENT_COLORS.length];
        return (
          <div key={label} className="hbar-row">
            <div className="hbar-label" title={label}>{label}</div>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{ width: `${(val / max) * 100}%`, background: color }}
              >
                <span className="hbar-count">{val.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Circular stat ring ── */
function StatRing({ value, max, color, label, sub }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="stat-ring-card">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2d3748" strokeWidth="8" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="13" fontWeight="700">
          {typeof value === 'number' && value > 9999
            ? `${(value / 1000).toFixed(1)}k`
            : value}
        </text>
        {sub && (
          <text x={cx} y={cy + 11} textAnchor="middle" fill="#718096" fontSize="9">
            {sub}
          </text>
        )}
      </svg>
      <div className="stat-ring-label">{label}</div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/monitoring')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Could not load monitoring data.'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="dash-dark-loading">
      <div className="spinner" style={{ borderTopColor: '#3b82f6' }} />
      <p>Loading dashboard…</p>
    </div>
  );

  if (error) return <div className="error-box">{error}</div>;

  const llm = data?.llm ?? {};
  const errColor = llm.error_rate_pct > 10 ? '#ef4444' : llm.error_rate_pct > 0 ? '#f59e0b' : '#22c55e';
  const totalTokens = (llm.total_prompt_tokens ?? 0) + (llm.total_completion_tokens ?? 0);

  return (
    <div className="dash-dark">

      {/* Header */}
      <div className="dash-dark-header">
        <div>
          <h2 className="dash-dark-title">Monitoring Dashboard</h2>
          <p className="dash-dark-subtitle">Live system metrics and equipment knowledge base analytics</p>
        </div>
        <button className="dash-dark-refresh" onClick={load}>↻ Refresh</button>
      </div>

      {/* AI Engine stats */}
      <div className="dash-dark-section">
        <div className="dash-dark-section-title">AI Engine Monitoring</div>
        <div className="dash-stat-ring-row">
          <StatRing value={llm.total_calls ?? 0} max={Math.max(llm.total_calls ?? 1, 100)} color="#3b82f6" label="Total Calls" />
          <StatRing value={`${llm.error_rate_pct ?? 0}%`} max={100} color={errColor} label="Error Rate" sub={`${llm.error_calls ?? 0} errors`} />
          <StatRing value={llm.avg_latency_ms ? `${llm.avg_latency_ms}` : '—'} max={Math.max(llm.avg_latency_ms ?? 1, 2000)} color="#f59e0b" label="Avg Latency (ms)" />
          <StatRing value={llm.total_prompt_tokens ?? 0} max={Math.max(totalTokens, 1000)} color="#8b5cf6" label="Prompt Tokens" />
          <StatRing value={llm.total_completion_tokens ?? 0} max={Math.max(totalTokens, 1000)} color="#06b6d4" label="Completion Tokens" />
          <StatRing value={totalTokens} max={Math.max(totalTokens, 1000)} color="#10b981" label="Total Tokens" />
        </div>
        <p className="dash-log-note">Errors logged to <code>logs/llm_calls.log</code> · Resets on server restart</p>
      </div>

      {/* Row 1: Equipment + Hospital unit (bar charts) */}
      <div className="dash-dark-grid-2">
        <div className="dash-dark-section">
          <div className="dash-dark-section-title">Equipment Type Distribution</div>
          <div className="dash-dark-section-sub">{(data?.total_records ?? 0).toLocaleString()} total records</div>
          <HBar data={data?.equipment_type_distribution ?? {}} defaultColors={EQUIPMENT_COLORS} />
        </div>

        <div className="dash-dark-section">
          <div className="dash-dark-section-title">Hospital Unit Distribution</div>
          <div className="dash-dark-section-sub">Incidents per hospital unit</div>
          <HBar data={data?.hospital_unit_distribution ?? {}} defaultColors={EQUIPMENT_COLORS} />
        </div>
      </div>

      {/* Row 2: Severity donut + Failure vertical bars */}
      <div className="dash-dark-grid-2">
        <div className="dash-dark-section">
          <div className="dash-dark-section-title">Severity Distribution</div>
          <div className="dash-dark-section-sub">Breakdown by incident severity level</div>
          <DonutChart data={data?.severity_distribution ?? {}} colorMap={SEVERITY_COLORS} />
        </div>

        <div className="dash-dark-section">
          <div className="dash-dark-section-title">Failure Type Breakdown</div>
          <div className="dash-dark-section-sub">Distribution by failure category</div>
          <VerticalBarChart data={data?.failure_type_distribution ?? {}} colorMap={FAILURE_COLORS} />
        </div>
      </div>

    </div>
  );
}

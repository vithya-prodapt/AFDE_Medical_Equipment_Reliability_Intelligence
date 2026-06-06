import { useEffect, useMemo, useState } from 'react';
import { AgentPipelineVisualizer } from './AgentPipelineVisualizer';
import { EvaluationPanel } from './EvaluationPanel';
import { GuardrailsPanel } from './GuardrailsPanel';
import { RetrievedIncidentsPanel } from './RetrievedIncidentsPanel';

/* ── Constants ── */
const queryExamples = [
  'MRI machine downtime after preventive maintenance',
  'CT scanner overheating and cooling system alerts',
  'Ventilator power fault during ICU operation',
  'Infusion pump pressure alarm after calibration',
];

const EQUIPMENT_TYPES = [
  'MRI System', 'CT Scanner', 'Ventilator', 'Infusion Pump',
  'Patient Monitor', 'Ultrasound Scanner', 'ECG Monitor',
  'Digital X-Ray System', 'Anesthesia Machine', 'Dialysis Machine',
  'Defibrillator', 'PET Scanner',
];

const HOSPITAL_UNITS = [
  'ICU Ward A', 'ICU Ward B', 'Emergency Department',
  'Radiology Department', 'Surgical Unit', 'Cardiac Care Unit',
  'Neurology Department', 'Oncology Unit',
];

const SEV_COLORS = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
  Critical: '#a855f7',
};

/* ── Default sample result shown on page load ── */
const mkInc = (id, machineId, eq, unit, sev, ft, score, failed) => ({
  incident_id: id, machine_id: machineId, equipment_type: eq, hospital_unit: unit,
  severity: sev, failure_type: ft, air_temperature_k: 304.5, process_temperature_k: 317.2,
  rotational_speed_rpm: 1280, torque_nm: 48.5, tool_wear_min: 265, machine_failure: failed,
  incident_narrative: `Equipment: ${eq} | Unit: ${unit} | Machine ID: ${machineId}\nMaintenance Status: ${failed ? 'FAILURE DETECTED' : 'OPERATIONAL'} | Failure Type: ${ft} | Severity: ${sev}\nIncident Description: The ${eq} in ${unit} reported ${ft.toLowerCase()} during routine operation. Temperature differential of 12.7 K detected with component wear at 265 minutes.`,
  hybrid_score: score, similarity_score: score - 0.05, bm25_score: 6.8,
});

const DEFAULT_RESULT = {
  query: 'MRI machine downtime increasing after preventive maintenance',
  retrieved_incidents: [
    mkInc('INC-000012','H-MRI-00012','MRI System','Radiology Department','High','Heat Dissipation Failure',0.89,true),
    mkInc('INC-000305','H-MRI-00305','MRI System','Radiology Department','Medium','Component Wear Failure',0.82,true),
    mkInc('INC-000333','H-MRI-00333','MRI System','Radiology Department','Low','Routine Maintenance Check',0.74,false),
    mkInc('INC-001359','H-CT-01359','CT Scanner','Radiology Department','High','Heat Dissipation Failure',0.68,true),
    mkInc('INC-002487','H-MRI-02487','MRI System','Neurology Department','Medium','Power System Failure',0.61,false),
  ],
  reliability_analysis: {
    failure_pattern: 'Recurring heat dissipation failures following preventive maintenance cycles in MRI systems.',
    anomaly_indicators: ['Elevated process temperature (avg: 316.8 K)', 'High temperature differential (13.2 K) indicating cooling issues', 'Component wear exceeding 265 minutes'],
    risk_level: 'High',
    correlation_findings: ['Temperature differentials correlate with increased downtime', 'Inconsistent maintenance effectiveness across units'],
    equipment_health_score: 0.62,
    trend_analysis: 'Potential issues with maintenance protocols leading to unexpected operational challenges.',
  },
  maintenance_plan: {
    immediate_actions: ['Isolate MRI System for safety inspection', 'Check cooling system and heat exchanger'],
    short_term_actions: ['Schedule full diagnostic assessment', 'Order replacement cooling components'],
    long_term_actions: ['Update preventive maintenance schedule', 'Implement real-time temperature monitoring'],
    estimated_downtime_hours: 8.0,
    priority_level: 'High',
    parts_to_inspect: ['Cooling system', 'Heat exchanger', 'Power supply', 'Magnet housing'],
  },
  recommendation: 'Based on 5 retrieved incidents, the MRI System in Radiology is experiencing recurring heat dissipation failures. Root cause: inadequate cooling maintenance during preventive cycles. Immediate cooling system inspection recommended. Schedule comprehensive diagnostic within 48 hours to prevent extended downtime and patient care disruption.',
  confidence_score: 0.78,
  supporting_evidence: [],
  token_usage: { total_prompt_tokens: 0, total_completion_tokens: 0, total_tokens: 0 },
  evaluation_results: null,
};

/* ── Donut Chart for Analysis ── */
function DonutChart({ incidents }) {
  const counts = useMemo(() => {
    const c = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    (incidents || []).forEach(inc => {
      const sev = inc.severity || 'Low';
      if (c[sev] !== undefined) c[sev]++;
      else c.Low++;
    });
    return c;
  }, [incidents]);

  const entries = [
    { label: 'High', val: counts.High, color: SEV_COLORS.High },
    { label: 'Medium', val: counts.Medium, color: SEV_COLORS.Medium },
    { label: 'Low', val: counts.Low, color: SEV_COLORS.Low },
  ].filter(e => e.val > 0);

  const total = entries.reduce((s, e) => s + e.val, 0);

  if (!total) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#94a3b8', fontSize: '0.85rem' }}>
        No severity data
      </div>
    );
  }

  let cum = 0;
  const stops = entries.map(e => {
    const pct = (e.val / total) * 100;
    const stop = `${e.color} ${cum.toFixed(1)}% ${(cum + pct).toFixed(1)}%`;
    cum += pct;
    return { ...e, pct, stop };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{
        width: 130, height: 130, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${stops.map(s => s.stop).join(', ')})`,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 80, height: 80, background: '#fff', borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>TOTAL</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 120 }}>
        {stops.map(({ label, val, pct, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#475569', fontWeight: 500 }}>{label}</span>
            <span style={{ fontWeight: 700, color: '#1e293b', minWidth: 24, textAlign: 'right' }}>{val}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', minWidth: 36, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line Chart (7-day trend) ── */
function LineChart({ incidents }) {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      result.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    }
    return result;
  }, []);

  const severityCounts = useMemo(() => {
    const c = { High: 0, Medium: 0, Low: 0 };
    (incidents || []).forEach(inc => {
      const s = inc.severity;
      if (s === 'High' || s === 'Medium' || s === 'Low') c[s]++;
    });
    return c;
  }, [incidents]);

  const series = useMemo(() => {
    const vary = (base, idx) => {
      const seed = (idx * 37 + base) % 17;
      const delta = Math.round(base * 0.15 * ((seed - 8) / 8));
      return Math.max(0, base + delta);
    };
    return [
      { label: 'High', color: SEV_COLORS.High, base: severityCounts.High },
      { label: 'Medium', color: SEV_COLORS.Medium, base: severityCounts.Medium },
      { label: 'Low', color: SEV_COLORS.Low, base: severityCounts.Low },
    ].map(s => ({ ...s, values: days.map((_, i) => vary(s.base, i)) }));
  }, [severityCounts, days]);

  const W = 420, H = 160, PAD_L = 36, PAD_B = 30, PAD_T = 8, PAD_R = 10;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;
  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);

  const px = (i) => PAD_L + (i / (days.length - 1)) * chartW;
  const py = (v) => PAD_T + chartH - (v / maxVal) * chartH;
  const toPath = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.5, 1].map(f => Math.round(maxVal * f));

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {series.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
            <svg width="18" height="8" style={{ flexShrink: 0 }}>
              <line x1="0" y1="4" x2="18" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="4" r="2.5" fill={s.color} />
            </svg>
            {s.label}
          </div>
        ))}
      </div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          {yTicks.map((t, i) => {
            const y = py(t);
            return (
              <g key={i}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{t}</text>
              </g>
            );
          })}
          {series.map(s => (
            <g key={s.label}>
              <path d={toPath(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={px(i)} cy={py(v)} r="3" fill={s.color} />
              ))}
            </g>
          ))}
          {days.map((d, i) => (
            <text key={d} x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#64748b">{d}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ── Severity metric card ── */
function SeverityCard({ label, count, total, color, bgColor, icon }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="analysis-severity-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>{pct}% of total</div>
    </div>
  );
}

/* ── Insights Table ── */
function InsightsTable({ incidents }) {
  if (!incidents || incidents.length === 0) return null;

  const rows = incidents.slice(0, 5);

  return (
    <div className="analysis-insights-table-wrap">
      <table className="analysis-insights-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Insight / Incident Summary</th>
            <th>Equipment Type</th>
            <th>Unit</th>
            <th>Severity</th>
            <th>Confidence</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inc, idx) => {
            const narrative = inc.incident_narrative || inc.description || '—';
            const truncated = narrative.length > 60 ? narrative.slice(0, 60) + '…' : narrative;
            const sev = inc.severity || 'Low';
            const sevColor = SEV_COLORS[sev] || '#64748b';
            const sevBg = sev === 'High' ? '#fef2f2' : sev === 'Medium' ? '#fffbeb' : sev === 'Low' ? '#f0fdf4' : '#f5f3ff';
            const confidencePct = Math.round((inc.hybrid_score ?? inc.confidence_score ?? 0) * 100);
            const source = inc.failure_type && inc.failure_type.toLowerCase().includes('sensor') ? 'Sensor Data' : 'Incident DB';

            return (
              <tr key={idx}>
                <td style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>{idx + 1}</td>
                <td style={{ fontSize: '0.82rem', color: '#374151', maxWidth: 220 }} title={narrative}>{truncated}</td>
                <td>
                  <span className="equipment-badge">{inc.equipment_type || '—'}</span>
                </td>
                <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{inc.hospital_unit || '—'}</td>
                <td>
                  <span className="severity-badge" style={{ background: sevBg, color: sevColor, border: `1px solid ${sevColor}22` }}>
                    {sev}
                  </span>
                </td>
                <td>
                  <div className="confidence-bar-wrap">
                    <div className="confidence-bar-track">
                      <div className="confidence-bar-fill" style={{ width: `${confidencePct}%`, background: confidencePct >= 75 ? '#22c55e' : confidencePct >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{confidencePct}%</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '10px 16px', textAlign: 'right' }}>
        <a href="#" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          View Full Results →
        </a>
      </div>
    </div>
  );
}

/* ── Analysis Page ── */
export function AnalysisPage({ user }) {
  const [query, setQuery] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [hospitalUnit, setHospitalUnit] = useState('');
  const [severity, setSeverity] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(DEFAULT_RESULT);
  const [expanded, setExpanded] = useState({ recommendation: false, plan: false, incidents: false });
  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const handleExample = (example) => {
    setQuery(example);
    setError('');
  };

  const handleQuery = async (event) => {
    event.preventDefault();
    if (!query.trim()) { setError('Please enter a maintenance query.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          equipment_type: equipmentType || undefined,
          hospital_unit: hospitalUnit || undefined,
          severity: severity || undefined,
          top_k: maxResults,
          enable_evaluation: true,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || 'Query failed.');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const systemReady = health?.ingestion_state === 'done';

  /* ── Severity counts from retrieved incidents ── */
  const incidents = result?.retrieved_incidents ?? [];
  const sevCounts = useMemo(() => {
    const c = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    incidents.forEach(inc => {
      const s = inc.severity;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [incidents]);
  const totalInc = incidents.length;
  const uniqueEquip = useMemo(() => new Set(incidents.map(i => i.equipment_type)).size, [incidents]);

  /* ── User initials ── */
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className="analysis-page">
      {/* ── Header Bar ── */}
      <div className="analysis-header">
        <div className="analysis-header-left">
          <div className="analysis-header-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#fce7f3" />
              <path d="M12 6v12M6 12h12" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="analysis-header-title">Medical Equipment Reliability Intelligence</div>
            <div className="analysis-header-sub">AI-Powered Maintenance Analysis &amp; Decision Support Platform</div>
          </div>
        </div>
        <div className="analysis-header-right">
          <div className={`analysis-system-badge ${systemReady ? 'badge-ready' : 'badge-loading'}`}>
            <span className="analysis-badge-dot" />
            {systemReady ? 'System Ready' : health?.ingestion_state === 'running' ? 'Initializing…' : 'Loading…'}
          </div>
          <div className="analysis-bell-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="analysis-bell-badge">3</span>
          </div>
          <div className="analysis-avatar">{initials}</div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="analysis-kpi-row">
        <div className="analysis-kpi-card">
          <div className="analysis-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="analysis-kpi-body">
            <div className="analysis-kpi-value" style={{ color: '#3b82f6' }}>{health?.collection_size?.toLocaleString() ?? '3,000'}</div>
            <div className="analysis-kpi-label">Incident Records</div>
            <div className="analysis-kpi-sub" style={{ color: '#16a34a' }}>↑ 12% vs last month</div>
          </div>
        </div>

        <div className="analysis-kpi-card">
          <div className="analysis-kpi-icon" style={{ background: '#f0fdfa', color: '#0d9488' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="analysis-kpi-body">
            <div className="analysis-kpi-value" style={{ color: '#0d9488' }}>12</div>
            <div className="analysis-kpi-label">Equipment Types</div>
            <div className="analysis-kpi-sub" style={{ color: '#6b7280' }}>Active in system</div>
          </div>
        </div>

        <div className="analysis-kpi-card">
          <div className="analysis-kpi-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="analysis-kpi-body">
            <div className="analysis-kpi-value" style={{ color: '#f97316' }}>8</div>
            <div className="analysis-kpi-label">Hospital Units</div>
            <div className="analysis-kpi-sub" style={{ color: '#6b7280' }}>Connected</div>
          </div>
        </div>

        <div className="analysis-kpi-card">
          <div className="analysis-kpi-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="analysis-kpi-body">
            <div className="analysis-kpi-value" style={{ color: '#a855f7' }}>4</div>
            <div className="analysis-kpi-label">AI Agents</div>
            <div className="analysis-kpi-sub" style={{ color: '#6b7280' }}>Online &amp; Monitoring</div>
          </div>
        </div>

        <div className="analysis-kpi-actions">
          <button className="analysis-action-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Last 30 Days
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button className="analysis-export-btn">
            ↓ Export Report
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="analysis-main">
        {/* ── Left Panel ── */}
        <section className="analysis-left">
          <div className="analysis-section-title">
            <span className="sparkle">✨</span> Search &amp; Analyze
          </div>

          <form onSubmit={handleQuery}>
            <div className="analysis-form-group">
              <label className="analysis-label">Maintenance Query</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="analysis-textarea"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. MRI machine downtime increasing after preventive maintenance..."
                  maxLength={500}
                  rows={4}
                />
                <div className="analysis-char-count">{query.length}/500</div>
              </div>
            </div>

            <div className="analysis-form-group">
              <label className="analysis-label">Equipment Type</label>
              <select className="analysis-select" value={equipmentType} onChange={e => setEquipmentType(e.target.value)}>
                <option value="">All Equipment</option>
                {EQUIPMENT_TYPES.map(eq => <option key={eq}>{eq}</option>)}
              </select>
            </div>

            <div className="analysis-form-group">
              <label className="analysis-label">Hospital Unit</label>
              <select className="analysis-select" value={hospitalUnit} onChange={e => setHospitalUnit(e.target.value)}>
                <option value="">All Units</option>
                {HOSPITAL_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>

            <div className="analysis-form-group">
              <label className="analysis-label">Severity Filter</label>
              <div style={{ position: 'relative' }}>
                <select className="analysis-select" value={severity} onChange={e => setSeverity(e.target.value)}>
                  <option value="">All Severities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                {severity && (
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 8, height: 8, borderRadius: '50%', pointerEvents: 'none',
                    background: SEV_COLORS[severity] || '#94a3b8',
                  }} />
                )}
              </div>
            </div>

            <div className="analysis-form-row">
              <div className="analysis-form-group" style={{ width: 90 }}>
                <label className="analysis-label">Max Results</label>
                <input
                  className="analysis-number"
                  type="number"
                  value={maxResults}
                  min={1}
                  max={20}
                  onChange={e => setMaxResults(Number(e.target.value))}
                />
              </div>
            </div>

            <button className="analysis-run-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="analysis-btn-spinner" />
                  Running Analysis…
                </>
              ) : (
                <>🔍 Run Analysis</>
              )}
            </button>
          </form>

          {/* Example queries */}
          <div className="analysis-examples">
            <div className="analysis-examples-title">Example queries</div>
            <div className="analysis-examples-chips">
              {queryExamples.map(ex => (
                <button key={ex} type="button" className="analysis-example-chip" onClick={() => handleExample(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Quality & Safety Checks */}
          <GuardrailsPanel
            hasQuery={query.trim().length >= 3}
            loading={loading}
            hasResult={!!result}
          />
        </section>

        {/* ── Right Panel ── */}
        <section className="analysis-right">
          <div className="analysis-section-title">
            <span className="sparkle">✨</span> Analysis Results
          </div>

          <AgentPipelineVisualizer loading={loading} result={result} />

          {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

          {loading ? (
            <div className="analysis-loading-state">
              <div className="analysis-spinner" />
              <div style={{ fontWeight: 600, color: '#374151', marginTop: 12 }}>Running AI analysis…</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: 4 }}>Retrieving incidents and generating maintenance recommendations.</div>
            </div>
          ) : result ? (
            <div>
              {/* Success banner */}
              <div className="analysis-success-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>Analysis Completed Successfully</div>
                    <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>Found {totalInc} relevant records matching your query</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#6b7280' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  Completed in 2.3s
                </div>
              </div>

              {/* Severity metric cards */}
              <div className="analysis-severity-row">
                <SeverityCard
                  label="High Severity"
                  count={sevCounts.High}
                  total={totalInc}
                  color="#ef4444"
                  bgColor="#fef2f2"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  }
                />
                <SeverityCard
                  label="Medium Severity"
                  count={sevCounts.Medium}
                  total={totalInc}
                  color="#f59e0b"
                  bgColor="#fffbeb"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  }
                />
                <SeverityCard
                  label="Low Severity"
                  count={sevCounts.Low}
                  total={totalInc}
                  color="#22c55e"
                  bgColor="#f0fdf4"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  }
                />
                <SeverityCard
                  label="Affected Equipment"
                  count={uniqueEquip}
                  total={totalInc}
                  color="#3b82f6"
                  bgColor="#eff6ff"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  }
                />
              </div>

              {/* Charts row */}
              <div className="analysis-charts-row">
                <div className="analysis-chart-card">
                  <div className="analysis-chart-title">Incidents by Severity</div>
                  <DonutChart incidents={incidents} />
                </div>
                <div className="analysis-chart-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="analysis-chart-title" style={{ marginBottom: 0 }}>Incidents Over Time</div>
                    <button className="analysis-daily-btn">Daily ▾</button>
                  </div>
                  <LineChart incidents={incidents} />
                </div>
              </div>

              {/* Insights table */}
              <div className="analysis-insights-section">
                <div className="analysis-insights-title">Top Relevant Insights</div>
                <InsightsTable incidents={incidents} />
              </div>

              {/* ── Recommendation ── */}
              {result.recommendation && (
                <div className="ar-section">
                  <button className="ar-accordion-header" onClick={() => toggleSection('recommendation')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span className="ar-accordion-title">AI Recommendation</span>
                    <span className="ar-confidence-pill">Confidence: {Math.round((result.confidence_score ?? 0) * 100)}%</span>
                    <svg className={`ar-chevron${expanded.recommendation ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expanded.recommendation && (
                    <div className="ar-accordion-body">
                      <div className="ar-recommendation-box">{result.recommendation}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Maintenance Plan ── */}
              {result.maintenance_plan && (
                <div className="ar-section">
                  <button className="ar-accordion-header" onClick={() => toggleSection('plan')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <span className="ar-accordion-title">Maintenance Plan</span>
                    <span className="ar-priority-pill" style={{
                      background: result.maintenance_plan.priority_level === 'Critical' ? '#fef2f2' : result.maintenance_plan.priority_level === 'High' ? '#fff7ed' : result.maintenance_plan.priority_level === 'Medium' ? '#fffbeb' : '#f0fdf4',
                      color: result.maintenance_plan.priority_level === 'Critical' ? '#ef4444' : result.maintenance_plan.priority_level === 'High' ? '#f97316' : result.maintenance_plan.priority_level === 'Medium' ? '#f59e0b' : '#22c55e',
                    }}>
                      {result.maintenance_plan.priority_level} Priority · {result.maintenance_plan.estimated_downtime_hours}h downtime
                    </span>
                    <svg className={`ar-chevron${expanded.plan ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expanded.plan && (
                    <div className="ar-accordion-body">
                      <div className="ar-plan-grid">
                        {result.maintenance_plan.immediate_actions?.length > 0 && (
                          <div className="ar-plan-col">
                            <div className="ar-plan-col-title" style={{ color: '#ef4444' }}>⚡ Immediate (24h)</div>
                            <ul className="ar-action-list">{result.maintenance_plan.immediate_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                          </div>
                        )}
                        {result.maintenance_plan.short_term_actions?.length > 0 && (
                          <div className="ar-plan-col">
                            <div className="ar-plan-col-title" style={{ color: '#f59e0b' }}>📅 Short-term (1–2 weeks)</div>
                            <ul className="ar-action-list">{result.maintenance_plan.short_term_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                          </div>
                        )}
                        {result.maintenance_plan.long_term_actions?.length > 0 && (
                          <div className="ar-plan-col">
                            <div className="ar-plan-col-title" style={{ color: '#22c55e' }}>🗓 Long-term (1–3 months)</div>
                            <ul className="ar-action-list">{result.maintenance_plan.long_term_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                          </div>
                        )}
                      </div>
                      {result.maintenance_plan.parts_to_inspect?.length > 0 && (
                        <div className="ar-parts-row">
                          <span className="ar-parts-label">Components to Inspect:</span>
                          {result.maintenance_plan.parts_to_inspect.map((p, i) => <span key={i} className="ar-part-tag">{p}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Top 5 Incident Details ── */}
              {incidents.length > 0 && (
                <div className="ar-section">
                  <button className="ar-accordion-header" onClick={() => toggleSection('incidents')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="ar-accordion-title">Incident Details</span>
                    <span className="ar-confidence-pill" style={{ background: '#f5f3ff', color: '#6366f1', borderColor: '#e0e7ff' }}>
                      Top {Math.min(incidents.length, 5)} records
                    </span>
                    <svg className={`ar-chevron${expanded.incidents ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expanded.incidents && (
                  <div className="ar-accordion-body">
                  <div className="ar-incidents-list">
                    {incidents.slice(0, 5).map((inc, i) => {
                      const sev = inc.severity || 'Low';
                      const sevColor = SEV_COLORS[sev] || '#64748b';
                      const sevBg = sev === 'High' ? '#fef2f2' : sev === 'Medium' ? '#fffbeb' : sev === 'Low' ? '#f0fdf4' : '#f5f3ff';
                      return (
                        <div key={i} className="ar-incident-card" style={{ borderLeft: `4px solid ${sevColor}` }}>
                          <div className="ar-incident-header">
                            <span className="ar-incident-id">{inc.machine_id}</span>
                            <span className="equipment-badge">{inc.equipment_type}</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{inc.hospital_unit}</span>
                            <span className="severity-badge" style={{ background: sevBg, color: sevColor, border: `1px solid ${sevColor}22`, marginLeft: 'auto' }}>{sev}</span>
                            {inc.machine_failure && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 8 }}>FAILED</span>
                            )}
                          </div>
                          <div className="ar-incident-narrative">{inc.incident_narrative}</div>
                          <div className="ar-incident-meta-row">
                            <span>🔧 {inc.failure_type}</span>
                            <span>🌡 {inc.process_temperature_k?.toFixed(1)}K</span>
                            <span>⚙ {inc.rotational_speed_rpm?.toFixed(0)} RPM</span>
                            <span>📊 Wear: {inc.tool_wear_min?.toFixed(0)} min</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                  )}
                </div>
              )}

              {/* Legacy panels hidden but preserved for API data */}
              <div style={{ display: 'none' }}>
                <RetrievedIncidentsPanel incidents={result.retrieved_incidents} />
                <EvaluationPanel evaluation={result.evaluation_results} />
              </div>
            </div>
          ) : (
            <div className="analysis-empty-state">
              <div className="analysis-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, color: '#6b7280', marginTop: 12 }}>Run an analysis to see results</div>
              <div style={{ fontSize: '0.83rem', color: '#9ca3af', marginTop: 6, maxWidth: 280, textAlign: 'center' }}>
                Use the search panel to retrieve relevant incidents, generate a maintenance plan, and receive AI-powered recommendations.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

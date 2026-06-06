import { useEffect, useState, useMemo } from 'react';

const SEV_COLORS = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#a855f7',
};

/* ── KPI Card ── */
function KpiCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className="kpi-card-pro">
      <div className="kpi-card-pro-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="kpi-card-pro-body">
        <div className="kpi-card-pro-value" style={{ color }}>{value}</div>
        <div className="kpi-card-pro-label">{label}</div>
        {sub && <div className="kpi-card-pro-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Stacked Bar Chart (SVG) ── */
function StackedBarChart({ breakdown }) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return <div style={{ color: '#94a3b8', padding: 24 }}>No data available.</div>;

  const n = entries.length;
  const BAR_W = 48;
  const GAP = 28;
  const CHART_H = 220;
  const LEFT_PAD = 48;
  const RIGHT_PAD = 8;
  const BOTTOM_PAD = 56;
  const TOP_PAD = 16;
  const svgW = LEFT_PAD + n * (BAR_W + GAP) + 16;
  const svgH = CHART_H + BOTTOM_PAD + TOP_PAD;

  const maxTotal = Math.max(...entries.map(([, v]) => (v.Low || 0) + (v.Medium || 0) + (v.High || 0) + (v.Critical || 0)));

  const scaleY = (val) => (val / (maxTotal || 1)) * CHART_H;

  // Y-axis gridlines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxTotal * f));

  // Totals for summary row
  let totalHigh = 0, totalMed = 0, totalLow = 0;
  entries.forEach(([, v]) => {
    totalHigh += v.High || 0;
    totalMed += v.Medium || 0;
    totalLow += v.Low || 0;
  });

  // Scale the rendered width proportionally to how many bars are shown,
  // so 2 bars don't stretch across a full-width container.
  const MAX_CONTAINER_W = 700;
  const MIN_BAR_CONTAINER_W = 180;
  const renderedW = Math.max(MIN_BAR_CONTAINER_W, Math.min(MAX_CONTAINER_W, n * (BAR_W + GAP) + LEFT_PAD + RIGHT_PAD + 16));

  return (
    <div className="stacked-chart-wrap">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width={renderedW}
        style={{ display: 'block', maxWidth: '100%' }}
        aria-label="Stacked bar chart of equipment severity"
      >
        {/* Gridlines */}
        {yTicks.map((tick, i) => {
          const y = TOP_PAD + CHART_H - scaleY(tick);
          return (
            <g key={i}>
              <line x1={LEFT_PAD} y1={y} x2={svgW - RIGHT_PAD} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
              <text x={LEFT_PAD - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{tick}</text>
            </g>
          );
        })}

        {/* Bars */}
        {entries.map(([label, v], idx) => {
          const x = LEFT_PAD + idx * (BAR_W + GAP);
          const segments = [
            { key: 'High', val: v.High || 0, color: SEV_COLORS.High },
            { key: 'Medium', val: v.Medium || 0, color: SEV_COLORS.Medium },
            { key: 'Low', val: v.Low || 0, color: SEV_COLORS.Low },
            { key: 'Critical', val: v.Critical || 0, color: SEV_COLORS.Critical },
          ];

          let yOffset = TOP_PAD + CHART_H;
          const rects = [];
          segments.forEach(({ key, val, color }) => {
            if (!val) return;
            const h = scaleY(val);
            yOffset -= h;
            rects.push(
              <g key={key}>
                <rect x={x} y={yOffset} width={BAR_W} height={h} fill={color} rx={key === 'Low' || key === 'Critical' ? 3 : 0} />
                {h > 14 && (
                  <text x={x + BAR_W / 2} y={yOffset + h / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">
                    {val}
                  </text>
                )}
              </g>
            );
          });

          // X-axis label — centered on bar, split long names
          const words = label.split(' ');
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');

          return (
            <g key={label}>
              {rects}
              <text x={x + BAR_W / 2} y={TOP_PAD + CHART_H + 16} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="500">
                {line1}
              </text>
              {line2 && (
                <text x={x + BAR_W / 2} y={TOP_PAD + CHART_H + 28} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="500">
                  {line2}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        {[['High', SEV_COLORS.High], ['Medium', SEV_COLORS.Medium], ['Low', SEV_COLORS.Low], ['Critical', SEV_COLORS.Critical]].map(([lbl, clr], i) => (
          <g key={lbl} transform={`translate(${LEFT_PAD + i * 92}, ${svgH - 14})`}>
            <rect width="10" height="10" fill={clr} rx="2" />
            <text x="14" y="9" fontSize="10" fill="#64748b">{lbl}</text>
          </g>
        ))}
      </svg>

      <div className="stacked-chart-summary">
        <span style={{ color: SEV_COLORS.High }}>Total High Risk: <strong>{totalHigh}</strong></span>
        <span style={{ color: SEV_COLORS.Medium }}>Total Medium Risk: <strong>{totalMed}</strong></span>
        <span style={{ color: SEV_COLORS.Low }}>Total Low Risk: <strong>{totalLow}</strong></span>
      </div>
    </div>
  );
}

/* ── Line Chart (SVG) — 7-day simulated trend ── */
function LineChart({ severityCounts }) {
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

  const series = useMemo(() => {
    const vary = (base, idx) => {
      const seed = (idx * 37 + base) % 17;
      const delta = Math.round(base * 0.1 * ((seed - 8) / 8));
      return Math.max(0, base + delta);
    };
    return [
      { label: 'High Risk', color: SEV_COLORS.High, base: severityCounts.High || 0 },
      { label: 'Medium Risk', color: SEV_COLORS.Medium, base: severityCounts.Medium || 0 },
      { label: 'Low Risk', color: SEV_COLORS.Low, base: severityCounts.Low || 0 },
    ].map(s => ({
      ...s,
      values: days.map((_, i) => vary(s.base, i)),
    }));
  }, [severityCounts, days]);

  const W = 480, H = 170, PAD_L = 44, PAD_B = 34, PAD_T = 10, PAD_R = 12;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;

  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);

  const px = (i) => PAD_L + (i / (days.length - 1)) * chartW;
  const py = (v) => PAD_T + chartH - (v / maxVal) * chartH;

  const toPath = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <div style={{ width: '100%' }}>
      {/* Legend — outside SVG so it never overlaps the lines */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
            <svg width="20" height="10" style={{ flexShrink: 0 }}>
              <line x1="0" y1="5" x2="20" y2="5" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="10" cy="5" r="3" fill={s.color} />
            </svg>
            {s.label}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          {/* Gridlines */}
          {yTicks.map((t, i) => {
            const y = py(t);
            return (
              <g key={i}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{t}</text>
              </g>
            );
          })}

          {/* Lines */}
          {series.map(s => (
            <g key={s.label}>
              <path d={toPath(s.values)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={px(i)} cy={py(v)} r="3.5" fill={s.color} />
              ))}
            </g>
          ))}

          {/* X-axis labels */}
          {days.map((d, i) => (
            <text key={d} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">{d}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ── Light Donut Chart ── */
function DonutChartLight({ data, colorMap }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <div style={{ color: '#94a3b8', padding: 16 }}>No data.</div>;

  let cum = 0;
  const stops = entries.map(([label, val]) => {
    const pct = (val / total) * 100;
    const color = colorMap?.[label] ?? '#94a3b8';
    const stop = `${color} ${cum.toFixed(1)}% ${(cum + pct).toFixed(1)}%`;
    cum += pct;
    return { label, val, pct, color, stop };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{
        width: 140, height: 140, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${stops.map(s => s.stop).join(', ')})`,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 86, height: 86, background: '#f1f5f9', borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{total.toLocaleString()}</div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>TOTAL</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 120 }}>
        {stops.map(({ label, val, pct, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#475569', fontWeight: 500 }}>{label}</span>
            <span style={{ fontWeight: 700, color: '#1e293b', minWidth: 36, textAlign: 'right' }}>{val}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', minWidth: 36, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export function MainDashboard({ user, filters = {}, onFilterChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.equipment_type) params.set('equipment_type', filters.equipment_type);
    (filters.hospital_units ?? []).forEach(u => params.append('hospital_unit', u));
    const qs = params.toString();

    fetch(`/api/dashboard-filter${qs ? '?' + qs : ''}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters.equipment_type, filters.hospital_unit]);

  const sevDist = data?.severity_distribution ?? {};
  const totalRecords = data?.total_records ?? 0;
  const breakdown = data?.breakdown ?? {};

  const low = sevDist.Low || 0;
  const medium = sevDist.Medium || 0;
  const high = sevDist.High || 0;
  const critical = sevDist.Critical || 0;

  const pct = (n) => totalRecords > 0 ? ` (${((n / totalRecords) * 100).toFixed(1)}%)` : '';
  const hasFilters = filters.equipment_type || (filters.hospital_units ?? []).length > 0;
  const selectedUnits = filters.hospital_units ?? [];

  // Top 5 critical equipment from breakdown
  const topCritical = useMemo(() => {
    return Object.entries(breakdown)
      .map(([name, v]) => {
        const total = (v.Low || 0) + (v.Medium || 0) + (v.High || 0) + (v.Critical || 0);
        const riskCount = (v.High || 0) + (v.Critical || 0);
        const score = total > 0 ? Math.round((riskCount / total) * 100) : 0;
        const level = (v.High || 0) >= (v.Medium || 0) ? 'High' : 'Medium';
        return { name, score, level, riskCount, total };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [breakdown]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const isLoading = loading;

  return (
    <div className="main-dashboard">
      {/* Top header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-header-title">Equipment Risk Monitoring</h1>
          <p className="dash-header-sub">Live overview of hospital equipment health and risk status</p>
        </div>
        <div className="dash-header-right">
          <span className="dash-date">{today}</span>
          <button className="dash-bell" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="dash-bell-dot" />
          </button>
          <div className="dash-hospital">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            City Care Hospital
          </div>
        </div>
      </div>

      {/* Active filter banner */}
      {hasFilters && (
        <div className="dash-filter-banner">
          <span className="dash-filter-banner-icon">🔽</span>
          <span>Filtered by:&nbsp;
            {filters.equipment_type && <strong>{filters.equipment_type}</strong>}
            {filters.equipment_type && selectedUnits.length > 0 && ' · '}
            {selectedUnits.length > 0 && <strong>{selectedUnits.join(', ')}</strong>}
          </span>
          <span className="dash-filter-banner-count">{totalRecords.toLocaleString()} records match</span>
          <button
            className="dash-filter-clear"
            onClick={() => onFilterChange({ equipment_type: '', hospital_units: [] })}
          >
            ✕ Clear filters
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 14 }}>
          <div className="spinner" style={{ borderTopColor: '#3b82f6' }} />
          <p style={{ color: '#94a3b8' }}>Loading dashboard data…</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="kpi-row">
            <KpiCard
              label="Total Equipment"
              value={totalRecords.toLocaleString()}
              sub="All equipment records"
              color="#3b82f6"
              bg="#eff6ff"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              }
            />
            <KpiCard
              label="Low Risk / Healthy"
              value={low.toLocaleString()}
              sub={`${pct(low)} of total`}
              color="#22c55e"
              bg="#f0fdf4"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            />
            <KpiCard
              label="Medium Risk"
              value={medium.toLocaleString()}
              sub={`${pct(medium)} of total`}
              color="#f59e0b"
              bg="#fffbeb"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              }
            />
            <KpiCard
              label="High Risk"
              value={high.toLocaleString()}
              sub={`${pct(high)} of total`}
              color="#ef4444"
              bg="#fef2f2"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              }
            />
            <KpiCard
              label="Critical / Maintenance"
              value={critical.toLocaleString()}
              sub={`${pct(critical)} of total`}
              color="#a855f7"
              bg="#faf5ff"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              }
            />
          </div>

          {/* Middle section */}
          <div className="dash-mid-row">
            {/* Stacked bar chart */}
            <div className="dash-card dash-mid-left">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Equipment Severity Analysis</h3>
                <span className="dash-card-badge">By Equipment Type</span>
              </div>
              <StackedBarChart breakdown={breakdown} />
            </div>

            {/* AI Insights */}
            <div className="ai-insights-panel">
              <div className="ai-insights-header">
                <h3 className="ai-insights-title">AI Insights</h3>
                <span className="ai-insights-sub">Top Critical Equipment</span>
              </div>
              {topCritical.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '12px 0' }}>No data available.</p>
              ) : (
                <table className="risk-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Risk Score</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCritical.map(item => (
                      <tr key={item.name}>
                        <td className="risk-table-name">{item.name}</td>
                        <td className="risk-table-score">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.score}%`, background: item.level === 'High' ? '#ef4444' : '#f59e0b', borderRadius: 3 }} />
                            </div>
                            <span style={{ minWidth: 30, fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>{item.score}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`risk-badge risk-badge-${item.level.toLowerCase()}`}>{item.level}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <a href="#" className="ai-insights-link" onClick={e => e.preventDefault()}>View All Alerts &rarr;</a>
            </div>
          </div>

          {/* Bottom section */}
          <div className="dash-bottom-row">
            {/* Line chart */}
            <div className="dash-card dash-bottom-left">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Risk Trend Over Time</h3>
                <span className="dash-card-badge">Last 7 Days</span>
              </div>
              <LineChart severityCounts={{ High: high, Medium: medium, Low: low }} />
            </div>

            {/* Donut chart */}
            <div className="dash-card dash-bottom-mid">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Risk Distribution</h3>
              </div>
              <DonutChartLight
                data={{ Low: low, Medium: medium, High: high, Critical: critical }}
                colorMap={SEV_COLORS}
              />
            </div>

            {/* Recommended Actions */}
            <div className="recommended-actions">
              <h3 className="recommended-actions-title">Recommended Actions</h3>
              <div className="action-item action-item-high">
                <div className="action-item-header">
                  <span className="action-item-dot" style={{ background: '#ef4444' }} />
                  <span className="action-item-priority">High Priority</span>
                </div>
                <p className="action-item-desc">{high} equipment require immediate inspection</p>
                <button className="action-item-btn" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>View</button>
              </div>
              <div className="action-item action-item-med">
                <div className="action-item-header">
                  <span className="action-item-dot" style={{ background: '#f59e0b' }} />
                  <span className="action-item-priority">Medium Priority</span>
                </div>
                <p className="action-item-desc">{medium} equipment require preventive maintenance</p>
                <button className="action-item-btn" style={{ background: '#fffbeb', color: '#f59e0b', borderColor: '#fde68a' }}>View</button>
              </div>
              <div className="action-item action-item-low">
                <div className="action-item-header">
                  <span className="action-item-dot" style={{ background: '#22c55e' }} />
                  <span className="action-item-priority">Low Priority</span>
                </div>
                <p className="action-item-desc">{low} equipment operating normally</p>
                <button className="action-item-btn" style={{ background: '#f0fdf4', color: '#22c55e', borderColor: '#bbf7d0' }}>View</button>
              </div>
              <a href="#" className="ai-insights-link" style={{ display: 'block', marginTop: 12 }} onClick={e => e.preventDefault()}>
                View All Recommendations &rarr;
              </a>
            </div>
          </div>

          {/* Real Metrics Bar — computed from actual data */}
          {(() => {
            const healthyPct = totalRecords > 0 ? ((low / totalRecords) * 100).toFixed(1) : '0';
            const highRiskPct = totalRecords > 0 ? (((high + critical) / totalRecords) * 100).toFixed(1) : '0';
            const failureCount = (data?.failure_type_distribution ?? {});
            const activeFailures = Object.entries(failureCount).filter(([k]) => k !== 'Routine Maintenance Check').reduce((s, [, v]) => s + v, 0);
            const failureTypes = Object.keys(data?.failure_type_distribution ?? {}).filter(k => k !== 'Routine Maintenance Check').length;
            const unitCount = Object.keys(data?.hospital_unit_distribution ?? {}).length;
            const eqCount = Object.keys(data?.equipment_type_distribution ?? {}).length;
            return (
              <div className="business-impact-bar">
                <div className="impact-metric">
                  <div className="impact-metric-icon" style={{ color: '#22c55e' }}>✅</div>
                  <div>
                    <div className="impact-metric-value" style={{ color: '#22c55e' }}>{healthyPct}%</div>
                    <div className="impact-metric-label">Equipment Healthy (Low Risk)</div>
                  </div>
                </div>
                <div className="impact-divider" />
                <div className="impact-metric">
                  <div className="impact-metric-icon" style={{ color: '#ef4444' }}>⚠️</div>
                  <div>
                    <div className="impact-metric-value" style={{ color: '#ef4444' }}>{highRiskPct}%</div>
                    <div className="impact-metric-label">High / Critical Risk Rate</div>
                  </div>
                </div>
                <div className="impact-divider" />
                <div className="impact-metric">
                  <div className="impact-metric-icon" style={{ color: '#f59e0b' }}>🔧</div>
                  <div>
                    <div className="impact-metric-value" style={{ color: '#f59e0b' }}>{activeFailures.toLocaleString()}</div>
                    <div className="impact-metric-label">Active Failure Incidents</div>
                  </div>
                </div>
                <div className="impact-divider" />
                <div className="impact-metric">
                  <div className="impact-metric-icon" style={{ color: '#8b5cf6' }}>📋</div>
                  <div>
                    <div className="impact-metric-value" style={{ color: '#8b5cf6' }}>{failureTypes}</div>
                    <div className="impact-metric-label">Failure Types Detected</div>
                  </div>
                </div>
                <div className="impact-divider" />
                <div className="impact-metric">
                  <div className="impact-metric-icon" style={{ color: '#3b82f6' }}>🏥</div>
                  <div>
                    <div className="impact-metric-value" style={{ color: '#3b82f6' }}>{eqCount} types · {unitCount} units</div>
                    <div className="impact-metric-label">Coverage</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

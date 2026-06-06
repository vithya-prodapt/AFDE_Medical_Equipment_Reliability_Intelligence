
/* ── Static Report Data ── */
const AVAIL_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const AVAIL_VALUES = [97.2, 97.8, 98.1, 97.9, 98.3, 98.5];

const INCIDENTS_SEV = [
  { label: 'Critical', value: 47,  color: '#ef4444' },
  { label: 'High',     value: 98,  color: '#f97316' },
  { label: 'Medium',   value: 118, color: '#f59e0b' },
  { label: 'Low',      value: 45,  color: '#22c55e' },
];

const MAINT_SEV = [
  { label: 'Preventive', value: 180, color: '#3b82f6' },
  { label: 'Corrective', value: 98,  color: '#f97316' },
  { label: 'Emergency',  value: 62,  color: '#ef4444' },
  { label: 'Routine',    value: 47,  color: '#22c55e' },
];

const TOP_EQUIP = [
  { label: 'MRI System',      hours: 48, color: '#3b82f6' },
  { label: 'CT Scanner',      hours: 35, color: '#6366f1' },
  { label: 'Ventilator',      hours: 28, color: '#8b5cf6' },
  { label: 'X-Ray Machine',   hours: 22, color: '#a78bfa' },
  { label: 'Patient Monitor', hours: 18, color: '#c4b5fd' },
];

const DOWNTIME_EQ = [
  { label: 'MRI',       hours: 48 },
  { label: 'CT Scan',   hours: 35 },
  { label: 'Ventilator',hours: 28 },
  { label: 'Inf.Pump',  hours: 18 },
  { label: 'Pat.Mon',   hours: 22 },
  { label: 'Ultrasound',hours: 15 },
];

const TREND_MONTHS    = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const TREND_INCIDENTS = [52, 48, 62, 55, 47, 44];
const TREND_MAINT     = [67, 72, 65, 78, 80, 71];
const TREND_DOWNTIME  = [12, 10, 14, 11,  9,  8];

const DEPARTMENTS = [
  { name: 'ICU Ward A',     incidents: 12, avail: 96.2, status: 'Good' },
  { name: 'Radiology Dept', incidents: 8,  avail: 98.5, status: 'Excellent' },
  { name: 'Emergency Dept', incidents: 18, avail: 92.4, status: 'Fair' },
  { name: 'Surgical Unit',  incidents: 6,  avail: 99.1, status: 'Excellent' },
  { name: 'Cardiac Care',   incidents: 10, avail: 97.3, status: 'Good' },
  { name: 'Oncology Unit',  incidents: 14, avail: 94.8, status: 'Good' },
];

const STATUS_COLOR = { Excellent: '#22c55e', Good: '#3b82f6', Fair: '#f59e0b', Poor: '#ef4444' };
const STATUS_BG    = { Excellent: '#dcfce7', Good: '#dbeafe', Fair: '#fef3c7', Poor: '#fee2e2' };

const MTTR_SPARK = [4.2, 3.9, 4.5, 3.7, 4.1, 3.8];

/* ── Card wrapper ── */
const card = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 18px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
};

/* ── Donut Chart ── */
function DonutChart({ data, total, centerLabel, size = 150 }) {
  const r = size * 0.35;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        {data.map((d, i) => {
          const seg = (d.value / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={d.color} strokeWidth={size * 0.13}
              strokeDasharray={`${seg} ${circ - seg}`}
              strokeDashoffset={-cum}
            />
          );
          cum += seg;
          return el;
        })}
      </g>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.17} fontWeight="700" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={size * 0.09} fill="#64748b">{centerLabel}</text>
    </svg>
  );
}

/* ── Sparkline ── */
function Sparkline({ values, color = '#3b82f6', w = 100, h = 36 }) {
  const mn = Math.min(...values), mx = Math.max(...values);
  const rng = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 2 - ((v - mn) / rng) * (h - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Line Chart (Availability Trend) ── */
function LineChart({ months, values, color = '#3b82f6', label = '%', h = 120, minY, maxY }) {
  const W = 400, H = h;
  const PAD = { t: 16, r: 12, b: 28, l: 40 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const mn = minY ?? Math.floor(Math.min(...values) - 0.5);
  const mx = maxY ?? Math.ceil(Math.max(...values) + 0.5);
  const rng = mx - mn || 1;
  const px = (i) => PAD.l + (i / (months.length - 1)) * innerW;
  const py = (v) => PAD.t + innerH - ((v - mn) / rng) * innerH;
  const pts = values.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const area = `M ${px(0)},${py(values[0])} ` +
    values.map((v, i) => `L ${px(i)},${py(v)}`).join(' ') +
    ` L ${px(values.length - 1)},${PAD.t + innerH} L ${px(0)},${PAD.t + innerH} Z`;
  const ticks = [mn, (mn + mx) / 2, mx];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {/* grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={py(t)} y2={py(t)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
          <text x={PAD.l - 6} y={py(t)} textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="#94a3b8">{t.toFixed(1)}{label}</text>
        </g>
      ))}
      {/* area fill */}
      <path d={area} fill={color} opacity="0.1" />
      {/* line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* dots */}
      {values.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r="3.5" fill={color} />
      ))}
      {/* x labels */}
      {months.map((m, i) => (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

/* ── Multi-Line Trend Chart ── */
function MultiLineChart({ months, series, h = 130 }) {
  const W = 380, H = h;
  const PAD = { t: 10, r: 12, b: 26, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const allVals = series.flatMap(s => s.values);
  const mn = Math.min(...allVals), mx = Math.max(...allVals);
  const rng = mx - mn || 1;
  const px = (i) => PAD.l + (i / (months.length - 1)) * innerW;
  const py = (v) => PAD.t + innerH - ((v - mn) / rng) * innerH;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {[0, 0.5, 1].map((frac, i) => {
        const v = mn + frac * rng;
        return (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 2" />
            <text x={PAD.l - 4} y={py(v)} textAnchor="end" dominantBaseline="middle"
              fontSize="8" fill="#94a3b8">{Math.round(v)}</text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${px(i)},${py(v)}`).join(' ');
        return (
          <polyline key={si} points={pts} fill="none" stroke={s.color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
      {months.map((m, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

/* ── Vertical Bar Chart ── */
function BarChart({ data, h = 130 }) {
  const W = 380, H = h;
  const PAD = { t: 10, r: 8, b: 36, l: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const mx = Math.max(...data.map(d => d.hours));
  const barW = innerW / data.length * 0.55;
  const gap   = innerW / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + innerH} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} stroke="#e2e8f0" strokeWidth="1" />
      {data.map((d, i) => {
        const barH = (d.hours / mx) * innerH;
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const y = PAD.t + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#3b82f6" rx="3" opacity="0.85" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill="#64748b">{d.hours}h</text>
            <text x={x + barW / 2} y={PAD.t + innerH + 14} textAnchor="middle" fontSize="7.5" fill="#94a3b8"
              style={{ fontSize: 7 }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Horizontal Progress Bars ── */
function HorizBars({ data }) {
  const mx = Math.max(...data.map(d => d.hours));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.hours}h</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.hours / mx) * 100}%`, height: '100%',
              background: d.color, borderRadius: 4,
              transition: 'width 0.4s',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Reports Page ── */
export function Reports() {

  const kpiCards = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
      label: 'Total Equipment',
      value: '3,000',
      sub: 'Across all facilities',
      color: '#3b82f6', bg: '#dbeafe',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      label: 'Equipment Availability',
      value: '98.5%',
      sub: '↑ 0.3% vs last month',
      color: '#22c55e', bg: '#dcfce7',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      label: 'Critical Risk Rate',
      value: '6.0%',
      sub: '↑ 1.2% vs last week',
      color: '#f59e0b', bg: '#fef3c7',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      label: 'Completed',
      value: '387',
      sub: 'Maintenance tasks',
      color: '#3b82f6', bg: '#dbeafe',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      label: 'Incidents Reported',
      value: '308',
      sub: 'Total period',
      color: '#ef4444', bg: '#fee2e2',
    },
  ];

  return (
    <div style={{ padding: '20px 24px', background: '#f1f5f9', minHeight: '100vh', overflowY: 'auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Reports</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            Comprehensive insight and performance analytics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Export */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: k.bg, color: k.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 11.5, color: '#475569', marginTop: 1 }}>{k.label}</div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Availability Trend | Incidents Donut | MTTR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 0.9fr', gap: 14, marginBottom: 14 }}>

        {/* Availability Trend */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Equipment Availability Trend</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Last 6 Months</div>
            </div>
            <span style={{
              background: '#dcfce7', color: '#16a34a', borderRadius: 6,
              padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>↑ Stable</span>
          </div>
          <LineChart months={AVAIL_MONTHS} values={AVAIL_VALUES}
            color="#3b82f6" label="%" h={120} minY={96} maxY={100} />
        </div>

        {/* Incidents by Severity */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10, alignSelf: 'flex-start' }}>
            Incidents by Severity
          </div>
          <DonutChart data={INCIDENTS_SEV} total={308} centerLabel="Total" size={140} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {INCIDENTS_SEV.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11.5, color: '#475569' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1e293b' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MTTR */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>MTTR</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Mean Time To Repair</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>3.8</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>hrs average</div>
            <div style={{ margin: '16px 0 8px' }}>
              <Sparkline values={MTTR_SPARK} color="#3b82f6" w={120} h={40} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>6-month trend</div>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 10 }}>
            {[
              { label: 'Best',  value: '2.1h', color: '#22c55e' },
              { label: 'Worst', value: '6.4h', color: '#ef4444' },
              { label: 'Target','value': '≤ 4h', color: '#3b82f6' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Downtime Bar | Maintenance Donut | Top Equipment ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Downtime Analysis */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>Downtime Analysis</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Hours per equipment type</div>
          <BarChart data={DOWNTIME_EQ} h={140} />
        </div>

        {/* Maintenance Summary */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10, alignSelf: 'flex-start' }}>
            Maintenance Summary
          </div>
          <DonutChart data={MAINT_SEV} total={387} centerLabel="Total" size={140} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {MAINT_SEV.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11.5, color: '#475569' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1e293b' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Equipment by Downtime */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>Top Equipment by Downtime</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Total downtime hours this period</div>
          <HorizBars data={TOP_EQUIP} />
        </div>
      </div>

      {/* ── Row 3: Monthly Trend | Dept Table | Cost Analysis ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {/* Monthly Trend Overview */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>Monthly Trend Overview</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Jan – Jun 2025</div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Incidents',    color: '#ef4444' },
              { label: 'Maintenance',  color: '#3b82f6' },
              { label: 'Downtime Days',color: '#22c55e' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 22, height: 2.5, background: l.color, borderRadius: 2, display: 'inline-block' }} />
                <span style={{ fontSize: 10.5, color: '#64748b' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <MultiLineChart months={TREND_MONTHS} h={130} series={[
            { values: TREND_INCIDENTS,  color: '#ef4444' },
            { values: TREND_MAINT,      color: '#3b82f6' },
            { values: TREND_DOWNTIME,   color: '#22c55e' },
          ]} />
        </div>

        {/* Department Performance */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Department Performance</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Department', 'Incidents', 'Availability', 'Status'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0 8px 8px 0',
                    fontSize: 10.5, color: '#94a3b8', fontWeight: 600,
                    borderBottom: '1px solid #f1f5f9',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '7px 8px 7px 0', color: '#334155', fontWeight: 500 }}>{d.name}</td>
                  <td style={{ padding: '7px 8px 7px 0', color: '#64748b', textAlign: 'center' }}>{d.incidents}</td>
                  <td style={{ padding: '7px 8px 7px 0', color: '#334155', textAlign: 'center' }}>{d.avail}%</td>
                  <td style={{ padding: '7px 0' }}>
                    <span style={{
                      display: 'inline-block',
                      background: STATUS_BG[d.status], color: STATUS_COLOR[d.status],
                      borderRadius: 5, padding: '1px 8px', fontSize: 10.5, fontWeight: 600,
                    }}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost Analysis */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Cost Analysis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total Maintenance Cost', value: '₹2.45M', color: '#3b82f6', bg: '#dbeafe',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
              { label: 'Cost Savings Achieved',  value: '₹1.72M', color: '#22c55e', bg: '#dcfce7',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
              { label: 'Emergency Repair Cost',  value: '₹0.73M', color: '#ef4444', bg: '#fee2e2',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { label: 'Preventive Care Cost',   value: '₹0.32M', color: '#f59e0b', bg: '#fef3c7',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
            ].map((c, i) => (
              <div key={i} style={{
                background: c.bg, borderRadius: 10, padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ color: c.color }}>{c.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.3 }}>{c.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: '10px 12px',
            background: '#f8fafc', borderRadius: 8,
            fontSize: 11, color: '#64748b',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>ROI on Preventive Maintenance</span>
            <span style={{ fontWeight: 700, color: '#22c55e' }}>+68.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

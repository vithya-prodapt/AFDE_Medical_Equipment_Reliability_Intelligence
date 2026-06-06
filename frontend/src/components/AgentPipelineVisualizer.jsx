import { useEffect, useState } from 'react';

const AGENTS = [
  {
    id: 'retrieval',
    icon: '🔍',
    name: 'Incident Retrieval',
    desc: 'Searching equipment records',
    getOutput: (r) =>
      r ? `${r.retrieved_incidents?.length ?? 0} incidents found` : null,
  },
  {
    id: 'reliability',
    icon: '📊',
    name: 'Reliability Analysis',
    desc: 'Analyzing failure patterns',
    getOutput: (r) =>
      r
        ? `Risk: ${r.reliability_analysis?.risk_level ?? '—'} · Health: ${Math.round((r.reliability_analysis?.equipment_health_score ?? 0) * 100)}%`
        : null,
  },
  {
    id: 'maintenance',
    icon: '🔧',
    name: 'Maintenance Planning',
    desc: 'Generating action plan',
    getOutput: (r) =>
      r
        ? `Priority: ${r.maintenance_plan?.priority_level ?? '—'} · ${r.maintenance_plan?.estimated_downtime_hours ?? '—'}h downtime`
        : null,
  },
  {
    id: 'recommendation',
    icon: '💡',
    name: 'Recommendations',
    desc: 'Producing insights',
    getOutput: (r) =>
      r ? `Confidence: ${Math.round((r.confidence_score ?? 0) * 100)}%` : null,
  },
];

export function AgentPipelineVisualizer({ loading, result }) {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    if (!loading) {
      setActiveIdx(-1);
      return;
    }
    setActiveIdx(0);
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % AGENTS.length;
      setActiveIdx(i);
    }, 900);
    return () => clearInterval(t);
  }, [loading]);

  if (!loading && !result) return null;

  return (
    <div className="agent-pipeline">
      <div className="section-label">Analysis Pipeline</div>
      <div className="pipeline-steps">
        {AGENTS.map((agent, idx) => {
          let status = 'idle';
          if (result) {
            status = 'done';
          } else if (loading) {
            if (idx < activeIdx) status = 'done';
            else if (idx === activeIdx) status = 'running';
          }

          const output = agent.getOutput(result);

          return (
            <div key={agent.id} className={`pipeline-step step-${status}`}>
              <div className="pipeline-icon">{agent.icon}</div>
              <div className="pipeline-info">
                <div className="pipeline-name">{agent.name}</div>
                <div className="pipeline-desc">{output ?? agent.desc}</div>
              </div>
              <span className={`pipeline-badge badge-${status}`}>
                {status === 'done' ? '✓' : status === 'running' ? '⟳' : '·'}
              </span>
              {idx < AGENTS.length - 1 && (
                <div className="pipeline-arrow">→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

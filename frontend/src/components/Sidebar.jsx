import { useState, useRef, useEffect } from 'react';

const DEPARTMENTS = [
  'ICU Ward A', 'ICU Ward B', 'Emergency Department',
  'Radiology Department', 'Surgical Unit', 'Cardiac Care Unit',
  'Neurology Department', 'Oncology Unit',
];

const EQUIPMENT_TYPES = [
  'MRI System', 'CT Scanner', 'Ventilator', 'Infusion Pump',
  'Patient Monitor', 'Ultrasound Scanner', 'ECG Monitor',
  'Digital X-Ray System', 'Anesthesia Machine', 'Dialysis Machine',
  'Defibrillator', 'PET Scanner',
];

function MultiSelectDropdown({ options, selected, onChange, placeholder = 'All Departments' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onChange(next);
  };

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: selected.length > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${selected.length > 0 ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 6, color: selected.length > 0 ? '#93c5fd' : '#94a3b8',
          fontSize: '0.78rem', padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', cursor: 'pointer',
              background: selected.includes(opt) ? 'rgba(59,130,246,0.18)' : 'transparent',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { if (!selected.includes(opt)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = selected.includes(opt) ? 'rgba(59,130,246,0.18)' : 'transparent'; }}
            >
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                style={{ accentColor: '#3b82f6', width: 13, height: 13, flexShrink: 0 }} />
              <span style={{ fontSize: '0.76rem', color: selected.includes(opt) ? '#93c5fd' : '#94a3b8' }}>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user, activeNav, onNav, onLogout, filters, onFilterChange }) {
  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      key: 'analysis', label: 'Analyze', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      key: 'reports', label: 'Reports', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  const selectedUnits = filters?.hospital_units ?? [];
  const hasFilters = filters?.equipment_type || selectedUnits.length > 0;

  const handleNavClick = (item) => {
    onNav(item.key);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">MedReliAI</span>
          <span className="sidebar-logo-sub">Smart Monitoring</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">NAVIGATION</div>
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item${activeNav === item.key ? ' active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Quick Filters */}
      <div className="sidebar-filters">
        <div className="sidebar-filters-header">
          <div className="sidebar-nav-label">QUICK FILTERS</div>
          {hasFilters && (
            <button
              className="sidebar-filter-reset"
              onClick={() => onFilterChange({ equipment_type: '', hospital_units: [] })}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Equipment — single select */}
        <div className="sidebar-filter-group">
          <label className="sidebar-filter-label">Equipment Type</label>
          <select
            className={`sidebar-filter-select${filters?.equipment_type ? ' filter-active' : ''}`}
            value={filters?.equipment_type ?? ''}
            onChange={e => onFilterChange({ ...filters, equipment_type: e.target.value })}
          >
            <option value="">All Equipment</option>
            {EQUIPMENT_TYPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>

        {/* Departments — custom multi-select dropdown */}
        <div className="sidebar-filter-group">
          <label className="sidebar-filter-label">
            Department
            {selectedUnits.length > 0 && (
              <span className="sidebar-filter-count">{selectedUnits.length} selected</span>
            )}
          </label>
          <MultiSelectDropdown
            options={DEPARTMENTS}
            selected={selectedUnits}
            onChange={val => onFilterChange({ ...filters, hospital_units: val })}
          />
        </div>
      </div>

      {/* AI Service Status */}
      <div className="sidebar-ai-status">
        <div className="sidebar-ai-status-header">
          <span className="sidebar-nav-label" style={{ margin: 0 }}>AI SERVICE STATUS</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div className="sidebar-ai-status-row">
          <span className="sidebar-ai-status-dot" />
          <span className="sidebar-ai-status-text">All systems operational</span>
        </div>
        <div className="sidebar-ai-status-time">Last updated: 10:30 AM</div>
      </div>

      {/* User + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.name?.[0] ?? 'U'}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Sign Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          <span className="sidebar-status-text">All Systems Operational</span>
        </div>
      </div>
    </aside>
  );
}

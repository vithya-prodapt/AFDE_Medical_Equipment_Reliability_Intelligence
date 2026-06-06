import { useState } from 'react';

const CREDENTIALS = [
  { key: 'admin',       username: 'admin',       password: 'admin@123',  role: 'Administrator',          name: 'Administrator' },
  { key: 'biomedical',  username: 'biomedical',  password: 'biomed@123', role: 'Biomedical Engineer',    name: 'Biomedical Engineer' },
  { key: 'maintenance', username: 'technician',  password: 'tech@123',   role: 'Maintenance Technician', name: 'Maintenance Technician' },
];

const FEATURES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    color: '#10b981', bg: 'rgba(16,185,129,0.2)',
    title: 'Real-time Monitoring', desc: 'Track equipment health in real-time',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    color: '#f59e0b', bg: 'rgba(245,158,11,0.2)',
    title: 'Predictive Detection', desc: 'AI models predict failures before they happen',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    color: '#3b82f6', bg: 'rgba(59,130,246,0.2)',
    title: 'Risk Analytics', desc: 'Get actionable insights and prioritize what matters',
  },
];

const BADGES = [
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    label: 'HIPAA', sub: 'Compliant',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    label: 'Secure', sub: 'Access',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    label: 'Multi-Factor', sub: 'Authentication',
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    label: 'Audit Logging', sub: 'Enabled',
  },
];

/* AI network nodes — positioned on right side of hero */
function AiNetworkOverlay() {
  return (
    <svg viewBox="0 0 320 380" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', right: 0, top: 0, width: '52%', height: '72%', pointerEvents: 'none', zIndex: 2 }}>

      {/* Connector lines */}
      <line x1="160" y1="130" x2="95"  y2="80"  stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3"/>
      <line x1="160" y1="130" x2="230" y2="72"  stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3"/>
      <line x1="160" y1="130" x2="80"  y2="180" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3"/>
      <line x1="160" y1="130" x2="240" y2="180" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3"/>
      <line x1="160" y1="130" x2="160" y2="220" stroke="rgba(255,255,255,0.3)"  strokeWidth="1" strokeDasharray="4,3"/>
      <line x1="95"  y1="80"  x2="55"  y2="40"  stroke="rgba(255,255,255,0.2)"  strokeWidth="1" strokeDasharray="3,4"/>
      <line x1="230" y1="72"  x2="280" y2="38"  stroke="rgba(255,255,255,0.2)"  strokeWidth="1" strokeDasharray="3,4"/>

      {/* Small dot nodes on lines */}
      {[[130,105],[125,155],[192,105],[195,158],[160,175]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.5)"/>
      ))}

      {/* Centre AI node */}
      <circle cx="160" cy="130" r="38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <circle cx="160" cy="130" r="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <text x="160" y="138" textAnchor="middle" fill="white" fontSize="20" fontWeight="800" fontFamily="sans-serif">AI</text>

      {/* Heartbeat — top-left */}
      <circle cx="95" cy="78" r="24" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
      <polyline points="83,78 87,78 90,68 95,88 100,78 107,78" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>

      {/* Gear — top-right */}
      <circle cx="232" cy="70" r="24" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
      <circle cx="232" cy="70" r="9" fill="none" stroke="white" strokeWidth="1.8"/>
      <circle cx="232" cy="70" r="4" fill="rgba(255,255,255,0.7)"/>

      {/* Alert — left */}
      <circle cx="80" cy="182" r="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <path d="M80 172 l8 16 h-16 z" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="80" y1="178" x2="80" y2="182" stroke="white" strokeWidth="1.8"/>
      <circle cx="80" cy="185" r="1.2" fill="white"/>

      {/* Bar chart — right */}
      <circle cx="242" cy="182" r="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <line x1="234" y1="190" x2="234" y2="178" stroke="white" strokeWidth="2"/>
      <line x1="240" y1="190" x2="240" y2="174" stroke="white" strokeWidth="2"/>
      <line x1="246" y1="190" x2="246" y2="180" stroke="white" strokeWidth="2"/>
      <line x1="252" y1="190" x2="252" y2="176" stroke="white" strokeWidth="2"/>

      {/* Heart — bottom */}
      <circle cx="160" cy="228" r="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <path d="M152 228 c0-5 5-8 8-4 c3-4 8-1 8 4 c0 5-8 10-8 10 c0 0-8-5-8-10z" fill="none" stroke="white" strokeWidth="1.8"/>

      {/* Stethoscope — far top-right small */}
      <circle cx="283" cy="36" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
      <circle cx="283" cy="36" r="6" fill="none" stroke="white" strokeWidth="1.4"/>

      {/* ECG monitor — far top-left small */}
      <circle cx="53"  cy="38" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
      <rect x="44" y="30" width="18" height="14" rx="2" fill="none" stroke="white" strokeWidth="1.2"/>
      <polyline points="46,37 48,37 50,33 52,41 54,37 61,37" fill="none" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}


export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    setTimeout(() => {
      const match = CREDENTIALS.find(
        c => c.username === username.trim() && c.password === password &&
             (!selectedRole || c.role === selectedRole)
      );
      if (match) {
        const user = { key: match.key, name: match.name, role: match.role };
        sessionStorage.setItem('auth_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Invalid credentials. Please check your username, password and role.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="login-shell">

      {/* ── Left hero panel ── */}
      <div className="login-hero">
        <div className="login-hero-overlay" />
        <AiNetworkOverlay />

        {/* Logo top-left */}
        <div className="login-hero-logo">
          <div className="login-hero-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <div className="login-hero-brand">HealthCare</div>
            <div className="login-hero-brand-sub">Smart Monitoring</div>
          </div>
        </div>

        {/* Title — top-left, below logo */}
        <div className="login-hero-content">
          <div className="login-hero-title">
            <span className="login-hero-accent">AI-Driven</span>
            <h1>Hospital Equipment<br />Monitoring Platform</h1>
            <p className="login-hero-sub">
              Monitor. Predict. Prevent.<br />
              Ensure uninterrupted patient care through<br />intelligent equipment monitoring.
            </p>
          </div>

          {/* Feature cards — bottom of content */}
          <div className="login-feature-cards">
            {FEATURES.map((f) => (
              <div key={f.title} className="login-feature-card">
                <div className="login-feature-icon" style={{ color: f.color, background: f.bg }}>
                  {f.icon}
                </div>
                <div>
                  <div className="login-feature-title">{f.title}</div>
                  <div className="login-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance badges — very bottom */}
        <div className="login-compliance-bar">
          {BADGES.map((b) => (
            <div key={b.label} className="login-badge-item">
              <span className="login-badge-icon">{b.icon}</span>
              <div>
                <div className="login-badge-label">{b.label}</div>
                <div className="login-badge-sub">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">

        {/* Language selector — top right */}
        <div className="login-lang-bar">
          <button className="login-lang-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            English
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        <div className="login-form-box">

          <div className="login-lock-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="login-welcome">Welcome Back!</h2>
          <p className="login-welcome-sub">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label>Email / Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input type="text" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="Enter your email or username"
                  autoComplete="username" autoFocus />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password" />
                <button type="button" className="login-toggle-pw" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div className="login-remember-row">
              <label className="login-remember">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-forgot">Forgot Password?</button>
            </div>

            <div className="login-field">
              <label>Login As</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <select className="login-role-select" value={selectedRole}
                  onChange={e => { setSelectedRole(e.target.value); setError(''); }}>
                  <option value="">Select your role</option>
                  {CREDENTIALS.map(c => (
                    <option key={c.key} value={c.role}>{c.role}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="login-divider"><span>OR SIGN IN WITH</span></div>

          <div className="login-social-row">
            <button type="button" className="login-social-btn">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M13 1h10v10H13z"/><path fill="#7fba00" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>
              Microsoft
            </button>
            <button type="button" className="login-social-btn">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button type="button" className="login-social-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a5276" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Hospital Directory
            </button>
          </div>

          <p className="login-contact">
            Don't have an account?{' '}
            <button type="button" className="login-contact-link">Contact your administrator</button>
          </p>
        </div>
      </div>
    </div>
  );
}

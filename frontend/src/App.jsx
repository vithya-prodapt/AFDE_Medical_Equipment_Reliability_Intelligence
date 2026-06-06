import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './components/MainDashboard';
import { AnalysisPage } from './components/AnalysisPage';
import { Reports } from './components/Reports';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('auth_user')); } catch { return null; }
  });
  const [activeNav, setActiveNav] = useState('dashboard');
  const [filters, setFilters] = useState({ equipment_type: '', hospital_units: [] });

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    sessionStorage.removeItem('auth_user');
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        user={user}
        activeNav={activeNav}
        onNav={setActiveNav}
        onLogout={handleLogout}
        filters={filters}
        onFilterChange={setFilters}
      />
      <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9' }}>
        {activeNav === 'dashboard' && <MainDashboard user={user} filters={filters} onFilterChange={setFilters} />}
        {activeNav === 'analysis' && <AnalysisPage user={user} />}
        {activeNav === 'reports' && <Reports user={user} />}
        {activeNav === 'monitoring' && user.key !== 'maintenance' && (
          <div style={{ padding: 24 }}>
            <Dashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

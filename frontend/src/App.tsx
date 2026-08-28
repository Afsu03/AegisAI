import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar }               from './components/layout/Navbar';
import { Sidebar }              from './components/layout/Sidebar';
import { LandingPage }          from './pages/LandingPage';
import { LoginPage }            from './pages/LoginPage';
import { RegisterPage }         from './pages/RegisterPage';
import { DashboardPage }        from './pages/DashboardPage';
import { AnalysesPage }         from './pages/AnalysesPage';
import { NewAnalysisPage }      from './pages/NewAnalysisPage';
import { ThreatDetailsPage }    from './pages/ThreatDetailsPage';
import { MultiAgentsPage }      from './pages/MultiAgentsPage';
import { IncidentResponsePage }  from './pages/IncidentResponsePage';
import { ArchitecturePage }     from './pages/ArchitecturePage';
import { AboutPage }            from './pages/AboutPage';
import { ProfilePage }          from './pages/ProfilePage';
import { SettingsPage }         from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: 10 }}>
        <Loader2 size={22} color="#F5F2EA" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14, color: '#8C8981', fontFamily: 'JetBrains Mono, monospace' }}>
          Verifying analyst session…
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isPublicAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/signup';

  if (isPublicAuthPage) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup"   element={<RegisterPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Navbar />

      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          display: 'flex',
          minHeight: 'calc(100vh - 84px)',
        }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: '28px 28px 0',
          }}
        >
          <Routes>
            <Route path="/"                  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/analyses"          element={<ProtectedRoute><AnalysesPage /></ProtectedRoute>} />
            <Route path="/analyses/new"      element={<ProtectedRoute><NewAnalysisPage /></ProtectedRoute>} />
            <Route path="/analyses/:id"      element={<ProtectedRoute><ThreatDetailsPage /></ProtectedRoute>} />
            <Route path="/threats"           element={<ProtectedRoute><ThreatDetailsPage /></ProtectedRoute>} />
            <Route path="/threats/:id"       element={<ProtectedRoute><ThreatDetailsPage /></ProtectedRoute>} />
            <Route path="/agents"            element={<ProtectedRoute><MultiAgentsPage /></ProtectedRoute>} />
            <Route path="/incident-response" element={<ProtectedRoute><IncidentResponsePage /></ProtectedRoute>} />
            <Route path="/architecture"      element={<ArchitecturePage />} />
            <Route path="/about"             element={<AboutPage />} />
            <Route path="/profile"           element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings"          element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*"                  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

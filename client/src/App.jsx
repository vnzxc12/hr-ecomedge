import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Toast from './components/UI/Toast';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import TimeLogs from './pages/TimeLogs';
import Payroll from './pages/Payroll';
import Leaves from './pages/Leaves';
import Documents from './pages/Documents';
import Training from './pages/Training';
import Assets from './pages/Assets';
import Profile from './pages/Profile';

function MainApp() {
  const { isAuthenticated, loading, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="status-dot clocked_in" style={{ width: '16px', height: '16px', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Initializing HR-EcomEdge...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case 'employees':
        return isManager ? <Employees /> : <Profile />;
      case 'timelogs':
        return <TimeLogs />;
      case 'payroll':
        return <Payroll />;
      case 'leaves':
        return <Leaves />;
      case 'documents':
        return <Documents />;
      case 'training':
        return <Training />;
      case 'assets':
        return <Assets />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        
        <div className="page-content-wrapper">
          <main>{renderContent()}</main>
        </div>

        {/* Enterprise Bottom Footer */}
        <footer className="app-footer">
          <div className="footer-left">
            <span className="footer-brand">EcomEdge HR Management</span>
            <span className="footer-divider">|</span>
            <span className="footer-sub">Enterprise Workforce &amp; Payroll v2.6</span>
          </div>
          <div className="footer-right">
            <span>A product by <strong className="footer-company">VCS Technologies</strong></span>
          </div>
        </footer>
      </div>

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

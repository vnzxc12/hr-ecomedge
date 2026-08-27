import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Sun,
  Moon,
  Clock,
  LogOut,
  User,
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import PunchClockModal from '../TimeClock/PunchClockModal';

export default function Navbar({ onToggleSidebar }) {
  const { user, isManager, todayPunch, logout, theme, toggleTheme } = useAuth();
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [liveTimeString, setLiveTimeString] = useState('');

  // Live time ticker in header
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setLiveTimeString(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const status = todayPunch ? todayPunch.status : 'clocked_out';

  const getStatusLabel = () => {
    if (status === 'clocked_in') return 'Working (In)';
    if (status === 'on_break') return 'On Break';
    return 'Clocked Out';
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <button
            className="btn-icon mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Open Navigation Menu"
            id="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>
          
          <div className="navbar-title-container">
            <span className="navbar-brand-name">
              EcomEdge
            </span>
            <span className="navbar-bullet">•</span>
            <span className="navbar-portal-name">
              {isManager ? 'Manager / Executive Command' : 'Employee Self-Service (ESS)'}
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Quick Punch Status Pill */}
          <div
            className="punch-ticker-pill"
            onClick={() => setShowPunchModal(true)}
            title="Click to Open Punch Clock"
          >
            <span className={`status-dot ${status}`} />
            <Clock size={15} color="var(--primary)" />
            <span className="punch-ticker-label">{getStatusLabel()}</span>
            <span className="punch-ticker-time">({liveTimeString})</span>
          </div>

          {/* Theme Switcher */}
          <button
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* User Profile Mini Badge (Desktop) */}
          <div className="navbar-user-badge">
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', overflow: 'hidden' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')
              )}
            </div>
            <div className="navbar-user-text">
              <div className="navbar-user-name">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : `@${user?.username}`}
              </div>
              <div className="navbar-user-role">
                {isManager ? 'Manager / Owner' : (user?.job_title || 'Employee')}
              </div>
            </div>
          </div>

          {/* Quick Logout Button */}
          <button
            className="btn-icon navbar-logout-btn"
            onClick={logout}
            title="Sign Out"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Punch Clock Modal */}
      <PunchClockModal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
      />
    </>
  );
}

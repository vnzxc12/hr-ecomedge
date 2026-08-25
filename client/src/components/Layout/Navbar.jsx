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
    if (status === 'clocked_in') return 'Working (Clocked In)';
    if (status === 'on_break') return 'On Lunch / Break';
    return 'Clocked Out';
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <button className="btn-icon" onClick={onToggleSidebar} style={{ display: 'none' }} id="mobile-menu-btn">
            <Menu size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--brand-green)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              EcomEdge
            </span>
            <span style={{ color: 'var(--border-highlight)' }}>•</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-primary)' }}>
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
            <span style={{ fontSize: '0.85rem' }}>{getStatusLabel()}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.2rem' }}>({liveTimeString})</span>
          </div>

          {/* Theme Switcher */}
          <button
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* User Profile Mini Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)'
          }}>
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', overflow: 'hidden' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')
              )}
            </div>
            <div style={{ lineHeight: '1.2' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : `@${user?.username}`}
              </div>
              <div style={{ fontSize: '0.7rem', color: isManager ? 'var(--primary)' : 'var(--text-secondary)' }}>
                {isManager ? 'Manager / Owner' : (user?.job_title || 'Employee')}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            className="btn-icon"
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

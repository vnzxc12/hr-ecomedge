import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Sun,
  Moon,
  Clock,
  LogOut,
  Search,
  Bell
} from 'lucide-react';
import PunchClockModal from '../TimeClock/PunchClockModal';
import GlobalSearchModal from '../UI/GlobalSearchModal';
import NotificationsDrawer from '../UI/NotificationsDrawer';
import { api } from '../../services/api';

export default function Navbar({ onToggleSidebar, onNavigate }) {
  const { user, isManager, todayPunch, logout, theme, toggleTheme } = useAuth();
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifsDrawer, setShowNotifsDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveTimeString, setLiveTimeString] = useState('');

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.notifications.getAll();
        setUnreadCount(res.unread_count || 0);
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

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
              ECOMEDGE
            </span>
            <span className="navbar-bullet">•</span>
            <span className="navbar-portal-name">
              {isManager ? 'Manager / Executive Command' : 'Employee Self-Service (ESS)'}
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Global Quick Search Button */}
          <button
            className="navbar-search-btn"
            onClick={() => setShowSearchModal(true)}
            title="Global Search across staff, projects & teams (Ctrl+K)"
          >
            <Search size={15} color="var(--brand-green)" />
            <span className="search-text">Search anything...</span>
            <kbd className="search-kbd">Ctrl K</kbd>
          </button>

          {/* Quick Punch Status Pill */}
          <div
            className="punch-ticker-pill"
            onClick={() => setShowPunchModal(true)}
            title="Click to Open Punch Clock"
          >
            <span className={`status-dot ${status}`} />
            <Clock size={15} color="var(--brand-green)" />
            <span className="punch-ticker-label">{getStatusLabel()}</span>
            <span className="punch-ticker-time">({liveTimeString})</span>
          </div>

          {/* Notifications Center Bell */}
          <button
            className="btn-icon notif-bell-btn"
            onClick={() => setShowNotifsDrawer(true)}
            title="Notifications & Alerts"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge-pill">{unreadCount}</span>
            )}
          </button>

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
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigate={onNavigate}
      />

      {/* Notifications Slide-over Drawer */}
      <NotificationsDrawer
        isOpen={showNotifsDrawer}
        onClose={() => {
          setShowNotifsDrawer(false);
          setUnreadCount(0);
        }}
        onNavigate={onNavigate}
      />

      {/* Punch Clock Modal */}
      <PunchClockModal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
      />
    </>
  );
}

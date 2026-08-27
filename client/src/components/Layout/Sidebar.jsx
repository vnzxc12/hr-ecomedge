import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Banknote,
  CalendarDays,
  FolderLock,
  GraduationCap,
  Laptop,
  UserCheck,
  Smartphone,
  LogOut,
  Zap,
  X
} from 'lucide-react';

import EcomEdgeLogo from '../UI/EcomEdgeLogo';
import InstallAppModal from '../UI/InstallAppModal';

export default function Sidebar({ activeTab, onSelectTab, isOpen, onClose }) {
  const { user, isManager, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    } else {
      setShowInstallModal(true);
    }
  };

  const managerNavItems = [
    { id: 'dashboard', label: 'Overview & Floor', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Records', icon: Users },
    { id: 'timelogs', label: 'Time & Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll & Payslips', icon: Banknote },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'documents', label: 'Document Vault', icon: FolderLock },
    { id: 'training', label: 'Training Programs', icon: GraduationCap },
    { id: 'assets', label: 'Asset Tracking', icon: Laptop },
  ];

  const employeeNavItems = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'timelogs', label: 'My Time Logs', icon: Clock },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'payroll', label: 'My Payslips', icon: Banknote },
    { id: 'documents', label: 'My Documents', icon: FolderLock },
    { id: 'training', label: 'Training & Courses', icon: GraduationCap },
    { id: 'assets', label: 'Assigned Assets', icon: Laptop },
    { id: 'profile', label: 'My Profile & Security', icon: UserCheck },
  ];

  const navItems = isManager ? managerNavItems : employeeNavItems;

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : `@${user?.username || 'User'}`;

  const userEmail = user?.first_name
    ? `${user.first_name.toLowerCase()}.${(user.last_name || 'staff').toLowerCase().replace(/\s+/g, '')}@ecomedge.ph`
    : `${user?.username || 'user'}@ecomedge.ph`;

  const roleLabel = isManager
    ? (user?.username === 'admin' ? 'HR Admin' : 'Operations')
    : (user?.job_title || 'Employee');

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <EcomEdgeLogo size={36} />
            {onClose && (
              <button
                className="sidebar-close-btn"
                onClick={onClose}
                aria-label="Close Sidebar"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div style={{ marginTop: '0.4rem' }}>
            <span className="brand-badge">
              {isManager ? '👑 Manager Portal' : '👤 Employee Self-Service'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isManager ? 'Workforce Management' : 'My Workspace'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Area: Install Web App + User Session Card + Sign Out Button */}
        <div className="sidebar-footer-container">
          {/* Install Web App Button */}
          <button
            className="install-app-pill-btn"
            onClick={handleInstallClick}
            title="Install Web App to Home Screen or Desktop"
          >
            <Smartphone size={16} />
            <span>Install Web App</span>
          </button>

          {/* User Session Card */}
          <div className="sidebar-session-card">
            {/* Top row: DEMO / LIVE SESSION + Role Badge */}
            <div className="session-card-header">
              <div className="session-status-tag">
                <Zap size={11} className="session-zap-icon" />
                <span>DEMO SESSION</span>
              </div>
              <span className={`session-role-badge ${isManager ? 'manager' : 'employee'}`}>
                {roleLabel}
              </span>
            </div>

            {/* Middle row: Avatar + Name + Email */}
            <div className="session-card-body">
              <div className="session-avatar">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} />
                ) : (
                  <span>{user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')}</span>
                )}
              </div>
              <div className="session-user-info">
                <div className="session-user-name" title={displayName}>
                  {displayName}
                </div>
                <div className="session-user-email" title={userEmail}>
                  {userEmail}
                </div>
              </div>
            </div>

            {/* Bottom row: Sign Out Button */}
            <button
              className="sidebar-signout-btn"
              onClick={logout}
              title="Sign Out of Session"
            >
              <LogOut size={15} />
              <span>Sign Out to Login</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Install Web App Guide Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onNativeInstall={handleInstallClick}
        isNativeReady={Boolean(deferredPrompt)}
      />
    </>
  );
}

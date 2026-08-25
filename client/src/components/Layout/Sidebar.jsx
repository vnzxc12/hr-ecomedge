import React from 'react';
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
  Building,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, isOpen }) {
  const { user, isManager } = useAuth();

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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Building size={22} />
        </div>
        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <h2>HR-EcomEdge</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span className="brand-badge">
              {isManager ? 'Manager Portal' : 'Employee Self-Service'}
            </span>
          </div>
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
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div className="user-mini-card">
          <div className="user-avatar">
            {user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')}
          </div>
          <div className="user-info-text">
            <div className="name">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : `@${user?.username}`}
            </div>
            <div className="role-tag">
              {isManager ? '👑 Executive / Admin' : '👤 Employee'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

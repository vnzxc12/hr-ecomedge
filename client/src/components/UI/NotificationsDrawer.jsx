import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, AlertTriangle, CheckCircle2, Info, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function NotificationsDrawer({ isOpen, onClose, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.notifications.getAll();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--brand-green-light)',
              color: 'var(--brand-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Notification Center</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>Workforce &amp; Operations Alerts</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {notifications.filter(n => !n.is_read).length} Unread Updates
          </span>
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--brand-green)',
              cursor: 'pointer'
            }}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading alerts...
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={36} color="var(--brand-green)" style={{ margin: '0 auto 0.75rem', opacity: 0.8 }} />
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>All Caught Up!</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                No pending notifications or urgent alerts for your account.
              </div>
            </div>
          )}

          {!loading && notifications.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    if (n.link_tab && onNavigate) {
                      onNavigate(n.link_tab);
                      onClose();
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: n.type === 'danger' ? 'var(--danger-light)' : (n.type === 'warning' ? 'var(--warning-light)' : 'var(--brand-green-light)'),
                      color: n.type === 'danger' ? 'var(--danger)' : (n.type === 'warning' ? 'var(--warning)' : 'var(--brand-green)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {n.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {n.title}
                        </div>
                        {!n.is_read && <span className="status-dot clocked_in" style={{ width: '7px', height: '7px' }} />}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                        {n.message}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={11} /> {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {n.link_tab && (
                          <span style={{ color: 'var(--brand-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            View <ArrowRight size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ width: '100%' }}>
            Close Notification Center
          </button>
        </div>
      </div>
    </div>
  );
}

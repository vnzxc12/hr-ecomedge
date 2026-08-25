import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast } = useAuth();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} color="#10b981" />,
    warning: <AlertTriangle size={20} color="#f59e0b" />,
    danger: <AlertCircle size={20} color="#ef4444" />,
    info: <Info size={20} color="#3b82f6" />
  };

  const bgColors = {
    success: 'rgba(16, 185, 129, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    danger: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(59, 130, 246, 0.15)'
  };

  const borderColors = {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: 'var(--bg-secondary)',
        border: `1px solid ${borderColors[toast.type] || borderColors.info}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '420px',
        animation: 'modalZoom 0.2s ease'
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {icons[toast.type] || icons.info}
      </div>
      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>
        {toast.message}
      </div>
    </div>
  );
}

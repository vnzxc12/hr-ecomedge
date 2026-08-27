import React from 'react';
import { Smartphone, Monitor, Share2, PlusSquare, MoreVertical, Download, X, CheckCircle2 } from 'lucide-react';

export default function InstallAppModal({ isOpen, onClose, onNativeInstall, isNativeReady }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card install-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0A1931 0%, #162a4d 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#009640',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 150, 64, 0.4)'
            }}>
              <Smartphone size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>Install EcomEdge Web App</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Fast access on Mobile, Tablet &amp; Desktop</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isNativeReady && (
            <div style={{
              padding: '1rem 1.25rem',
              background: 'rgba(0, 150, 64, 0.08)',
              border: '1px solid rgba(0, 150, 64, 0.25)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#009640', fontSize: '0.92rem' }}>Quick One-Click Install</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Click below to install directly to your device.</div>
              </div>
              <button
                className="install-app-pill-btn"
                onClick={() => {
                  if (onNativeInstall) onNativeInstall();
                  onClose();
                }}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
              >
                <Download size={16} />
                <span>Install Now</span>
              </button>
            </div>
          )}

          {/* Installation Guides for All Platforms */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* iOS Safari Guide */}
            <div className="install-guide-box">
              <div className="guide-header">
                <Smartphone size={18} color="#009640" />
                <span>Apple iOS (iPhone / iPad)</span>
              </div>
              <ol className="guide-steps">
                <li>Open this portal in <strong>Safari</strong>.</li>
                <li>Tap the <strong>Share</strong> button <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in the bottom toolbar.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>

            {/* Android Chrome Guide */}
            <div className="install-guide-box">
              <div className="guide-header">
                <Smartphone size={18} color="#009640" />
                <span>Android (Chrome / Edge)</span>
              </div>
              <ol className="guide-steps">
                <li>Open this portal in <strong>Chrome</strong>.</li>
                <li>Tap the <strong>Three Dots Menu</strong> <MoreVertical size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> at the top right.</li>
                <li>Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</li>
                <li>Confirm to install icon on your launcher.</li>
              </ol>
            </div>

            {/* Desktop Guide */}
            <div className="install-guide-box">
              <div className="guide-header">
                <Monitor size={18} color="#0284c7" />
                <span>Windows / Mac (Chrome / Edge)</span>
              </div>
              <ol className="guide-steps">
                <li>Look for the <strong>Install</strong> icon <Download size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in your browser address bar.</li>
                <li>Or open the browser menu (⋮) and select <strong>Install HR-EcomEdge</strong>.</li>
                <li>Launch like a standalone native desktop app.</li>
              </ol>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}>
            <CheckCircle2 size={16} color="#009640" style={{ flexShrink: 0 }} />
            <span>Installed web app operates full screen with offline caching and faster mobile time clock punches.</span>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '0.85rem 1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  User,
  ShieldCheck,
  Clock,
  Banknote,
  FolderLock,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 70%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glowing orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '1050px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        zIndex: 10
      }}>
        {/* Left Side: Brand & Feature Showcase */}
        <div style={{
          background: 'linear-gradient(145deg, #111827 0%, #1e1b4b 100%)',
          padding: '3rem 2.5rem',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="brand-icon" style={{ width: '46px', height: '46px' }}>
                <Building2 size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>HR-EcomEdge</h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: '600' }}>
                  Enterprise Workforce & HR Operations
                </p>
              </div>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Next-generation HR ecosystem engineered for high-performance teams. Real-time time clock, automated payroll, document security vault, and employee self-service.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '6px', borderRadius: '8px', color: '#818cf8' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#ffffff' }}>Live Punch Clock & Breaks</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>One-click shift timer, lunch breaks, and automated overtime.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '8px', color: '#34d399' }}>
                  <Banknote size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#ffffff' }}>Automated Payroll Engine</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Instant gross/net computations and itemized printable payslips.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '6px', borderRadius: '8px', color: '#22d3ee' }}>
                  <FolderLock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#ffffff' }}>Encrypted Document Vault</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Self-service CV, government IDs, and contract storage.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Username & Password Authentication • No Email Required</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>Sign In to Portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter your system username and password to proceed.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. admin or john.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.98rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Access Chips */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              Quick Demo Accounts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('admin', 'admin123')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem' }}
              >
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>👑 Manager / Owner</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>admin / admin123</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('john.doe', 'password123')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem' }}
              >
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>👤 Employee (Eng)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>john.doe / password123</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('sarah.smith', 'password123')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem' }}
              >
                <span style={{ fontWeight: '700', color: 'var(--accent-purple)' }}>🎨 Employee (Design)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>sarah.smith / password123</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('michael.lee', 'password123')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem' }}
              >
                <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>📢 Employee (Marketing)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>michael.lee / password123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  ShieldCheck,
  Clock,
  Banknote,
  FolderLock,
  ArrowRight,
  Moon
} from 'lucide-react';
import EcomEdgeLogo from '../components/UI/EcomEdgeLogo';

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        zIndex: 10
      }}>
        {/* Left Side: Brand & Feature Showcase */}
        <div style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #f0fdf4 100%)',
          padding: '3rem 2.5rem',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <EcomEdgeLogo size={46} />
            </div>

            {/* Headline */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.3rem',
                fontWeight: '900',
                lineHeight: '1.05',
                color: 'var(--brand-navy)',
                letterSpacing: '-0.02em'
              }}>
                HR & WORKFORCE <span style={{ color: 'var(--brand-green)' }}>PORTAL</span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--brand-green)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: '800',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                marginTop: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                EcomEdge Management Suite
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              Enterprise workforce operations suite for attendance time logs, automated payroll computation, secure employee records, and self-service.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'var(--brand-green-light)', padding: '7px', borderRadius: '8px', color: 'var(--brand-green)' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-navy)' }}>Shift Tracker & Punch Clock</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Live Time In, Lunch Breaks, Overtime, and Night Shift tracking.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(10, 25, 49, 0.08)', padding: '7px', borderRadius: '8px', color: 'var(--brand-navy)' }}>
                  <Banknote size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-navy)' }}>Automated Payroll & Payslips (₱)</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Instant earnings calculator and official printable itemized slips.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: 'var(--brand-green-light)', padding: '7px', borderRadius: '8px', color: 'var(--brand-green)' }}>
                  <FolderLock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--brand-navy)' }}>Vault for CV & Government IDs</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Self-service upload for resumes, passports, and signed contracts.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0A1931',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              <Moon size={14} color="#00d65b" />
              <span>Shift Support: 12AM – 8AM / Flexi Shifts</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ padding: '3.5rem 2.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.65rem', color: 'var(--brand-navy)', marginBottom: '0.35rem' }}>Account Sign In</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Enter your assigned username and password to log in.
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
                  placeholder="Enter username"
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

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} color="var(--brand-green)" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Encrypted Session • Username & Password Authentication
          </div>
        </div>
      </div>
    </div>
  );
}

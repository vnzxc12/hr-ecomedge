import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UserCheck,
  Lock,
  Phone,
  MapPin,
  CreditCard,
  Save,
  KeyRound,
  ShieldCheck,
  Building,
  Briefcase
} from 'lucide-react';

export default function Profile() {
  const { user, isManager, refreshUser, showToast } = useAuth();
  const [profile, setProfile] = useState({
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: '',
    bank_account_number: ''
  });

  // Password form
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.employee_id) return;
      try {
        const res = await api.employees.getById(user.employee_id);
        const emp = res.employee;
        setProfile({
          phone: emp.phone || '',
          address: emp.address || '',
          emergency_contact_name: emp.emergency_contact_name || '',
          emergency_contact_phone: emp.emergency_contact_phone || '',
          bank_name: emp.bank_name || '',
          bank_account_number: emp.bank_account_number || ''
        });
      } catch (err) {
        // silent fallback
      }
    }
    loadProfile();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user?.employee_id) return;
    setSavingProfile(true);
    try {
      await api.employees.update(user.employee_id, profile);
      showToast('Personal profile information updated.', 'success');
      refreshUser();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('New password and confirmation do not match.', 'danger');
      return;
    }
    if (passForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      return;
    }

    setSavingPass(true);
    try {
      await api.auth.changePassword(passForm.currentPassword, passForm.newPassword);
      showToast('Password updated successfully!', 'success');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>My Profile & Security</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your contact information, emergency numbers, payroll accounts, and password credentials.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Left Column: Personal Profile Form */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
              {user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>{user?.first_name} {user?.last_name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                @{user?.username} • {user?.job_title || (isManager ? 'Manager / Executive' : 'Employee')} ({user?.department || 'Operations'})
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Contact & Emergency Information
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+1 (555) 000-0000"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Home Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Street, City, State"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Doe (Spouse)"
                  value={profile.emergency_contact_name}
                  onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+1 (555) 999-9999"
                  value={profile.emergency_contact_phone}
                  onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '1.5rem 0 1rem' }}>
              Payroll & Direct Deposit
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chase Bank"
                  value={profile.bank_name}
                  onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bank Account / IBAN</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="**** 4910"
                  value={profile.bank_account_number}
                  onChange={(e) => setProfile({ ...profile, bank_account_number: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                <Save size={16} />
                <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Security & Password Form */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <KeyRound size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem' }}>Change Account Password</h3>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingPass}>
              <Lock size={16} />
              <span>{savingPass ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Your account uses strict username credentials. Never share your password with unauthorized personnel.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

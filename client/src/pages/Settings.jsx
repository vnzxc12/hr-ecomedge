import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  Shield,
  FileText,
  Key,
  Activity,
  AlertTriangle,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Percent,
  Banknote,
  Calculator,
  Sliders
} from 'lucide-react';

export default function Settings() {
  const { isManager, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('designations'); // 'designations', 'payroll_config', 'system_audit', 'auth_audit'
  const [designations, setDesignations] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payroll Tax & Deduction Config State
  const [payrollConfig, setPayrollConfig] = useState({
    tax_rate: 8.0,
    social_security_rate: 4.0,
    default_allowance: 1500.00,
    standard_monthly_hours: 160.0,
    overtime_multiplier: 1.5
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Pagination states
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Diff inspection modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Designation Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDesig, setSelectedDesig] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    department: 'Research & Analytics',
    level: 'Mid-Level',
    description: ''
  });

  useEffect(() => {
    loadData(true);
    loadStats();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const res = await api.audit.getStats();
      setStats(res);
    } catch (err) {
      // stats error fallback
    }
  };

  const [auditSearch, setAuditSearch] = useState('');

  const loadData = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setNextCursor(null);
    }
    try {
      if (activeTab === 'designations') {
        const res = await api.teams.getDesignations();
        setDesignations(res.designations || []);
      } else if (activeTab === 'payroll_config') {
        const res = await api.payroll.getConfig();
        if (res.config) setPayrollConfig(res.config);
      } else if (activeTab === 'system_audit') {
        const res = await api.audit.getSystem({ limit: 25, cursor: reset ? '' : nextCursor, search: auditSearch });
        const list = res.items || res.logs || [];
        if (reset) {
          setSystemLogs(list);
        } else {
          setSystemLogs(prev => [...prev, ...list]);
        }
        setNextCursor(res.next_cursor);
        setHasMore(Boolean(res.has_more));
      } else if (activeTab === 'auth_audit') {
        const res = await api.audit.getAuth({ limit: 25, cursor: reset ? '' : nextCursor, username: auditSearch });
        const list = res.items || res.logs || [];
        if (reset) {
          setAuthLogs(list);
        } else {
          setAuthLogs(prev => [...prev, ...list]);
        }
        setNextCursor(res.next_cursor);
        setHasMore(Boolean(res.has_more));
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSavePayrollConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.payroll.updateConfig(payrollConfig);
      showToast(res.message, 'success');
      if (res.config) setPayrollConfig(res.config);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    loadData(false);
  };

  const handleOpenAdd = () => {
    setSelectedDesig(null);
    setFormData({ title: '', department: 'Research & Analytics', level: 'Mid-Level', description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (d) => {
    setSelectedDesig(d);
    setFormData({
      title: d.title,
      department: d.department,
      level: d.level || 'Mid-Level',
      description: d.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDesig) {
        await api.teams.updateDesignation(selectedDesig.id, formData);
        showToast('Designation updated successfully!', 'success');
      } else {
        await api.teams.createDesignation(formData);
        showToast('Designation created successfully!', 'success');
      }
      setShowModal(false);
      loadData(true);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this designation?')) return;
    try {
      await api.teams.deleteDesignation(id);
      showToast('Designation deleted successfully.', 'info');
      loadData(true);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <SettingsIcon size={26} color="var(--brand-green)" /> System Governance &amp; Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Enterprise asynchronous audit trails, authentication security events, and job designations.
          </p>
        </div>
        {activeTab === 'designations' && isManager && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Designation
          </button>
        )}
      </div>

      {/* Security Telemetry KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--brand-green)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total State Audits</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.total_system_events.toLocaleString()}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '10px', background: stats.failed_logins_24h > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: stats.failed_logins_24h > 0 ? '#ef4444' : '#3b82f6' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Failed Logins (24h)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: stats.failed_logins_24h > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.failed_logins_24h}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Shield size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active TTL Sessions</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.active_sessions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="subtabs-bar">
        <button
          className={`subtab-btn ${activeTab === 'designations' ? 'active' : ''}`}
          onClick={() => setActiveTab('designations')}
        >
          <Shield size={16} /> Job Designations ({designations.length})
        </button>
        <button
          className={`subtab-btn ${activeTab === 'payroll_config' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll_config')}
        >
          <Percent size={16} /> Taxes &amp; Deductions Rules
        </button>
        <button
          className={`subtab-btn ${activeTab === 'system_audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('system_audit')}
        >
          <FileText size={16} /> System State Audit Trail
        </button>
        <button
          className={`subtab-btn ${activeTab === 'auth_audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('auth_audit')}
        >
          <Key size={16} /> Login &amp; Auth Audits
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading records...</div>
      ) : activeTab === 'payroll_config' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Settings Form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--brand-green)" /> Statutory Deductions &amp; Tax Configuration
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              Define standard tax withholding percentages, statutory health/social contributions, and default allowances applied during automated payroll calculation.
            </p>

            <form onSubmit={handleSavePayrollConfig}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Withholding Tax Rate (%)</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{payrollConfig.tax_rate}%</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  className="form-control"
                  value={payrollConfig.tax_rate}
                  onChange={(e) => setPayrollConfig({ ...payrollConfig, tax_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Standard withholding tax percentage deducted from gross taxable compensation.</small>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Social Security &amp; Healthcare Contribution Rate (%)</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{payrollConfig.social_security_rate}%</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  className="form-control"
                  value={payrollConfig.social_security_rate}
                  onChange={(e) => setPayrollConfig({ ...payrollConfig, social_security_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Combined SSS, PhilHealth, and HDMF / Pag-IBIG statutory fund deduction rate.</small>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Standard Monthly Transport &amp; Meal Allowance (₱)</span>
                  <span style={{ color: 'var(--brand-green)', fontWeight: 800 }}>₱{Number(payrollConfig.default_allowance || 0).toLocaleString()}</span>
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  className="form-control"
                  value={payrollConfig.default_allowance}
                  onChange={(e) => setPayrollConfig({ ...payrollConfig, default_allowance: parseFloat(e.target.value) || 0 })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Fixed non-taxable monthly travel &amp; meal stipend (prorated by attendance hours).</small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Monthly Benchmark Hours</label>
                  <input
                    type="number"
                    step="1"
                    min="40"
                    max="300"
                    className="form-control"
                    value={payrollConfig.standard_monthly_hours}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, standard_monthly_hours: parseFloat(e.target.value) || 160 })}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Standard full-time benchmark (default 160 hrs).</small>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Overtime Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    className="form-control"
                    value={payrollConfig.overtime_multiplier}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Overtime hourly premium (e.g. 1.5x regular rate).</small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" disabled={savingConfig}>
                  <CheckCircle2 size={16} />
                  <span>{savingConfig ? 'Saving Changes...' : 'Save Deduction & Tax Rules'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Calculation Simulator Card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(10, 25, 49, 0.04) 0%, rgba(0, 150, 64, 0.05) 100%)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Calculator size={18} color="var(--brand-green)" /> Live Computation Simulation
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Example preview for a full-time employee with ₱20,000 basic salary (160 hours worked):
            </p>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.84rem' }}>
                <span>Basic Salary (160 hrs):</span>
                <strong>₱20,000.00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.84rem', color: 'var(--brand-green)' }}>
                <span>Allowances:</span>
                <strong>+₱{Number(payrollConfig.default_allowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem', fontWeight: 700, borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                <span>Gross Compensation:</span>
                <span>₱{(20000 + Number(payrollConfig.default_allowance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.84rem', color: 'var(--danger)' }}>
                <span>Withholding Tax ({payrollConfig.tax_rate}%):</span>
                <span>-₱{((20000 + Number(payrollConfig.default_allowance || 0)) * (payrollConfig.tax_rate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.84rem', color: 'var(--danger)' }}>
                <span>Social / Healthcare ({payrollConfig.social_security_rate}%):</span>
                <span>-₱{((20000 + Number(payrollConfig.default_allowance || 0)) * (payrollConfig.social_security_rate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '2px solid var(--border-color)', fontSize: '1rem', fontWeight: 900, color: 'var(--success)' }}>
                <span>Estimated Net Pay:</span>
                <span>
                  ₱{(
                    (20000 + Number(payrollConfig.default_allowance || 0)) -
                    ((20000 + Number(payrollConfig.default_allowance || 0)) * ((payrollConfig.tax_rate + payrollConfig.social_security_rate) / 100))
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'designations' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Job Title / Designation</th>
                  <th>Department</th>
                  <th>Career Level</th>
                  <th>Assigned Staff</th>
                  <th>Description</th>
                  {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {designations.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.title}</strong></td>
                    <td>{d.department}</td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        {d.level || 'Mid-Level'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--brand-green)' }}>
                        {d.employee_count || 0} Staff
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {d.description || 'Standard EcomEdge research & analytics designation.'}
                    </td>
                    {isManager && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button className="btn-icon" onClick={() => handleOpenEdit(d)} title="Edit" style={{ width: '28px', height: '28px' }}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDelete(d.id)} title="Delete" style={{ width: '28px', height: '28px', color: 'var(--danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'system_audit' ? (
        /* SYSTEM STATE AUDIT TRAIL */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '360px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by user, action, or ID..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadData(true); }}
                style={{ height: '34px', fontSize: '0.82rem' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => loadData(true)}>
                Filter
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setAuditSearch(''); loadData(true); }}>
              Refresh Logs
            </button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Client IP / Fingerprint</th>
                  <th>Diff / Delta</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {systemLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No system audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  systemLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} /> {new Date(l.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td><strong>@{l.username || 'system'}</strong></td>
                      <td>
                        <span className={`badge ${l.action === 'DELETE' ? 'badge-danger' : l.action === 'CREATE' ? 'badge-success' : 'badge-primary'}`}>
                          {l.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.resource_type} #{l.resource_id}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div>{l.ip_address}</div>
                        {l.device_fingerprint && (
                          <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>fp: {l.device_fingerprint.substring(0, 10)}...</div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.diff ? (
                          <span style={{ color: 'var(--brand-green)', fontWeight: 600 }}>
                            Δ Changed: {Object.keys(l.diff).join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Initial State</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedLog(l)}
                          title="Inspect JSON Snapshot & Diff"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cursor Pagination Bar */}
          {hasMore && (
            <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading next page...' : 'Load Next Page (Keyset Pagination)'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* AUTH & LOGIN AUDITS */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '360px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by username..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadData(true); }}
                style={{ height: '34px', fontSize: '0.82rem' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => loadData(true)}>
                Filter
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setAuditSearch(''); loadData(true); }}>
              Refresh Logins
            </button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Username</th>
                  <th>Event Type</th>
                  <th>Status</th>
                  <th>Failure Reason</th>
                  <th>IP Address</th>
                  <th>Device Fingerprint</th>
                </tr>
              </thead>
              <tbody>
                {authLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No authentication audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  authLogs.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td><strong>@{a.username}</strong></td>
                      <td><span className="badge badge-primary">{a.event_type}</span></td>
                      <td>
                        <span className={`badge ${a.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {a.status === 'SUCCESS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {a.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: a.failure_reason ? '#ef4444' : 'var(--text-muted)' }}>
                        {a.failure_reason || '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{a.ip_address}</td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {a.device_fingerprint ? `${a.device_fingerprint.substring(0, 16)}...` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading next page...' : 'Load Next Page (Keyset Pagination)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* JSON Diff / State Inspection Modal */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                Audit Snapshot: {selectedLog.resource_type} #{selectedLog.resource_id} ({selectedLog.action})
              </h3>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {selectedLog.diff && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--brand-green)', marginBottom: '0.5rem' }}>Field-Level Delta (Diff):</h4>
                  <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.diff, null, 2)}
                  </pre>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Before State:</h4>
                  <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '200px' }}>
                    {selectedLog.before_state ? JSON.stringify(selectedLog.before_state, null, 2) : 'null (Created)'}
                  </pre>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>After State:</h4>
                  <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '200px' }}>
                    {selectedLog.after_state ? JSON.stringify(selectedLog.after_state, null, 2) : 'null (Deleted)'}
                  </pre>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Designation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                {selectedDesig ? 'Edit Designation' : 'Create Job Designation'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Job Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Senior Research Analyst"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      <option value="Research & Analytics">Research &amp; Analytics</option>
                      <option value="Operations">Operations</option>
                      <option value="Client Services">Client Services</option>
                      <option value="Management">Management</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Career Level</label>
                    <select
                      className="form-control"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    >
                      <option value="Entry-Level">Entry-Level</option>
                      <option value="Mid-Level">Mid-Level</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                      <option value="Executive">Executive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Brief description of primary responsibilities..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedDesig ? 'Save Changes' : 'Create Designation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

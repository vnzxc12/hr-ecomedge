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
  Laptop
} from 'lucide-react';

export default function Settings() {
  const { isManager, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('designations'); // 'designations', 'system_audit', 'auth_audit'
  const [designations, setDesignations] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const loadData = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setNextCursor(null);
    }
    try {
      if (activeTab === 'designations') {
        const res = await api.teams.getDesignations();
        setDesignations(res.designations || []);
      } else if (activeTab === 'system_audit') {
        const res = await api.audit.getSystem({ limit: 25, cursor: reset ? '' : nextCursor });
        if (reset) {
          setSystemLogs(res.items || []);
        } else {
          setSystemLogs(prev => [...prev, ...(res.items || [])]);
        }
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
      } else if (activeTab === 'auth_audit') {
        const res = await api.audit.getAuth({ limit: 25, cursor: reset ? '' : nextCursor });
        if (reset) {
          setAuthLogs(res.items || []);
        } else {
          setAuthLogs(prev => [...prev, ...(res.items || [])]);
        }
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

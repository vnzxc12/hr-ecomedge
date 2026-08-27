import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings as SettingsIcon, Plus, Edit2, Trash2, Shield, Users, FileText, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { isManager, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('designations'); // 'designations', 'audit'
  const [designations, setDesignations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDesig, setSelectedDesig] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    department: 'Research & Analytics',
    level: 'Mid-Level',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'designations') {
        const res = await api.teams.getDesignations();
        setDesignations(res.designations || []);
      } else {
        const res = await api.audit.getAll();
        setAuditLogs(res.logs || []);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
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
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this designation?')) return;
    try {
      await api.teams.deleteDesignation(id);
      showToast('Designation deleted successfully.', 'info');
      loadData();
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
            <SettingsIcon size={26} color="var(--brand-green)" /> System Settings &amp; Designations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Configure job designations, career levels, and audit logs.
          </p>
        </div>
        {activeTab === 'designations' && isManager && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Designation
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="subtabs-bar">
        <button
          className={`subtab-btn ${activeTab === 'designations' ? 'active' : ''}`}
          onClick={() => setActiveTab('designations')}
        >
          <Shield size={16} /> Job Designations ({designations.length})
        </button>
        <button
          className={`subtab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={16} /> System Audit Logs
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading settings...</div>
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
                    <td>
                      <strong>{d.title}</strong>
                    </td>
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
      ) : (
        /* AUDIT LOGS */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.created_at}</td>
                      <td><strong>@{l.username || 'system'}</strong></td>
                      <td><span className="badge badge-success">{l.action}</span></td>
                      <td>{l.entity_type}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

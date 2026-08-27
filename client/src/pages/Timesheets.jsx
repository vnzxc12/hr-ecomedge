import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FileCheck, Plus, CheckCircle2, XCircle, Clock, Search, Calendar, FolderKanban, Trash2 } from 'lucide-react';

export default function Timesheets() {
  const { user, isManager, showToast } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    project_id: '',
    date: todayStr,
    start_time: '09:00',
    end_time: '18:00',
    break_mins: 60,
    total_hours: 8.0,
    overtime_hours: 0.0,
    task_description: ''
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const [tsRes, prjRes] = await Promise.all([
        api.timesheets.getAll(params),
        api.projects.getAll()
      ]);
      setTimesheets(tsRes.timesheets || []);
      setProjects(prjRes.projects || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.timesheets.submit(formData);
      showToast('Timesheet submitted successfully!', 'success');
      setShowModal(false);
      setFormData({
        project_id: '',
        date: todayStr,
        start_time: '09:00',
        end_time: '18:00',
        break_mins: 60,
        total_hours: 8.0,
        overtime_hours: 0.0,
        task_description: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleReview = async (id, status) => {
    try {
      await api.timesheets.review(id, status, '');
      showToast(`Timesheet ${status} successfully!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this timesheet entry?')) return;
    try {
      await api.timesheets.delete(id);
      showToast('Timesheet entry deleted.', 'info');
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
            <FileCheck size={26} color="var(--brand-green)" /> Project Timesheets &amp; Work Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Record research tasks, client project hours, and manage manager approvals.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Log Work Timesheet
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
          Status Filter:
        </span>
        {['all', 'submitted', 'approved', 'rejected'].map(st => (
          <button
            key={st}
            className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus(st)}
            style={{ textTransform: 'capitalize' }}
          >
            {st === 'submitted' ? 'Pending Approval' : st}
          </button>
        ))}
      </div>

      {/* Timesheets Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading timesheets...</div>
        ) : timesheets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            No timesheet logs found for the selected filter.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Client Project</th>
                  <th>Task Summary</th>
                  <th>Hours</th>
                  <th>Status</th>
                  {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {timesheets.map(ts => (
                  <tr key={ts.id}>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{ts.date}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {ts.start_time} – {ts.end_time}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '0.75rem' }}>
                          {ts.avatar_url ? <img src={ts.avatar_url} alt="Avatar" /> : ts.first_name[0]}
                        </div>
                        <div>
                          <strong>{ts.first_name} {ts.last_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ts.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--brand-green)' }}>
                        {ts.project_name || 'General Operations'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ts.client_name}</div>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {ts.task_description}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{ts.total_hours} hrs</div>
                      {ts.overtime_hours > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 700 }}>
                          +{ts.overtime_hours}h OT
                        </div>
                      )}
                    </td>
                    <td>
                      {ts.status === 'approved' ? (
                        <span className="badge badge-success">Approved</span>
                      ) : ts.status === 'rejected' ? (
                        <span className="badge badge-danger">Rejected</span>
                      ) : (
                        <span className="badge badge-warning">Pending Review</span>
                      )}
                    </td>
                    {isManager && (
                      <td style={{ textAlign: 'right' }}>
                        {ts.status === 'submitted' ? (
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleReview(ts.id, 'approved')}
                              title="Approve Timesheet"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReview(ts.id, 'rejected')}
                              title="Reject Timesheet"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(ts.id)}
                            title="Delete"
                            style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Timesheet Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Log Project Timesheet</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Client Project</label>
                  <select
                    className="form-control"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    <option value="">-- General Agency Operations --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} [{p.project_code}]</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Work Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Total Work Hours *</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      max={24}
                      className="form-control"
                      value={formData.total_hours}
                      onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Task Description &amp; Deliverables *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe specific research scope, competitor ASINs analyzed, keywords tracked, etc..."
                    value={formData.task_description}
                    onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Timesheet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

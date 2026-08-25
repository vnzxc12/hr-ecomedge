import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  UserCheck,
  X,
  ExternalLink,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Training() {
  const { isManager, showToast } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('programs');

  // Modals
  const [showAddProgModal, setShowAddProgModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showUpdateRecordModal, setShowUpdateRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Forms
  const [progForm, setProgForm] = useState({
    title: '',
    description: '',
    instructor: '',
    duration_hours: 10,
    start_date: '',
    end_date: '',
    status: 'in_progress'
  });

  const [enrollForm, setEnrollForm] = useState({
    training_id: '',
    employee_id: ''
  });

  const [updateRecordForm, setUpdateRecordForm] = useState({
    completion_status: 'completed',
    score: 95,
    certificate_url: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        api.training.getPrograms(),
        api.training.getRecords()
      ]);
      setPrograms(pRes.programs || []);
      setRecords(rRes.records || []);

      if (isManager) {
        const empRes = await api.employees.getAll();
        setEmployees(empRes.employees || []);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isManager]);

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.training.createProgram(progForm);
      showToast('Training program created.', 'success');
      setShowAddProgModal(false);
      setProgForm({
        title: '',
        description: '',
        instructor: '',
        duration_hours: 10,
        start_date: '',
        end_date: '',
        status: 'in_progress'
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.training.enroll(enrollForm.training_id, enrollForm.employee_id);
      showToast('Employee enrolled in training program.', 'success');
      setShowEnrollModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      await api.training.updateRecord(selectedRecord.id, updateRecordForm);
      showToast('Training progress recorded.', 'success');
      if (updateRecordForm.completion_status === 'completed') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      setShowUpdateRecordModal(false);
      setSelectedRecord(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            {isManager ? 'Workforce Training & Certifications' : 'My Training Programs'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Professional skill courses, compliance development, and certification tracks.
          </p>
        </div>

        {isManager && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setShowAddProgModal(true)}>
              <Plus size={18} />
              <span>Create Program</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEnrollModal(true)}>
              <UserCheck size={18} />
              <span>Enroll Staff</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'programs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('programs')}
        >
          <BookOpen size={16} />
          <span>Course Catalog ({programs.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('records')}
        >
          <Award size={16} />
          <span>{isManager ? 'Enrollment & Completion Records' : 'My Enrolled Courses'} ({records.length})</span>
        </button>
      </div>

      {/* ==========================================
          PROGRAMS CATALOG
          ========================================== */}
      {activeTab === 'programs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading programs...
            </div>
          ) : programs.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No training programs scheduled yet.
            </div>
          ) : (
            programs.map((prog) => (
              <div key={prog.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: 'var(--accent-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <GraduationCap size={22} />
                    </div>

                    <span className={`badge badge-${prog.status === 'completed' ? 'success' : (prog.status === 'in_progress' ? 'info' : 'warning')}`}>
                      {prog.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{prog.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                    {prog.description || 'Core training curriculum for skill development.'}
                  </p>

                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                    <div><strong>Instructor:</strong> {prog.instructor || 'Staff Lead'}</div>
                    <div><strong>Duration:</strong> {prog.duration_hours} hours total</div>
                    {prog.start_date && <div><strong>Timeline:</strong> {prog.start_date} ~ {prog.end_date || 'Ongoing'}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {prog.enrolled_count || 0} Enrolled • {prog.completed_count || 0} Finished
                  </span>

                  {isManager && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEnrollForm({ ...enrollForm, training_id: prog.id });
                        setShowEnrollModal(true);
                      }}
                    >
                      Enroll Staff
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==========================================
          RECORDS & COMPLETIONS
          ========================================== */}
      {activeTab === 'records' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {isManager && <th>Employee</th>}
                <th>Training Program</th>
                <th>Instructor</th>
                <th>Status</th>
                <th>Score</th>
                <th>Completion Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No training records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    {isManager && (
                      <td>
                        <div style={{ fontWeight: '700' }}>{r.first_name} {r.last_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.employee_code} • {r.department}</div>
                      </td>
                    )}
                    <td style={{ fontWeight: '600' }}>{r.program_title}</td>
                    <td>{r.instructor || 'Lead'}</td>
                    <td>
                      <span className={`badge badge-${r.completion_status === 'completed' ? 'success' : (r.completion_status === 'in_progress' ? 'info' : 'warning')}`}>
                        {r.completion_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {r.score ? <strong>{r.score}%</strong> : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
                    </td>
                    <td>{r.completion_date || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedRecord(r);
                          setUpdateRecordForm({
                            completion_status: r.completion_status || 'completed',
                            score: r.score || 90,
                            certificate_url: r.certificate_url || ''
                          });
                          setShowUpdateRecordModal(true);
                        }}
                      >
                        Update Progress
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==========================================
          CREATE PROGRAM MODAL
          ========================================== */}
      {showAddProgModal && (
        <div className="modal-backdrop" onClick={() => setShowAddProgModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <GraduationCap size={20} color="var(--primary)" />
                <h3>Create Training Program</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAddProgModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateProgram}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Program Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SOC2 Cybersecurity & Compliance"
                    value={progForm.title}
                    onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Course Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Summary of learning outcomes..."
                    value={progForm.description}
                    onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Instructor / Facilitator</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Alan Vance"
                      value={progForm.instructor}
                      onChange={(e) => setProgForm({ ...progForm, instructor: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Hours)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={progForm.duration_hours}
                      onChange={(e) => setProgForm({ ...progForm, duration_hours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={progForm.start_date}
                      onChange={(e) => setProgForm({ ...progForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={progForm.end_date}
                      onChange={(e) => setProgForm({ ...progForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ENROLL EMPLOYEE MODAL
          ========================================== */}
      {showEnrollModal && (
        <div className="modal-backdrop" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserCheck size={20} color="var(--primary)" />
                <h3>Enroll Employee in Training</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowEnrollModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleEnroll}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Program *</label>
                  <select
                    className="form-control"
                    value={enrollForm.training_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, training_id: e.target.value })}
                    required
                  >
                    <option value="">Choose course...</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    value={enrollForm.employee_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Choose employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          UPDATE RECORD MODAL
          ========================================== */}
      {showUpdateRecordModal && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setShowUpdateRecordModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={20} color="var(--primary)" />
                <h3>Update Training Progress & Score</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowUpdateRecordModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateRecord}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Completion Status *</label>
                  <select
                    className="form-control"
                    value={updateRecordForm.completion_status}
                    onChange={(e) => setUpdateRecordForm({ ...updateRecordForm, completion_status: e.target.value })}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed / Certified</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="failed">Incomplete</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Evaluation Score (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 95"
                    value={updateRecordForm.score}
                    onChange={(e) => setUpdateRecordForm({ ...updateRecordForm, score: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Certificate URL / Document Link</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://..."
                    value={updateRecordForm.certificate_url}
                    onChange={(e) => setUpdateRecordForm({ ...updateRecordForm, certificate_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateRecordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

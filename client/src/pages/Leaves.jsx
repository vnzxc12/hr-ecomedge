import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  AlertCircle,
  X,
  MessageSquare,
  Calendar,
  Sliders,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Leaves() {
  const { isManager, showToast } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  // Apply Form
  const [applyForm, setApplyForm] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Quota Form (Manager)
  const [quotaForm, setQuotaForm] = useState({
    employee_id: '',
    vacation_days: 0,
    sick_days: 0,
    emergency_days: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const [leavesRes, empsRes] = await Promise.all([
          api.leaves.getAll({ status: statusFilter }),
          api.employees.getAll()
        ]);
        setLeaves(leavesRes.leaves || []);
        setEmployeesList(empsRes.employees || []);
        if (empsRes.employees?.length > 0 && !quotaForm.employee_id) {
          setQuotaForm(prev => ({ ...prev, employee_id: empsRes.employees[0].id }));
        }
      } else {
        const res = await api.leaves.getMy();
        setLeaves(res.leaves || []);
        setBalance(res.balance);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isManager, statusFilter]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.leaves.apply(applyForm);
      showToast('Leave request submitted. Awaiting manager approval.', 'success');
      confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
      setShowApplyModal(false);
      setApplyForm({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeave) return;
    setSubmitting(true);
    try {
      await api.leaves.review(selectedLeave.id, reviewStatus, reviewNotes);
      showToast(`Leave request ${reviewStatus}.`, 'success');
      if (reviewStatus === 'approved') {
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      }
      setShowReviewModal(false);
      setSelectedLeave(null);
      setReviewNotes('');
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!quotaForm.employee_id) {
      showToast('Please select an employee.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.leaves.updateBalance(quotaForm.employee_id, {
        vacation_days: parseInt(quotaForm.vacation_days, 10) || 0,
        sick_days: parseInt(quotaForm.sick_days, 10) || 0,
        emergency_days: parseInt(quotaForm.emergency_days, 10) || 0
      });
      showToast('Leave balances and quotas updated successfully!', 'success');
      setShowQuotaModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeSelectForQuota = async (empId) => {
    setQuotaForm(prev => ({ ...prev, employee_id: empId }));
    try {
      const res = await api.employees.getById(empId);
      if (res.leaveBalance) {
        setQuotaForm({
          employee_id: empId,
          vacation_days: res.leaveBalance.vacation_days || 0,
          sick_days: res.leaveBalance.sick_days || 0,
          emergency_days: res.leaveBalance.emergency_days || 0
        });
      } else {
        setQuotaForm({
          employee_id: empId,
          vacation_days: 0,
          sick_days: 0,
          emergency_days: 0
        });
      }
    } catch (err) {
      // silent fallback
    }
  };

  // Compute days count preview
  const getDaysCount = () => {
    if (!applyForm.start_date || !applyForm.end_date) return 0;
    const start = new Date(applyForm.start_date);
    const end = new Date(applyForm.end_date);
    if (end < start) return 0;
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            {isManager ? 'Leave Requests & Time-Off Approvals' : 'My Leave Management'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isManager
              ? 'Review pending time-off applications, assign leave day quotas (starts at 0), and track department coverage.'
              : 'Submit vacation or sick leave requests and check your remaining quotas.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isManager && (
            <button className="btn btn-secondary" onClick={() => setShowQuotaModal(true)}>
              <Sliders size={18} />
              <span>Manage Leave Quotas</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <Plus size={18} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Employee Balances Widget */}
      {!isManager && balance && (
        <div className="grid-kpi" style={{ marginBottom: '2rem' }}>
          <div className="stat-card emerald">
            <div className="stat-info">
              <div className="label">Vacation Leave Balance</div>
              <div className="value" style={{ color: 'var(--success)' }}>
                {balance.vacation_days - balance.vacation_used} Days Left
              </div>
              <div className="subtext">Used: {balance.vacation_used} of {balance.vacation_days} total allotted</div>
            </div>
            <div className="stat-icon emerald"><CalendarDays size={22} /></div>
          </div>

          <div className="stat-card amber">
            <div className="stat-info">
              <div className="label">Sick Leave Balance</div>
              <div className="value" style={{ color: 'var(--warning)' }}>
                {balance.sick_days - balance.sick_used} Days Left
              </div>
              <div className="subtext">Used: {balance.sick_used} of {balance.sick_days} total allotted</div>
            </div>
            <div className="stat-icon amber"><CheckCircle2 size={22} /></div>
          </div>

          <div className="stat-card cyan">
            <div className="stat-info">
              <div className="label">Emergency Leave Balance</div>
              <div className="value" style={{ color: 'var(--accent-cyan)' }}>
                {balance.emergency_days - balance.emergency_used} Days Left
              </div>
              <div className="subtext">Used: {balance.emergency_used} of {balance.emergency_days} total allotted</div>
            </div>
            <div className="stat-icon cyan"><AlertCircle size={22} /></div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {isManager && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '220px' }}>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Applications</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leaves List */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {isManager && <th>Employee</th>}
              <th>Leave Type</th>
              <th>Date Range</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Reviewer Feedback</th>
              {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading leave applications...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No leave requests recorded.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id}>
                  {isManager && (
                    <td>
                      <div style={{ fontWeight: '700' }}>{l.first_name} {l.last_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.employee_code} • {l.department}</div>
                    </td>
                  )}
                  <td>
                    <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                      {l.leave_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    {l.start_date} ~ {l.end_date}
                  </td>
                  <td><strong>{l.days_count}</strong> {l.days_count === 1 ? 'day' : 'days'}</td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>
                    "{l.reason}"
                  </td>
                  <td>
                    <span className={`badge badge-${l.status === 'approved' ? 'success' : (l.status === 'pending' ? 'warning' : 'danger')}`}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {l.review_notes || '-'}
                  </td>
                  {isManager && (
                    <td style={{ textAlign: 'right' }}>
                      {l.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setSelectedLeave(l);
                              setReviewStatus('approved');
                              setShowReviewModal(true);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setSelectedLeave(l);
                              setReviewStatus('rejected');
                              setShowReviewModal(true);
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedLeave(l);
                            setReviewStatus(l.status);
                            setReviewNotes(l.review_notes || '');
                            setShowReviewModal(true);
                          }}
                        >
                          Modify
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          APPLY LEAVE MODAL
          ========================================== */}
      {showApplyModal && (
        <div className="modal-backdrop" onClick={() => setShowApplyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CalendarDays size={20} color="var(--primary)" />
                <h3>Apply for Leave</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowApplyModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Category *</label>
                  <select
                    className="form-control"
                    value={applyForm.leave_type}
                    onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                  >
                    <option value="vacation">Vacation / Annual Leave</option>
                    <option value="sick">Sick / Medical Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="maternity_paternity">Maternity / Paternity Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={applyForm.start_date}
                      onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={applyForm.end_date}
                      onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {getDaysCount() > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
                    Total Leave Duration: {getDaysCount()} {getDaysCount() === 1 ? 'day' : 'days'}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Reason / Justification *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Briefly explain the reason for time off..."
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MANAGER MANAGE QUOTAS MODAL
          ========================================== */}
      {showQuotaModal && (
        <div className="modal-backdrop" onClick={() => setShowQuotaModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sliders size={20} color="var(--primary)" />
                <h3>Assign & Edit Leave Day Quotas</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowQuotaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuota}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Select an employee and set or edit their annual allotted leave balances (Vacation, Sick, and Emergency days).
                </p>

                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    value={quotaForm.employee_id}
                    onChange={(e) => handleEmployeeSelectForQuota(e.target.value)}
                    required
                  >
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code} - {emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vacation Days Allotted</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={quotaForm.vacation_days}
                      onChange={(e) => setQuotaForm({ ...quotaForm, vacation_days: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sick Days Allotted</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={quotaForm.sick_days}
                      onChange={(e) => setQuotaForm({ ...quotaForm, sick_days: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Days Allotted</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={quotaForm.emergency_days}
                      onChange={(e) => setQuotaForm({ ...quotaForm, emergency_days: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuotaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Leave Quotas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MANAGER REVIEW MODAL
          ========================================== */}
      {showReviewModal && selectedLeave && (
        <div className="modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MessageSquare size={20} color="var(--primary)" />
                <h3>Review Leave Application</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowReviewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    {selectedLeave.first_name} {selectedLeave.last_name} ({selectedLeave.employee_code})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {selectedLeave.leave_type.toUpperCase()} • {selectedLeave.start_date} to {selectedLeave.end_date} ({selectedLeave.days_count} days)
                  </div>
                  <div style={{ fontSize: '0.82rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    "{selectedLeave.reason}"
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Decision Status *</label>
                  <select
                    className="form-control"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                  >
                    <option value="approved">Approve Application</option>
                    <option value="rejected">Decline / Reject Application</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Manager Feedback / Comments</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Approved, please hand over pending tickets..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={`btn btn-${reviewStatus === 'approved' ? 'success' : 'danger'}`} disabled={submitting}>
                  {submitting ? 'Saving...' : `Confirm ${reviewStatus === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

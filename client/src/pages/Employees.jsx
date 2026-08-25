import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  KeyRound,
  X,
  Building,
  Briefcase,
  Phone,
  MapPin,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  Calendar,
  FolderLock,
  Laptop,
  GraduationCap
} from 'lucide-react';

export default function Employees() {
  const { isManager, showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: 'Engineering',
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: '',
    monthly_salary: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: '',
    bank_account_number: '',
    username: '',
    password: '',
    role: 'employee'
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.employees.getAll({ search, department, status });
      setEmployees(data.employees);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [search, department, status]);

  const handleOpenDetail = async (emp) => {
    setSelectedEmp(emp);
    setShowDetailModal(true);
    setActiveDetailTab('overview');
    try {
      const res = await api.employees.getById(emp.id);
      setEmpDetails(res);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.employees.create(formData);
      showToast('Employee and login credentials created successfully!', 'success');
      setShowAddModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        job_title: '',
        department: 'Engineering',
        employment_status: 'active',
        employment_type: 'full_time',
        hire_date: new Date().toISOString().split('T')[0],
        hourly_rate: '',
        monthly_salary: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        bank_name: '',
        bank_account_number: '',
        username: '',
        password: '',
        role: 'employee'
      });
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedEmp?.user_id) {
      showToast('No user account linked to this employee.', 'danger');
      return;
    }
    setSubmitting(true);
    try {
      await api.auth.resetPassword(selectedEmp.user_id, resetPasswordVal);
      showToast(`Password for @${selectedEmp.username} updated!`, 'success');
      setShowResetModal(false);
      setResetPasswordVal('');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Are you sure you want to deactivate ${emp.first_name} ${emp.last_name}?`)) return;
    try {
      await api.employees.delete(emp.id);
      showToast('Employee status set to Terminated.', 'info');
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>Employee Directory & Records</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage staff profiles, contracts, compensation settings, and user access credentials.
          </p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, code, job title..."
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>

          <div>
            <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design & Product">Design & Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Human Resources">Human Resources</option>
            </select>
          </div>

          <div>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="probationary">Probationary</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Status</th>
              {isManager && <th>Compensation</th>}
              <th>Account (Login)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading employee records...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No employees matching current filter.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="user-avatar">
                        {emp.first_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {emp.employee_code} • Hired {emp.hire_date}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department}</td>
                  <td>{emp.job_title}</td>
                  <td>
                    <span className={`badge badge-${emp.employment_status === 'active' ? 'success' : (emp.employment_status === 'probationary' ? 'warning' : 'danger')}`}>
                      {emp.employment_status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>
                        {emp.monthly_salary > 0 ? `₱${emp.monthly_salary.toLocaleString()} / mo` : `₱${emp.hourly_rate}/hr`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {emp.employment_type === 'full_time' ? 'Full Time' : 'Contract/Part'}
                      </div>
                    </td>
                  )}
                  <td>
                    {emp.username ? (
                      <span className="badge badge-purple" style={{ fontFamily: 'monospace' }}>
                        @{emp.username} ({emp.role})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No account</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon"
                        title="View Full Profile"
                        onClick={() => handleOpenDetail(emp)}
                      >
                        <Eye size={16} />
                      </button>

                      {isManager && (
                        <>
                          <button
                            className="btn-icon"
                            title="Reset Password"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setShowResetModal(true);
                            }}
                          >
                            <KeyRound size={16} color="var(--accent-purple)" />
                          </button>

                          {emp.employment_status !== 'terminated' && (
                            <button
                              className="btn-icon"
                              title="Deactivate / Terminate"
                              onClick={() => handleDeactivate(emp)}
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          ADD EMPLOYEE MODAL (With Username & Password)
          ========================================== */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserPlus size={22} color="var(--primary)" />
                <h3>Add New Employee & Login Account</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body">
                {/* 1. Account Credentials */}
                <div style={{ background: 'var(--primary-light)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-focus)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ShieldCheck size={18} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>1. Portal Login Credentials (Username & Password)</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Username (No Email Needed) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. alex.turner"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initial Password *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. password123"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Role</label>
                      <select
                        className="form-control"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="employee">Employee (Self-Service)</option>
                        <option value="manager">Manager / Owner (Full Access)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Personal Information */}
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>2. Personal Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Alex"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Turner"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Residential Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Street, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jane Turner"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+1 (555) 999-9999"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Job & Compensation */}
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>3. Job Title & Compensation</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Frontend Engineer"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design & Product">Design & Product</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                      <option value="Human Resources">Human Resources</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hire Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (₱)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 50000"
                      value={formData.monthly_salary}
                      onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hourly Rate (₱)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 250"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Type</label>
                    <select
                      className="form-control"
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>

                {/* 4. Bank Information */}
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>4. Bank Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chase Bank"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Account / IBAN</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. **** 4910"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Employee...' : 'Save & Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          EMPLOYEE DETAILS DRAWER MODAL
          ========================================== */}
      {showDetailModal && selectedEmp && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="user-avatar" style={{ width: '42px', height: '42px' }}>
                  {selectedEmp.first_name[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>
                    {selectedEmp.first_name} {selectedEmp.last_name}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {selectedEmp.employee_code} • {selectedEmp.job_title} ({selectedEmp.department})
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', overflowX: 'auto' }}>
              <button
                className={`btn btn-sm ${activeDetailTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveDetailTab('overview')}
              >
                Overview
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'timelogs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveDetailTab('timelogs')}
              >
                Time Logs ({empDetails?.recentLogs?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveDetailTab('leaves')}
              >
                Leaves ({empDetails?.recentLeaves?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveDetailTab('documents')}
              >
                Documents ({empDetails?.documents?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'assets' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveDetailTab('assets')}
              >
                Assets ({empDetails?.assets?.length || 0})
              </button>
            </div>

            <div className="modal-body">
              {activeDetailTab === 'overview' && (
                <div>
                  <div className="grid-kpi" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                      <div className="stat-info">
                        <div className="label">Monthly Salary</div>
                        <div className="value">₱{(selectedEmp.monthly_salary || 0).toLocaleString()}</div>
                        <div className="subtext">Hourly: ₱{selectedEmp.hourly_rate}/hr</div>
                      </div>
                    </div>
                    <div className="stat-card emerald">
                      <div className="stat-info">
                        <div className="label">Vacation Balance</div>
                        <div className="value" style={{ color: 'var(--success)' }}>
                          {empDetails?.leaveBalance ? (empDetails.leaveBalance.vacation_days - empDetails.leaveBalance.vacation_used) : 15} Days
                        </div>
                        <div className="subtext">Sick Days Left: {empDetails?.leaveBalance ? (empDetails.leaveBalance.sick_days - empDetails.leaveBalance.sick_used) : 10}</div>
                      </div>
                    </div>
                    <div className="stat-card cyan">
                      <div className="stat-info">
                        <div className="label">Assigned Gear</div>
                        <div className="value" style={{ color: 'var(--accent-cyan)' }}>{empDetails?.assets?.length || 0}</div>
                        <div className="subtext">Hardware assets</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Contact & Personal</h4>
                      <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div><strong>Phone:</strong> {selectedEmp.phone || 'Not provided'}</div>
                        <div><strong>Address:</strong> {selectedEmp.address || 'Not provided'}</div>
                        <div><strong>Emergency Contact:</strong> {selectedEmp.emergency_contact_name || 'N/A'} ({selectedEmp.emergency_contact_phone || 'N/A'})</div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Banking & Payroll</h4>
                      <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div><strong>Bank Name:</strong> {selectedEmp.bank_name || 'Not configured'}</div>
                        <div><strong>Account No:</strong> {selectedEmp.bank_account_number || 'Not configured'}</div>
                        <div><strong>Employment Type:</strong> {selectedEmp.employment_type}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'timelogs' && (
                <div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Break</th>
                        <th>Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empDetails?.recentLogs?.map((log) => (
                        <tr key={log.id}>
                          <td>{log.date}</td>
                          <td>{new Date(log.clock_in).toLocaleTimeString()}</td>
                          <td>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '--:--'}</td>
                          <td>{log.break_duration_mins || 0}m</td>
                          <td>{log.total_hours} hrs</td>
                          <td><span className="badge badge-neutral">{log.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'documents' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {empDetails?.documents?.map((doc) => (
                      <div key={doc.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <FolderLock size={18} color="var(--primary)" />
                          <div style={{ fontWeight: '700', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                          Category: {doc.category}
                        </div>
                        <a href={doc.file_path} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                          Download / View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailTab === 'assets' && (
                <div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Asset Tag</th>
                        <th>Equipment Name</th>
                        <th>Category</th>
                        <th>Assigned Date</th>
                        <th>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empDetails?.assets?.map((ast) => (
                        <tr key={ast.id}>
                          <td style={{ fontWeight: '700' }}>{ast.asset_tag}</td>
                          <td>{ast.name}</td>
                          <td>{ast.category}</td>
                          <td>{ast.assigned_date}</td>
                          <td><span className="badge badge-success">{ast.condition}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          RESET PASSWORD MODAL
          ========================================== */}
      {showResetModal && selectedEmp && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <KeyRound size={20} color="var(--accent-purple)" />
                <h3>Reset Employee Password</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowResetModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Set a new password for <strong>{selectedEmp.first_name} {selectedEmp.last_name}</strong> (@{selectedEmp.username}).
                </p>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter new password..."
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

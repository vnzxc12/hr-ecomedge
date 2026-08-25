import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  KeyRound,
  ShieldCheck,
  Building,
  Phone,
  MapPin,
  Calendar,
  Banknote,
  FolderLock,
  Clock,
  Laptop,
  CheckCircle2,
  X,
  Copy,
  Check,
  Camera,
  Upload,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Employees() {
  const { isManager, showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showLeaveQuotaModal, setShowLeaveQuotaModal] = useState(false);

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Photo upload
  const drawerPhotoInputRef = useRef(null);
  const addModalPhotoInputRef = useRef(null);
  const [uploadingDrawerPhoto, setUploadingDrawerPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // Add Employee Form
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: 'Operations',
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: '',
    monthly_salary: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: 'BDO',
    bank_account_number: '',
    username: '',
    password: '',
    role: 'employee'
  });

  // Edit Employee Form
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: 'Operations',
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: '',
    hourly_rate: '',
    monthly_salary: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: '',
    bank_account_number: ''
  });

  // Leave Quota Form for Selected Employee
  const [empQuotaForm, setEmpQuotaForm] = useState({
    vacation_days: 0,
    sick_days: 0,
    emergency_days: 0
  });

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.employees.getAll({ search, department, status });
      setEmployees(res.employees || []);
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
    try {
      const res = await api.employees.getById(emp.id);
      setEmpDetails(res);
      if (res.leaveBalance) {
        setEmpQuotaForm({
          vacation_days: res.leaveBalance.vacation_days || 0,
          sick_days: res.leaveBalance.sick_days || 0,
          emergency_days: res.leaveBalance.emergency_days || 0
        });
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmp(emp);
    setEditFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      job_title: emp.job_title || '',
      department: emp.department || 'Operations',
      employment_status: emp.employment_status || 'active',
      employment_type: emp.employment_type || 'full_time',
      hire_date: emp.hire_date || '',
      hourly_rate: emp.hourly_rate || '',
      monthly_salary: emp.monthly_salary || '',
      phone: emp.phone || '',
      address: emp.address || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      bank_name: emp.bank_name || 'BDO',
      bank_account_number: emp.bank_account_number || ''
    });
    setShowEditModal(true);
  };

  const handleAddModalPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleDrawerPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmp) return;

    const fd = new FormData();
    fd.append('avatar', file);

    setUploadingDrawerPhoto(true);
    try {
      const res = await api.employees.uploadAvatar(selectedEmp.id, fd);
      showToast(res.message, 'success');
      setSelectedEmp(prev => ({ ...prev, avatar_url: res.avatar_url }));
      if (empDetails?.employee) {
        setEmpDetails(prev => ({
          ...prev,
          employee: { ...prev.employee, avatar_url: res.avatar_url }
        }));
      }
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setUploadingDrawerPhoto(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      const res = await api.employees.create(payload);
      showToast(res.message, 'success');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      if (avatarFile && res.employee?.id) {
        try {
          const fd = new FormData();
          fd.append('avatar', avatarFile);
          await api.employees.uploadAvatar(res.employee.id, fd);
        } catch (err) {
          console.warn('Avatar upload skipped:', err.message);
        }
      }

      // Show generated credentials modal
      if (res.credentials) {
        setCreatedCredentials({
          name: `${formData.first_name} ${formData.last_name}`,
          username: res.credentials.username,
          password: res.credentials.password,
          role: res.credentials.role
        });
        setShowCredentialsModal(true);
      }

      setShowAddModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setFormData({
        first_name: '',
        last_name: '',
        job_title: '',
        department: 'Operations',
        employment_status: 'active',
        employment_type: 'full_time',
        hire_date: new Date().toISOString().split('T')[0],
        hourly_rate: '',
        monthly_salary: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        bank_name: 'BDO',
        bank_account_number: '',
        username: '',
        password: '',
        role: 'employee'
      });
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      const res = await api.employees.update(selectedEmp.id, editFormData);
      showToast('Employee information updated successfully!', 'success');
      setShowEditModal(false);
      if (selectedEmp.id === empDetails?.employee?.id) {
        const refreshed = await api.employees.getById(selectedEmp.id);
        setEmpDetails(refreshed);
        setSelectedEmp(refreshed.employee);
      }
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleSaveEmpQuota = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      await api.leaves.updateBalance(selectedEmp.id, {
        vacation_days: parseInt(empQuotaForm.vacation_days, 10) || 0,
        sick_days: parseInt(empQuotaForm.sick_days, 10) || 0,
        emergency_days: parseInt(empQuotaForm.emergency_days, 10) || 0
      });
      showToast('Leave quotas updated successfully!', 'success');
      setShowLeaveQuotaModal(false);
      const res = await api.employees.getById(selectedEmp.id);
      setEmpDetails(res);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedEmp?.user_id) {
      showToast('This employee does not have a user account linked.', 'warning');
      return;
    }
    try {
      const res = await api.auth.resetPassword(selectedEmp.user_id, newPassword);
      showToast(res.message, 'success');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Are you sure you want to terminate/deactivate ${emp.first_name} ${emp.last_name}?`)) {
      return;
    }
    try {
      const res = await api.employees.delete(emp.id);
      showToast(res.message, 'info');
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>Employee Directory & Profiles</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Comprehensive workforce records, profile photos, edit information, credentials management, and departmental allocations.
          </p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by name, employee code, job title, department..."
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
                      <div className="user-avatar" style={{ overflow: 'hidden' }}>
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          emp.first_name[0]
                        )}
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
                            title="Edit Employee Info"
                            onClick={() => handleOpenEdit(emp)}
                            style={{ color: 'var(--brand-green)' }}
                          >
                            <Edit size={16} />
                          </button>

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
          ADD EMPLOYEE MODAL
          ========================================== */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserPlus size={22} color="var(--primary)" />
                <h3>Add New Employee</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body">
                {/* Photo & Basic Info Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ position: 'relative' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', overflow: 'hidden' }}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={26} color="var(--text-muted)" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addModalPhotoInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '26px',
                        height: '26px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-green)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <Camera size={12} />
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={addModalPhotoInputRef}
                    onChange={handleAddModalPhotoSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Profile Photo (Optional)</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Click the camera icon to select a profile image for this employee.
                    </p>
                  </div>
                </div>

                {/* 1. Account Credentials & Access Level */}
                <div style={{ background: 'var(--primary-light)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-focus)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <ShieldCheck size={18} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>1. Portal Login Credentials (Automatic Employee Access)</h4>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                    ✨ If username or password are left empty, they will be <strong>auto-generated</strong> (e.g. <code>firstname.lastname</code> and <code>password123</code>) with standard employee access.
                  </p>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Username (Optional - Auto generated)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Leave blank to auto-generate"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initial Password (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Default: password123"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Role</label>
                      <select
                        className="form-control"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="employee">👤 Employee (Self-Service Access)</option>
                        <option value="manager">👑 Manager / Owner (Full Access)</option>
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
                      placeholder="+63 900 000 0000"
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
                      placeholder="e.g. Makati City, Metro Manila"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maria Turner (Spouse)"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+63 900 000 0000"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Job & Compensation */}
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>3. Job Title & Compensation (PHP ₱)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. E-Commerce Analyst"
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
                      <option value="Operations">Operations</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design & Product">Design & Product</option>
                      <option value="Marketing">Marketing</option>
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
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>4. Banking & Direct Deposit</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. BDO, BPI, UnionBank, GCash"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="**** 1234"
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
                <button type="submit" className="btn btn-primary">
                  Create Employee & Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT EMPLOYEE MODAL (Manager / Admin)
          ========================================== */}
      {showEditModal && selectedEmp && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit size={22} color="var(--primary)" />
                <h3>Edit Employee: {selectedEmp.first_name} {selectedEmp.last_name}</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee}>
              <div className="modal-body">
                {/* 1. Basic Details */}
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>1. Basic & Contact Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Residential Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.emergency_contact_name}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.emergency_contact_phone}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* 2. Position & Status */}
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>2. Role, Department & Status</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.job_title}
                      onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    >
                      <option value="Operations">Operations</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design & Product">Design & Product</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Human Resources">Human Resources</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Status</label>
                    <select
                      className="form-control"
                      value={editFormData.employment_status}
                      onChange={(e) => setEditFormData({ ...editFormData, employment_status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="probationary">Probationary</option>
                      <option value="resigned">Resigned</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hire Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editFormData.hire_date}
                      onChange={(e) => setEditFormData({ ...editFormData, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (₱)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editFormData.monthly_salary}
                      onChange={(e) => setEditFormData({ ...editFormData, monthly_salary: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hourly Rate (₱)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editFormData.hourly_rate}
                      onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Banking Information */}
                <h4 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>3. Banking & Direct Deposit</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.bank_name}
                      onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.bank_account_number}
                      onChange={(e) => setEditFormData({ ...editFormData, bank_account_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          CREDENTIALS CONFIRMATION MODAL
          ========================================== */}
      {showCredentialsModal && createdCredentials && (
        <div className="modal-backdrop" onClick={() => setShowCredentialsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ background: 'var(--brand-green-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle2 size={22} color="var(--brand-green)" />
                <h3 style={{ color: 'var(--brand-navy)' }}>Employee Credentials Created!</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowCredentialsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                The login account for <strong>{createdCredentials.name}</strong> has been created with <strong>Employee Self-Service Access</strong>.
              </p>

              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Username</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--brand-navy)' }}>{createdCredentials.username}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Initial Password</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--brand-green)' }}>{createdCredentials.password}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Access Role</span>
                  <span className="badge badge-success">{createdCredentials.role}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => copyToClipboard(`Username: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`)}
              >
                {copied ? <Check size={16} color="var(--brand-green)" /> : <Copy size={16} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Login Credentials'}</span>
              </button>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowCredentialsModal(false)}>
                Done
              </button>
            </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <div className="user-avatar" style={{ width: '52px', height: '52px', fontSize: '1.25rem', overflow: 'hidden' }}>
                    {selectedEmp.avatar_url ? (
                      <img src={selectedEmp.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedEmp.first_name[0]
                    )}
                  </div>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => drawerPhotoInputRef.current?.click()}
                      title="Upload Employee Photo"
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-green)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <Camera size={12} />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={drawerPhotoInputRef}
                  onChange={handleDrawerPhotoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3>{selectedEmp.first_name} {selectedEmp.last_name}</h3>
                    {isManager && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(selectedEmp)}
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        <Edit size={12} /> Edit Info
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedEmp.employee_code} • {selectedEmp.job_title} ({selectedEmp.department})
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Detail Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
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
                          {empDetails?.leaveBalance ? (empDetails.leaveBalance.vacation_days - empDetails.leaveBalance.vacation_used) : 0} Days
                        </div>
                        <div className="subtext">Sick Days Left: {empDetails?.leaveBalance ? (empDetails.leaveBalance.sick_days - empDetails.leaveBalance.sick_used) : 0}</div>
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
                        <div><strong>Hire Date:</strong> {selectedEmp.hire_date}</div>
                        <div><strong>Type:</strong> {selectedEmp.employment_type}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'leaves' && (
                <div>
                  {isManager && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Annual Leave Quotas & Balances</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Vacation: {empDetails?.leaveBalance?.vacation_days || 0}d (Used: {empDetails?.leaveBalance?.vacation_used || 0}d) • Sick: {empDetails?.leaveBalance?.sick_days || 0}d (Used: {empDetails?.leaveBalance?.sick_used || 0}d) • Emergency: {empDetails?.leaveBalance?.emergency_days || 0}d
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowLeaveQuotaModal(true)}>
                        <Sliders size={14} /> Adjust Quotas
                      </button>
                    </div>
                  )}

                  <table className="table">
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Dates</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empDetails?.recentLeaves?.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No leave requests recorded.</td>
                        </tr>
                      ) : (
                        empDetails?.recentLeaves?.map((l) => (
                          <tr key={l.id}>
                            <td style={{ textTransform: 'capitalize', fontWeight: '700' }}>{l.leave_type}</td>
                            <td>{l.start_date} ~ {l.end_date}</td>
                            <td>{l.days_count} days</td>
                            <td><span className={`badge badge-${l.status === 'approved' ? 'success' : (l.status === 'pending' ? 'warning' : 'danger')}`}>{l.status}</span></td>
                            <td style={{ fontSize: '0.8rem' }}>"{l.reason}"</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
          SINGLE EMPLOYEE LEAVE QUOTA MODAL
          ========================================== */}
      {showLeaveQuotaModal && selectedEmp && (
        <div className="modal-backdrop" onClick={() => setShowLeaveQuotaModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sliders size={20} color="var(--primary)" />
                <h3>Set Leave Quotas for {selectedEmp.first_name}</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowLeaveQuotaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmpQuota}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Vacation Days Allotted</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={empQuotaForm.vacation_days}
                    onChange={(e) => setEmpQuotaForm({ ...empQuotaForm, vacation_days: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sick Days Allotted</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={empQuotaForm.sick_days}
                    onChange={(e) => setEmpQuotaForm({ ...empQuotaForm, sick_days: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Days Allotted</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={empQuotaForm.emergency_days}
                    onChange={(e) => setEmpQuotaForm({ ...empQuotaForm, emergency_days: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLeaveQuotaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Leave Quotas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          RESET PASSWORD MODAL (Manager only)
          ========================================== */}
      {showResetModal && selectedEmp && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <KeyRound size={20} color="var(--accent-purple)" />
                <h3>Reset Password for @{selectedEmp.username}</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowResetModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Set a new password for employee <strong>{selectedEmp.first_name} {selectedEmp.last_name}</strong>.
                </p>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

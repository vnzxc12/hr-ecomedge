import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  FolderKanban,
  FolderLock,
  FileText,
  Clock,
  Banknote,
  Award,
  CalendarDays,
  GraduationCap,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  UserCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  X,
  Eye,
  ShieldCheck,
  Key,
  Camera,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

export default function Employees() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Loading States for Actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Single Employee Profile View State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('overview'); // overview, attendance, payroll, documents, leave, projects, performance, training, assets

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);

  // Forms
  const [empForm, setEmpForm] = useState({
    first_name: '',
    last_name: '',
    job_title: 'Research Analyst',
    department: 'Research & Analytics',
    team_id: '',
    designation_id: '',
    manager_id: '',
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: 187.50,
    monthly_salary: 30000.00,
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: 'BDO',
    bank_account_number: '',
    username: '',
    password: 'password123',
    role: 'employee',
    avatar_url: ''
  });

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: 'Research & Analytics',
    team_id: '',
    designation_id: '',
    manager_id: '',
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: '',
    hourly_rate: 0,
    monthly_salary: 0,
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: '',
    bank_account_number: '',
    role: 'employee',
    password: '',
    avatar_url: ''
  });

  const [docForm, setDocForm] = useState({
    title: '',
    category: 'employment',
    expiration_date: '',
    file: null
  });

  // Guard query execution until auth is fully resolved
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadEmployees();
    loadMeta();
  }, [token, user?.id, authLoading, teamFilter, deptFilter, statusFilter]);

  const loadEmployees = async () => {
    setLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const params = {};
      if (search) params.search = search;
      if (teamFilter) params.team_id = teamFilter;
      if (deptFilter) params.department = deptFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.employees.getAll(params);
      setEmployees(res.employees || []);
    } catch (err) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to retrieve workforce directory.');
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [teamRes, desigRes] = await Promise.all([
        api.teams.getAll(),
        api.teams.getDesignations()
      ]);
      setTeams(teamRes.teams || []);
      setDesignations(desigRes.designations || []);
    } catch (e) {}
  };

  const handleSelectEmployee = async (id) => {
    setSelectedEmployeeId(id);
    setProfileTab('overview');
    setProfileLoading(true);
    try {
      const res = await api.employees.getById(id);
      setProfileData(res);
    } catch (err) {
      showToast(err.message, 'danger');
      setSelectedEmployeeId(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenEdit = (emp) => {
    setEditingEmpId(emp.id);
    setEditForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      job_title: emp.job_title || '',
      department: emp.department || 'Research & Analytics',
      team_id: emp.team_id || '',
      designation_id: emp.designation_id || '',
      manager_id: emp.manager_id || '',
      employment_status: emp.employment_status || 'active',
      employment_type: emp.employment_type || 'full_time',
      hire_date: emp.hire_date || '',
      hourly_rate: emp.hourly_rate || 0,
      monthly_salary: emp.monthly_salary || 0,
      phone: emp.phone || '',
      address: emp.address || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      bank_name: emp.bank_name || 'BDO',
      bank_account_number: emp.bank_account_number || '',
      role: emp.role || 'employee',
      password: '',
      avatar_url: emp.avatar_url || ''
    });
    setShowEditModal(true);
  };

  const handleDirectAvatarUpload = async (empId, file) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      // Convert file to Base64 data URL for fast and reliable upload
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result;
        try {
          const res = await api.employees.uploadAvatar(empId, JSON.stringify({ avatar_url: base64Url }), true);
          showToast('Employee photo updated successfully!', 'success');
          if (profileData && profileData.employee) {
            setProfileData({
              ...profileData,
              employee: { ...profileData.employee, avatar_url: res.avatar_url || base64Url }
            });
          }
          loadEmployees();
        } catch (uploadErr) {
          // Fallback to multipart FormData
          const formData = new FormData();
          formData.append('avatar', file);
          const res = await api.employees.uploadAvatar(empId, formData);
          showToast('Employee photo updated successfully!', 'success');
          if (profileData && profileData.employee) {
            setProfileData({
              ...profileData,
              employee: { ...profileData.employee, avatar_url: res.avatar_url }
            });
          }
          loadEmployees();
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast(err.message, 'danger');
      setUploadingAvatar(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.employees.create(empForm);
      showToast('Employee created successfully!', 'success');
      setShowAddModal(false);
      setEmpForm({
        first_name: '',
        last_name: '',
        job_title: 'Research Analyst',
        department: 'Research & Analytics',
        team_id: '',
        designation_id: '',
        manager_id: '',
        employment_status: 'active',
        employment_type: 'full_time',
        hire_date: new Date().toISOString().split('T')[0],
        hourly_rate: 187.50,
        monthly_salary: 30000.00,
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        bank_name: 'BDO',
        bank_account_number: '',
        username: '',
        password: 'password123',
        role: 'employee',
        avatar_url: ''
      });
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.employees.update(editingEmpId, editForm);
      showToast('Employee updated successfully!', 'success');
      setShowEditModal(false);
      loadEmployees();
      if (selectedEmployeeId === editingEmpId) {
        handleSelectEmployee(editingEmpId);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docForm.file) {
      return showToast('Please select a file to upload.', 'warning');
    }

    setIsDocUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', docForm.file);
      formData.append('title', docForm.title || docForm.file.name);
      formData.append('category', docForm.category);
      formData.append('employee_id', selectedEmployeeId);
      if (docForm.expiration_date) {
        formData.append('expiration_date', docForm.expiration_date);
      }

      await api.documents.upload(formData);
      showToast('Document uploaded successfully!', 'success');
      setShowDocUploadModal(false);
      setDocForm({ title: '', category: 'employment', expiration_date: '', file: null });
      handleSelectEmployee(selectedEmployeeId);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setIsDocUploading(false);
    }
  };

  // ==========================================
  // VIEW: SINGLE EMPLOYEE 9-TAB PROFILE
  // ==========================================
  if (selectedEmployeeId && profileData) {
    const emp = profileData.employee;
    const leave = profileData.leaveBalance;
    const logs = profileData.recentLogs || [];
    const docs = profileData.documents || [];
    const prjs = profileData.projects || [];
    const revs = profileData.performanceReviews || [];
    const slips = profileData.payslips || [];
    const assets = profileData.assets || [];
    const trainings = profileData.trainings || [];

    return (
      <div className="page-container">
        {/* Top Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedEmployeeId(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={15} /> Back to Directory
          </button>

          {isManager && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenEdit(emp)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit2 size={14} /> Edit Employee Profile
            </button>
          )}
        </div>

        {/* Rich Header Card */}
        <div className="glass-card employee-header-card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Interactive Circular Avatar with Camera Upload */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div className="user-avatar" style={{ width: '82px', height: '82px', fontSize: '1.8rem', border: '3px solid var(--brand-green)' }}>
                {emp.avatar_url ? <img src={emp.avatar_url} alt="Profile" /> : emp.first_name[0]}
              </div>
              {isManager && (
                <label
                  htmlFor="profile-header-avatar-upload"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '28px',
                    height: '28px',
                    background: 'var(--brand-green)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-card)'
                  }}
                  title="Upload / Change Employee Picture"
                >
                  {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  <input
                    id="profile-header-avatar-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDirectAvatarUpload(emp.id, e.target.files[0]);
                    }}
                  />
                </label>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                  {emp.first_name} {emp.last_name}
                </h1>
                <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                  {emp.employee_code}
                </span>
                <span className={`badge ${emp.role === 'manager' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.75rem' }}>
                  {emp.role === 'manager' ? '👑 HR / Admin' : '👤 Employee'}
                </span>
                <span className={`badge ${emp.employment_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {emp.employment_status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-green)', marginTop: '0.25rem' }}>
                {emp.job_title} • {emp.team_name || emp.department}
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span><Mail size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {emp.first_name.toLowerCase()}.{emp.last_name.toLowerCase()}@ecomedge.ph</span>
                <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {emp.phone || 'No phone'}</span>
                <span><UserCheck size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Manager: <strong>{emp.manager_first_name ? `${emp.manager_first_name} ${emp.manager_last_name}` : 'Executive Director'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 9-Tab Navigation */}
        <div className="subtabs-bar" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: Clock },
            { id: 'payroll', label: 'Payroll', icon: Banknote },
            { id: 'documents', label: `Documents (${docs.length})`, icon: FolderLock },
            { id: 'leave', label: 'Leave', icon: CalendarDays },
            { id: 'projects', label: `Projects (${prjs.length})`, icon: FolderKanban },
            { id: 'performance', label: `Performance (${revs.length})`, icon: Award },
            { id: 'training', label: `Training (${trainings.length})`, icon: GraduationCap },
            { id: 'assets', label: `Assets (${assets.length})`, icon: Laptop }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`subtab-btn ${profileTab === tab.id ? 'active' : ''}`}
                onClick={() => setProfileTab(tab.id)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {profileTab === 'overview' && (
          <div className="grid-responsive-cards">
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Personal &amp; Contact Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Full Name:</span> <strong>{emp.first_name} {emp.last_name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone Number:</span> <strong>{emp.phone || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <strong>{emp.address || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Emergency Contact:</span> <strong>{emp.emergency_contact_name || 'N/A'} ({emp.emergency_contact_phone || 'N/A'})</strong></div>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Employment &amp; Agency Role
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Team:</span> <strong style={{ color: 'var(--brand-green)' }}>{emp.team_name || 'General'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Department:</span> <strong>{emp.department}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Designation:</span> <strong>{emp.designation_title || emp.job_title}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>System Access:</span> <strong style={{ color: emp.role === 'manager' ? 'var(--warning)' : 'inherit' }}>{emp.role === 'manager' ? 'HR / Manager (Full Admin Rights)' : 'Standard Employee'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Employment Type:</span> <strong style={{ textTransform: 'capitalize' }}>{emp.employment_type?.replace('_', ' ')}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Hire Date:</span> <strong>{emp.hire_date}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE */}
        {profileTab === 'attendance' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance records logged yet.</td></tr>
                  ) : (
                    logs.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.date}</strong></td>
                        <td>{l.clock_in ? new Date(l.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>{l.clock_out ? new Date(l.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}</td>
                        <td><strong>{l.total_hours} hrs</strong></td>
                        <td><span className="badge badge-success">{l.status}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYROLL */}
        {profileTab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>BASIC SALARY</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-green)' }}>₱{emp.monthly_salary?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>HOURLY RATE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>₱{emp.hourly_rate?.toFixed(2)}/hr</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>BANK ACCOUNT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{emp.bank_name} - {emp.bank_account_number || 'N/A'}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800 }}>
                Payslip History
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Gross Pay</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slips.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No payslips issued yet.</td></tr>
                    ) : (
                      slips.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.period_start} – {s.period_end}</strong></td>
                          <td>₱{s.gross_pay?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td>₱{(s.tax_deduction + s.social_deductions + s.other_deductions)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td><strong style={{ color: 'var(--brand-green)' }}>₱{s.net_pay?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                          <td><span className="badge badge-success">{s.payment_status || 'Paid'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENTS VAULT */}
        {profileTab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Document Vault &amp; Credentials</h3>
              {isManager && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowDocUploadModal(true)}>
                  <Upload size={14} /> Upload Document
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {docs.length === 0 ? (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No documents uploaded for this employee yet.
                </div>
              ) : (
                docs.map(d => (
                  <div key={d.id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {d.category}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {d.status || 'Valid'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                      {d.title}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {d.file_name} • {(d.file_size / 1024).toFixed(0)} KB
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''}
                      </span>
                      <a
                        href={d.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Download size={13} /> View File
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LEAVE */}
        {profileTab === 'leave' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Leave Balance &amp; Quotas ({new Date().getFullYear()})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VACATION LEAVE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-green)' }}>
                  {leave ? (leave.vacation_days - leave.vacation_used) : 0} / {leave?.vacation_days || 0} Days
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SICK LEAVE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--info)' }}>
                  {leave ? (leave.sick_days - leave.sick_used) : 0} / {leave?.sick_days || 0} Days
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMERGENCY LEAVE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--warning)' }}>
                  {leave ? (leave.emergency_days - leave.emergency_used) : 0} / {leave?.emergency_days || 0} Days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PROJECTS */}
        {profileTab === 'projects' && (
          <div className="grid-responsive-cards">
            {prjs.length === 0 ? (
              <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No active project assignments.
              </div>
            ) : (
              prjs.map(p => (
                <div key={p.id} className="glass-card">
                  <span className="badge badge-success" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>{p.client_name}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem' }}>{p.project_name}</h4>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Role: <strong>{p.role_on_project}</strong> ({p.allocation_percent}% Allocation)
                  </div>
                  <span className="badge badge-neutral">{p.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 7: PERFORMANCE */}
        {profileTab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {revs.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No performance reviews recorded yet.
              </div>
            ) : (
              revs.map(r => (
                <div key={r.id} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{r.review_period}</strong>
                    <span className="badge badge-success">Rating: {r.rating} / 5.0</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.manager_comments}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 8: TRAINING */}
        {profileTab === 'training' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {trainings.length === 0 ? (
              <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No training courses enrolled.
              </div>
            ) : (
              trainings.map(t => (
                <div key={t.id} className="glass-card">
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.3rem' }}>{t.title}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Instructor: {t.instructor} • {t.duration_hours}h</div>
                  <div style={{ marginTop: '0.75rem' }}><span className="badge badge-success">{t.completion_status}</span></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 9: ASSETS */}
        {profileTab === 'assets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {assets.length === 0 ? (
              <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No equipment assigned to this staff member.
              </div>
            ) : (
              assets.map(a => (
                <div key={a.id} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="badge badge-success">{a.category}</span>
                    <span className="badge badge-neutral">{a.condition}</span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.2rem' }}>{a.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tag: {a.asset_tag} • SN: {a.model_serial || 'N/A'}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Upload Document Modal */}
        {showDocUploadModal && (
          <div className="modal-backdrop">
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Upload Employee Document</h3>
                <button type="button" className="btn-icon" onClick={() => setShowDocUploadModal(false)} title="Close">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUploadDocument}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Document Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Employment Contract 2026"
                      value={docForm.title}
                      onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Category</label>
                      <select
                        className="form-control"
                        value={docForm.category}
                        onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                      >
                        <option value="employment">Employment Contract / NDA</option>
                        <option value="id">Government / Company ID</option>
                        <option value="cert">Certificate / Training</option>
                        <option value="policy">Policy Acknowledgement</option>
                        <option value="other">Other Documents</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Expiration Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={docForm.expiration_date}
                        onChange={(e) => setDocForm({ ...docForm, expiration_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select File (PDF, DOCX, PNG, JPG) *</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) => setDocForm({ ...docForm, file: e.target.files[0] })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDocUploadModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Upload Document</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && (
          <div className="modal-backdrop">
            <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Edit Employee Profile</h3>
                <button type="button" className="btn-icon" onClick={() => setShowEditModal(false)} title="Close">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdateEmployee}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
                  {/* Photo Upload Section in Edit Modal */}
                  <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Camera size={16} color="var(--brand-green)" /> Profile Picture / Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem' }}>
                      <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.3rem', border: '2px solid var(--brand-green)', flexShrink: 0 }}>
                        {editForm.avatar_url ? <img src={editForm.avatar_url} alt="Avatar Preview" /> : (editForm.first_name ? editForm.first_name[0] : 'U')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/*"
                          className="form-control"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({ ...editForm, avatar_url: reader.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                          Upload JPG, PNG or WEBP image. Image is automatically cropped to circular avatar.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Role Selector */}
                  <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} color="var(--brand-green)" /> System Account Role &amp; Permissions *
                    </label>
                    <select
                      className="form-control"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    >
                      <option value="employee">👤 Standard Employee (Self-Service ESS Access)</option>
                      <option value="manager">👑 HR / Operations Manager (Full Admin Rights)</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                      HR / Managers have full admin access across payroll, attendance, timesheets, performance, and workforce settings.
                    </span>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Job Title / Designation *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.job_title}
                        onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Department *</label>
                      <select
                        className="form-control"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        required
                      >
                        <option value="Research & Analytics">Research &amp; Analytics</option>
                        <option value="Operations">Operations</option>
                        <option value="Client Services">Client Services</option>
                        <option value="Management">Management</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Assigned Team</label>
                      <select
                        className="form-control"
                        value={editForm.team_id}
                        onChange={(e) => setEditForm({ ...editForm, team_id: e.target.value })}
                      >
                        <option value="">-- No Team --</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Direct Manager</label>
                      <select
                        className="form-control"
                        value={editForm.manager_id}
                        onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value })}
                      >
                        <option value="">-- Executive Director --</option>
                        {employees.filter(e => e.id !== editingEmpId).map(e => (
                          <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Employment Status</label>
                      <select
                        className="form-control"
                        value={editForm.employment_status}
                        onChange={(e) => setEditForm({ ...editForm, employment_status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="probationary">Probationary</option>
                        <option value="resigned">Resigned</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Employment Type</label>
                      <select
                        className="form-control"
                        value={editForm.employment_type}
                        onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                      >
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        {editForm.employment_type === 'part_time' ? 'Hourly Rate (PHP/hr) *' : 'Monthly Salary (PHP) *'}
                      </label>
                      {editForm.employment_type === 'part_time' ? (
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          className="form-control"
                          placeholder="e.g. 150.00 / hr"
                          value={editForm.hourly_rate || ''}
                          onChange={(e) => {
                            const hr = parseFloat(e.target.value) || 0;
                            setEditForm({ ...editForm, hourly_rate: hr, monthly_salary: 0 });
                          }}
                          required
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="e.g. 25000"
                          value={editForm.monthly_salary || ''}
                          onChange={(e) => {
                            const sal = parseFloat(e.target.value) || 0;
                            setEditForm({ ...editForm, monthly_salary: sal, hourly_rate: sal > 0 ? parseFloat((sal / 160).toFixed(2)) : 0 });
                          }}
                          required
                        />
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Hire Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editForm.hire_date}
                        onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Emergency Contact Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.emergency_contact_name}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Emergency Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.emergency_contact_phone}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.bank_name}
                        onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Bank Account Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.bank_account_number}
                        onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Reset Password (Leave blank to keep current password)</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new password to reset"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: EMPLOYEE DIRECTORY & RECORDS
  // ==========================================
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={26} color="var(--brand-green)" /> Workforce &amp; Employee Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Browse EcomEdge research staff, manage employee dossiers, roles, pictures, and hiring records.
          </p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by name, ID, job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
          />
        </div>

        <select
          className="form-control"
          style={{ flex: '1 1 160px' }}
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select
          className="form-control"
          style={{ flex: '1 1 160px' }}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Research & Analytics">Research &amp; Analytics</option>
          <option value="Operations">Operations</option>
          <option value="Client Services">Client Services</option>
          <option value="Management">Management</option>
        </select>

        <select
          className="form-control"
          style={{ flex: '1 1 140px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Active Only</option>
          <option value="all">All Statuses</option>
          <option value="terminated">Terminated</option>
        </select>

        <button
          className="btn btn-secondary"
          onClick={() => loadEmployees()}
          title="Refresh Directory"
        >
          <Loader2 size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Employees Directory Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {(loading || authLoading) ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--brand-green)" style={{ margin: '0 auto 0.85rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hydrating Employee Directory...</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Synchronizing real-time workforce dossiers from EcomEdge Cloud</div>
          </div>
        ) : isError ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Unable to Load Employee Directory</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 1rem' }}>
              {errorMessage || 'A network error occurred while retrieving records.'}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => loadEmployees()}>
              Retry Connection
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Users size={38} color="var(--text-muted)" style={{ margin: '0 auto 0.85rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No employee records found</div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '440px', margin: '0.3rem auto 1.25rem' }}>
              {search || teamFilter || deptFilter || statusFilter !== 'active'
                ? 'No employee profiles matched the selected search query or department filters.'
                : 'The workforce directory is currently empty. Click below to add an employee or refresh the directory.'}
            </p>
            <div style={{ display: 'inline-flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {(search || teamFilter || deptFilter || statusFilter !== 'active') && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSearch(''); setTeamFilter(''); setDeptFilter(''); setStatusFilter('active'); }}
                >
                  Clear Filters
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => loadEmployees()}>
                Refresh
              </button>
              {isManager && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                  <Plus size={14} /> Add Employee
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID Code</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Team / Department</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectEmployee(emp.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="user-avatar" style={{ width: '38px', height: '38px', fontSize: '0.85rem' }}>
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="Avatar" /> : emp.first_name[0]}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.92rem' }}>{emp.first_name} {emp.last_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{emp.username || 'staff'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">{emp.employee_code}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{emp.job_title}</td>
                    <td>
                      <span className={`badge ${emp.role === 'manager' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                        {emp.role === 'manager' ? '👑 Admin' : '👤 Employee'}
                      </span>
                    </td>
                    <td>
                      <div><strong>{emp.team_name || 'General'}</strong></div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.department}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {emp.manager_first_name ? `${emp.manager_first_name} ${emp.manager_last_name}` : 'Executive Director'}
                    </td>
                    <td>
                      <span className={`badge ${emp.employment_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {emp.employment_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleSelectEmployee(emp.id)}
                          title="View Profile"
                        >
                          <Eye size={13} /> View
                        </button>
                        {isManager && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(emp)}
                            title="Edit Employee"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Onboard New Employee</h3>
              <button type="button" className="btn-icon" onClick={() => setShowAddModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Photo Upload Section in Add Modal */}
                <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Camera size={16} color="var(--brand-green)" /> Profile Picture / Photo (Optional)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem' }}>
                    <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.3rem', border: '2px solid var(--brand-green)', flexShrink: 0 }}>
                      {empForm.avatar_url ? <img src={empForm.avatar_url} alt="Avatar Preview" /> : (empForm.first_name ? empForm.first_name[0] : '📷')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEmpForm({ ...empForm, avatar_url: reader.result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Select employee picture (JPG, PNG, WEBP).
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Role Selector */}
                <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} color="var(--brand-green)" /> System Account Role &amp; Permissions *
                  </label>
                  <select
                    className="form-control"
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  >
                    <option value="employee">👤 Standard Employee (Self-Service ESS Access)</option>
                    <option value="manager">👑 HR / Operations Manager (Full Admin Rights)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                    HR / Managers have full admin access across payroll, attendance, timesheets, performance, and workforce settings.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={empForm.first_name}
                      onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={empForm.last_name}
                      onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Job Title / Designation *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Research Analyst"
                      value={empForm.job_title}
                      onChange={(e) => setEmpForm({ ...empForm, job_title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={empForm.department}
                      onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                      required
                    >
                      <option value="Research & Analytics">Research &amp; Analytics</option>
                      <option value="Operations">Operations</option>
                      <option value="Client Services">Client Services</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assigned Team</label>
                    <select
                      className="form-control"
                      value={empForm.team_id}
                      onChange={(e) => setEmpForm({ ...empForm, team_id: e.target.value })}
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Direct Manager</label>
                    <select
                      className="form-control"
                      value={empForm.manager_id}
                      onChange={(e) => setEmpForm({ ...empForm, manager_id: e.target.value })}
                    >
                      <option value="">-- Select Manager --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Employment Type *</label>
                    <select
                      className="form-control"
                      value={empForm.employment_type || 'full_time'}
                      onChange={(e) => {
                        const type = e.target.value;
                        setEmpForm({ ...empForm, employment_type: type });
                      }}
                      required
                    >
                      <option value="full_time">Full-Time (Monthly Salaried)</option>
                      <option value="part_time">Part-Time (Hourly Rate)</option>
                      <option value="contract">Contract (Fixed Term / Hourly)</option>
                      <option value="intern">Intern / Trainee (Hourly / Allowance)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Hire Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={empForm.hire_date}
                      onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      {empForm.employment_type === 'part_time' ? 'Hourly Rate (PHP/hr) *' : 'Monthly Salary (PHP) *'}
                    </label>
                    {empForm.employment_type === 'part_time' ? (
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 150.00 / hr"
                        value={empForm.hourly_rate || ''}
                        onChange={(e) => {
                          const hr = parseFloat(e.target.value) || 0;
                          setEmpForm({ ...empForm, hourly_rate: hr, monthly_salary: 0 });
                        }}
                        required
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 25000"
                        value={empForm.monthly_salary || ''}
                        onChange={(e) => {
                          const sal = parseFloat(e.target.value) || 0;
                          setEmpForm({ ...empForm, monthly_salary: sal, hourly_rate: sal > 0 ? parseFloat((sal / 160).toFixed(2)) : 0 });
                        }}
                        required
                      />
                    )}
                  </div>
                  {empForm.employment_type !== 'part_time' ? (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Effective Hourly Rate (160 hrs benchmark)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        disabled
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                        value={`₱${(empForm.monthly_salary ? empForm.monthly_salary / 160 : 0).toFixed(2)}/hr`}
                      />
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Pay Computation Type
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        disabled
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--brand-green)', fontWeight: 700 }}
                        value="Direct Hours Worked × Hourly Rate"
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Initial Username (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Auto-generated if blank"
                      value={empForm.username}
                      onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Initial Password</label>
                    <input
                      type="text"
                      className="form-control"
                      value={empForm.password}
                      onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Creating Employee...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Create Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Edit Employee Profile</h3>
              <button type="button" className="btn-icon" onClick={() => setShowEditModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Photo Upload Section in Edit Modal */}
                <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Camera size={16} color="var(--brand-green)" /> Profile Picture / Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem' }}>
                    <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.3rem', border: '2px solid var(--brand-green)', flexShrink: 0 }}>
                      {editForm.avatar_url ? <img src={editForm.avatar_url} alt="Avatar Preview" /> : (editForm.first_name ? editForm.first_name[0] : 'U')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditForm({ ...editForm, avatar_url: reader.result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Upload new JPG, PNG or WEBP image.
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Role Selector */}
                <div className="form-group" style={{ margin: 0, background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} color="var(--brand-green)" /> System Account Role &amp; Permissions *
                  </label>
                  <select
                    className="form-control"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    <option value="employee">👤 Standard Employee (Self-Service ESS Access)</option>
                    <option value="manager">👑 HR / Operations Manager (Full Admin Rights)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                    HR / Managers have full admin access across payroll, attendance, timesheets, performance, and workforce settings.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Job Title / Designation *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.job_title}
                      onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      required
                    >
                      <option value="Research & Analytics">Research &amp; Analytics</option>
                      <option value="Operations">Operations</option>
                      <option value="Client Services">Client Services</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assigned Team</label>
                    <select
                      className="form-control"
                      value={editForm.team_id}
                      onChange={(e) => setEditForm({ ...editForm, team_id: e.target.value })}
                    >
                      <option value="">-- No Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Direct Manager</label>
                    <select
                      className="form-control"
                      value={editForm.manager_id}
                      onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value })}
                    >
                      <option value="">-- Executive Director --</option>
                      {employees.filter(e => e.id !== editingEmpId).map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Employment Status</label>
                    <select
                      className="form-control"
                      value={editForm.employment_status}
                      onChange={(e) => setEditForm({ ...editForm, employment_status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="probationary">Probationary</option>
                      <option value="resigned">Resigned</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Employment Type</label>
                    <select
                      className="form-control"
                      value={editForm.employment_type}
                      onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time (Hourly Rate)</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      {editForm.employment_type === 'part_time' ? 'Hourly Rate (PHP/hr) *' : 'Monthly Salary (PHP) *'}
                    </label>
                    {editForm.employment_type === 'part_time' ? (
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 150.00 / hr"
                        value={editForm.hourly_rate || ''}
                        onChange={(e) => {
                          const hr = parseFloat(e.target.value) || 0;
                          setEditForm({ ...editForm, hourly_rate: hr, monthly_salary: 0 });
                        }}
                        required
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 25000"
                        value={editForm.monthly_salary || ''}
                        onChange={(e) => {
                          const sal = parseFloat(e.target.value) || 0;
                          setEditForm({ ...editForm, monthly_salary: sal, hourly_rate: sal > 0 ? parseFloat((sal / 160).toFixed(2)) : 0 });
                        }}
                        required
                      />
                    )}
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Hire Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.hire_date}
                      onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Emergency Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Emergency Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.bank_name}
                      onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Bank Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.bank_account_number}
                      onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Reset Password (Leave blank to keep current password)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter new password to reset"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

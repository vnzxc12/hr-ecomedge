import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  Clock,
  Briefcase,
  CalendarDays,
  AlertCircle,
  Banknote,
  FolderLock,
  GraduationCap,
  Laptop,
  FolderKanban,
  CheckCircle2,
  XCircle,
  Plus,
  PlayCircle,
  StopCircle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Building2,
  ShieldCheck,
  Zap,
  Coffee
} from 'lucide-react';
import PunchClockModal from '../components/TimeClock/PunchClockModal';

export default function Dashboard({ onNavigate }) {
  const { user, isManager, todayPunch, punchAction, showToast } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const stats = await api.dashboard.getStats();
      setData(stats);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [todayPunch]);

  const handleQuickPunch = async (action) => {
    try {
      await punchAction(action);
      loadDashboard();
    } catch (err) {
      // Toast handled in context
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.leaves.review(leaveId, 'approved', 'Approved from Command Center');
      showToast('Leave request approved.', 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.leaves.review(leaveId, 'rejected', 'Declined due to project sprint requirements');
      showToast('Leave request declined.', 'info');
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  if (loading && !data) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Clock size={36} className="status-dot clocked_in" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: '700' }}>Loading EcomEdge Command Center metrics...</p>
        </div>
      </div>
    );
  }

  const punchStatus = todayPunch ? todayPunch.status : 'clocked_out';

  // ==========================================
  // MANAGER / EXECUTIVE COMMAND CENTER
  // ==========================================
  if (isManager) {
    const m = data?.metrics || {};
    const teamDist = data?.teamDistribution || [];
    const activeProjects = data?.activeProjects || [];
    const liveAttendance = data?.liveAttendance || [];
    const recentLeaves = data?.recentLeaves || [];
    const recentTimesheets = data?.recentTimesheets || [];

    const totalStaff = m.totalEmployees || 1;

    return (
      <div className="page-container">
        {/* Top Executive Header & Quick Actions Bar */}
        <div className="command-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="badge badge-success" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                LIVE OPERATIONS
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
              Executive Operations &amp; Workforce Command
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="quick-actions-toolbar">
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('employees')}>
              <Plus size={14} /> Add Employee
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('projects')}>
              <Plus size={14} /> Add Project
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPunchModal(true)}>
              <Clock size={14} /> Punch Clock
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('payroll')}>
              <Banknote size={14} /> Run Payroll
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('documents')}>
              <FolderLock size={14} /> Upload Doc
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('timesheets')}>
              <FileCheck size={14} /> Approve Logs
            </button>
          </div>
        </div>

        {/* 6 Compact KPI Cards */}
        <div className="grid-kpi-6" style={{ marginBottom: '1.5rem' }}>
          {/* Total Employees */}
          <div className="stat-card compact-kpi emerald" onClick={() => onNavigate('employees')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">TOTAL EMPLOYEES</div>
              <div className="value">{m.totalEmployees || 0}</div>
              <div className="subtext">Active agency staff</div>
            </div>
            <div className="stat-icon emerald"><Users size={20} /></div>
          </div>

          {/* Currently Working */}
          <div className="stat-card compact-kpi emerald" onClick={() => onNavigate('timelogs')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">CURRENTLY WORKING</div>
              <div className="value">{m.currentlyWorking || 0}</div>
              <div className="subtext">Clocked in today</div>
            </div>
            <div className="stat-icon emerald"><Clock size={20} /></div>
          </div>

          {/* On Leave */}
          <div className="stat-card compact-kpi purple" onClick={() => onNavigate('leaves')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">ON LEAVE</div>
              <div className="value">{m.onLeaveToday || 0}</div>
              <div className="subtext">Today</div>
            </div>
            <div className="stat-icon purple"><CalendarDays size={20} /></div>
          </div>

          {/* Active Projects */}
          <div className="stat-card compact-kpi cyan" onClick={() => onNavigate('projects')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">ACTIVE PROJECTS</div>
              <div className="value">{m.activeProjectsCount || 0}</div>
              <div className="subtext">Client research deliverables</div>
            </div>
            <div className="stat-icon cyan"><FolderKanban size={20} /></div>
          </div>

          {/* Pending Approvals */}
          <div className="stat-card compact-kpi amber" onClick={() => onNavigate('timesheets')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">PENDING APPROVALS</div>
              <div className="value" style={{ color: m.pendingApprovalsCount > 0 ? 'var(--warning)' : 'inherit' }}>
                {m.pendingApprovalsCount || 0}
              </div>
              <div className="subtext">{m.pendingTimesheets || 0} timesheets, {m.pendingLeaves || 0} leaves</div>
            </div>
            <div className="stat-icon amber"><AlertCircle size={20} /></div>
          </div>

          {/* Current Payroll */}
          <div className="stat-card compact-kpi emerald" onClick={() => onNavigate('payroll')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">PAYROLL</div>
              <div className="value" style={{ fontSize: '1.35rem' }}>
                ₱{m.latestPayrollAmount ? (m.latestPayrollAmount / 1000).toFixed(0) + 'k' : '—'}
              </div>
              <div className="subtext">{m.latestPayrollPeriod || 'Current Period'}</div>
            </div>
            <div className="stat-icon emerald"><Banknote size={20} /></div>
          </div>
        </div>

        {/* Mid-Section: Workforce Distribution & Active Client Projects */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Workforce Overview by Team */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Building2 size={18} color="var(--brand-green)" /> Workforce Distribution
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Employees grouped by research and operations team</p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('teams')}>
                Manage Teams <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {teamDist.map(t => {
                const percent = Math.round((t.employee_count / totalStaff) * 100);
                return (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.team_name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <strong>{t.employee_count}</strong> staff ({percent}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: percent > 30 ? 'var(--brand-green)' : 'var(--accent-cyan)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Client Projects Tracker */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FolderKanban size={18} color="var(--brand-green)" /> Active Client Projects
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Live marketplace intelligence and research deliverables</p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('projects')}>
                All Projects <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No active client projects running.</div>
              ) : (
                activeProjects.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Client: <strong style={{ color: 'var(--brand-green)' }}>{p.client_name}</strong> • PM: {p.pm_first_name ? `${p.pm_first_name} ${p.pm_last_name}` : 'Unassigned'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        {p.assigned_count || 0} Staff
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lower Section: Live Floor Attendance & Urgent Approvals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
          {/* Live Floor Activity */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                <Clock size={17} color="var(--brand-green)" /> Live Floor &amp; Attendance ({liveAttendance.length} Checked In)
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => loadDashboard()} title="Refresh Live Attendance">
                  Refresh
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('timelogs')}>
                  Full Time Logs <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '280px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Team</th>
                    <th>Clock In</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No employees currently clocked in today.
                      </td>
                    </tr>
                  ) : (
                    liveAttendance.map(att => (
                      <tr key={att.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                              {att.avatar_url ? <img src={att.avatar_url} alt="Avatar" /> : att.first_name[0]}
                            </div>
                            <div>
                              <strong>{att.first_name} {att.last_name}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{att.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{att.team_name || att.department}</td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                          {att.clock_in ? new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 800 }}>{att.total_hours} hrs</td>
                        <td>
                          <span className={`badge ${att.status === 'clocked_in' ? 'badge-success' : (att.status === 'on_break' ? 'badge-warning' : 'badge-neutral')}`}>
                            {att.status === 'clocked_in' ? 'Working' : (att.status === 'on_break' ? 'On Break' : 'Clocked Out')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Urgent Approvals Center */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <AlertCircle size={17} color="var(--warning)" /> Pending Approvals
              </h3>
              <span className="badge badge-warning">{m.pendingApprovalsCount || 0} Pending</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentLeaves.filter(l => l.status === 'pending').slice(0, 3).map(l => (
                <div
                  key={`leave-${l.id}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>{l.first_name} {l.last_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {l.leave_type.toUpperCase()} • {l.days_count} Days ({l.start_date})
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleApproveLeave(l.id)}>
                      <CheckCircle2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRejectLeave(l.id)}>
                      <XCircle size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {recentTimesheets.filter(ts => ts.status === 'submitted').slice(0, 3).map(ts => (
                <div
                  key={`ts-${ts.id}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>{ts.first_name} {ts.last_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {ts.project_name || 'Timesheet'} • {ts.total_hours}h ({ts.date})
                    </div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('timesheets')}>
                    Review
                  </button>
                </div>
              ))}

              {m.pendingApprovalsCount === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={28} color="var(--brand-green)" style={{ margin: '0 auto 0.5rem' }} />
                  All leave requests and timesheets are reviewed!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Punch Clock Modal */}
        <PunchClockModal
          isOpen={showPunchModal}
          onClose={() => setShowPunchModal(false)}
        />
      </div>
    );
  }

  // ==========================================
  // EMPLOYEE SELF-SERVICE (ESS) DASHBOARD
  // ==========================================
  const empM = data?.metrics || {};
  const emp = data?.employee || {};
  const assignedPrjs = data?.assignedProjects || [];
  const assignedAssets = data?.assignedAssets || [];
  const recentLogs = data?.recentLogs || [];
  const recentTimesheets = data?.recentTimesheets || [];

  const empAvatar = emp?.avatar_url || user?.avatar_url;
  const empName = emp?.first_name 
    ? `${emp.first_name} ${emp.last_name || ''}`.trim()
    : (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Employee'));
  const empJob = emp?.job_title || user?.job_title || 'Team Member';
  const empDept = emp?.department || user?.department || 'Research & Analytics';
  const empCode = emp?.employee_code || user?.employee_code || 'EMP';

  return (
    <div className="page-container">
      {/* Rich Employee Welcome Hero Banner */}
      <div className="glass-card" style={{ 
        padding: '1.75rem', 
        marginBottom: '1.5rem', 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,244,0.85) 100%)',
        border: '1px solid rgba(0, 150, 64, 0.2)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Circular Profile Picture with Active Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div className="user-avatar" style={{ 
                width: '76px', 
                height: '76px', 
                fontSize: '1.75rem', 
                border: '3px solid var(--brand-green)',
                boxShadow: '0 4px 12px rgba(0, 150, 64, 0.25)'
              }}>
                {empAvatar ? <img src={empAvatar} alt={empName} /> : (empName[0] || 'E')}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: punchStatus === 'clocked_in' ? 'var(--brand-green)' : (punchStatus === 'on_break' ? '#f59e0b' : '#94a3b8'),
                border: '2.5px solid #ffffff'
              }} title={punchStatus === 'clocked_in' ? 'Working' : (punchStatus === 'on_break' ? 'On Break' : 'Clocked Out')} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  ECOMEDGE RESEARCH WORKSPACE
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                  {empCode}
                </span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--brand-navy)', margin: 0 }}>
                Welcome back, {empName}!
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>{empJob}</strong> • <span>{empDept}</span> • <span style={{ color: 'var(--text-muted)' }}>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPunchModal(true)}>
              <Clock size={15} /> Punch Clock
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('timesheets')}>
              <FileCheck size={15} /> Submit Timesheet
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('leaves')}>
              <CalendarDays size={15} /> Request Leave
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('payroll')}>
              <Banknote size={15} /> View Payslips
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-kpi">
        <div className="stat-card emerald">
          <div className="stat-info">
            <div className="label">TODAY SHIFT STATUS</div>
            <div className="value" style={{ fontSize: '1.35rem' }}>
              {punchStatus === 'clocked_in' ? '🟢 Working' : (punchStatus === 'on_break' ? '🟡 On Break' : '⚪ Clocked Out')}
            </div>
            <div className="subtext">
              {todayPunch?.clock_in ? `Shift started at ${new Date(todayPunch.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to clock in'}
            </div>
          </div>
          <div className="stat-icon emerald"><Clock size={20} /></div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-info">
            <div className="label">ACTIVE PROJECTS</div>
            <div className="value">{empM.assignedProjectsCount || 0}</div>
            <div className="subtext">Assigned deliverables</div>
          </div>
          <div className="stat-icon cyan"><FolderKanban size={20} /></div>
        </div>

        <div className="stat-card purple">
          <div className="stat-info">
            <div className="label">VACATION LEAVE</div>
            <div className="value">{empM.vacationRemaining || 0} Days</div>
            <div className="subtext">Available balance</div>
          </div>
          <div className="stat-icon purple"><CalendarDays size={20} /></div>
        </div>

        <div className="stat-card amber">
          <div className="stat-info">
            <div className="label">ASSIGNED ASSETS</div>
            <div className="value">{empM.assignedAssetsCount || 0}</div>
            <div className="subtext">Equipment &amp; Laptops</div>
          </div>
          <div className="stat-icon amber"><Laptop size={20} /></div>
        </div>
      </div>

      {/* Employee Middle Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Assigned Projects */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>My Active Client Projects</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('projects')}>
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {assignedPrjs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No projects assigned yet.</div>
            ) : (
              assignedPrjs.map(p => (
                <div key={p.id} style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.project_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-green)', fontWeight: 700 }}>
                    Client: {p.client_name} • Role: {p.role_on_project} ({p.allocation_percent}%)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Attendance Logs */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Attendance Logs</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('timelogs')}>
              Time Logs
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance logs recorded yet.</div>
            ) : (
              recentLogs.slice(0, 4).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div>
                    <strong>{l.date}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {l.clock_in ? new Date(l.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} – {l.clock_out ? new Date(l.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--brand-green)' }}>
                    {l.total_hours} hrs
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Punch Clock Modal */}
      <PunchClockModal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
      />
    </div>
  );
}

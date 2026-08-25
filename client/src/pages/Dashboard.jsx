import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Banknote,
  FolderLock,
  GraduationCap,
  Laptop,
  PlayCircle,
  StopCircle,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  FileText,
  UserCheck
} from 'lucide-react';
import PunchClockModal from '../components/TimeClock/PunchClockModal';

export default function Dashboard({ onNavigate }) {
  const { user, isManager, todayPunch, punchAction, showToast } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker for digital display
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
      // toast shown in context
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.leaves.review(leaveId, 'approved', 'Approved from Executive Dashboard');
      showToast('Leave request approved.', 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.leaves.review(leaveId, 'rejected', 'Declined due to scheduling constraints');
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
          <p style={{ fontWeight: '600' }}>Loading workforce metrics...</p>
        </div>
      </div>
    );
  }

  const punchStatus = todayPunch ? todayPunch.status : 'clocked_out';

  // ==========================================
  // MANAGER / OWNER DASHBOARD VIEW
  // ==========================================
  if (isManager) {
    const m = data?.metrics || {};
    const attendance = data?.liveAttendance || [];
    const recentLeaves = data?.recentLeaves || [];
    const recentDocs = data?.recentDocs || [];

    return (
      <div className="page-container">
        {/* Executive Overview Profile Hero Banner */}
        <div className="glass-card" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
          padding: '1.5rem 1.75rem',
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Big User Avatar Portrait */}
            <div style={{ position: 'relative' }}>
              <div className="user-avatar" style={{
                width: '84px',
                height: '84px',
                fontSize: '2rem',
                border: '3px solid var(--brand-green)',
                boxShadow: '0 4px 16px var(--brand-green-glow)'
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.first_name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')
                )}
              </div>
              <span className={`status-dot ${punchStatus}`} style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '14px',
                height: '14px',
                border: '2px solid #ffffff'
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-primary)' }}>
                  Welcome back, {user?.first_name || user?.username}! 👋
                </h1>
                <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
                  👑 Executive / Owner
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                {user?.job_title || 'System Administrator'} • {user?.department || 'Operations'} ({user?.employee_code || 'EMP-001'})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowPunchModal(true)}>
              <Clock size={16} />
              <span>Punch Clock</span>
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('payroll')}>
              <Banknote size={16} />
              <span>Run Payroll</span>
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('employees')}>
              <Users size={16} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Manager KPI Grid */}
        <div className="grid-kpi">
          <div className="stat-card" onClick={() => onNavigate('employees')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">Total Workforce</div>
              <div className="value">{m.totalEmployees || 0}</div>
              <div className="subtext">{m.activeEmployees || 0} Active Staff</div>
            </div>
            <div className="stat-icon">
              <Users size={22} />
            </div>
          </div>

          <div className="stat-card emerald" onClick={() => onNavigate('timelogs')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">Currently Working</div>
              <div className="value" style={{ color: 'var(--success)' }}>{m.liveClockedIn || 0}</div>
              <div className="subtext">Clocked in today</div>
            </div>
            <div className="stat-icon emerald">
              <Clock size={22} />
            </div>
          </div>

          <div className="stat-card amber" onClick={() => onNavigate('timelogs')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">On Lunch / Break</div>
              <div className="value" style={{ color: 'var(--warning)' }}>{m.liveOnBreak || 0}</div>
              <div className="subtext">Paused for rest</div>
            </div>
            <div className="stat-icon amber">
              <Coffee size={22} />
            </div>
          </div>

          <div className="stat-card purple" onClick={() => onNavigate('leaves')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">Pending Leaves</div>
              <div className="value" style={{ color: 'var(--accent-purple)' }}>{m.pendingLeaves || 0}</div>
              <div className="subtext">Needs Manager Review</div>
            </div>
            <div className="stat-icon purple">
              <Calendar size={22} />
            </div>
          </div>

          <div className="stat-card cyan" onClick={() => onNavigate('assets')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">Assets Allocated</div>
              <div className="value" style={{ color: 'var(--accent-cyan)' }}>{m.assignedAssets || 0} / {m.totalAssets || 0}</div>
              <div className="subtext">Hardware deployed</div>
            </div>
            <div className="stat-icon cyan">
              <Laptop size={22} />
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('payroll')} style={{ cursor: 'pointer' }}>
            <div className="stat-info">
              <div className="label">Last Payroll Run</div>
              <div className="value">₱{(m.latestPayrollTotal || 0).toLocaleString()}</div>
              <div className="subtext">Status: <span className="badge badge-success">{m.latestPayrollStatus}</span></div>
            </div>
            <div className="stat-icon">
              <Banknote size={22} />
            </div>
          </div>
        </div>

        {/* Live Attendance Floor Monitor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>🏢 Live Attendance & Floor Activity</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Real-time status of employees clocked in today ({new Date().toLocaleDateString()})
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('timelogs')}>
                View Full Timesheets <ArrowUpRight size={14} />
              </button>
            </div>

            {attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active employee punches recorded yet today.
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Time In</th>
                      <th>Break Duration</th>
                      <th>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', overflow: 'hidden' }}>
                              {log.avatar_url ? (
                                <img src={log.avatar_url} alt={log.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                log.first_name[0]
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>
                                {log.first_name} {log.last_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {log.employee_code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{log.department}</td>
                        <td>
                          <span style={{ fontWeight: '600' }}>
                            {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>{log.break_duration_mins || 0} mins</td>
                        <td>
                          <span className={`badge badge-${log.status === 'clocked_in' ? 'success' : (log.status === 'on_break' ? 'warning' : 'neutral')}`}>
                            <span className={`status-dot ${log.status}`} style={{ width: '6px', height: '6px' }} />
                            {log.status === 'clocked_in' ? 'Working' : (log.status === 'on_break' ? 'On Break' : 'Finished')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Leave Requests Widget */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>🏖️ Leave Approvals</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Recent applications requiring review
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('leaves')}>
                All <ArrowUpRight size={14} />
              </button>
            </div>

            {recentLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No recent leave requests pending.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {recentLeaves.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                          {l.first_name} {l.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {l.start_date} to {l.end_date} ({l.days_count} days)
                        </div>
                      </div>
                      <span className={`badge badge-${l.status === 'approved' ? 'success' : (l.status === 'pending' ? 'warning' : 'danger')}`}>
                        {l.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                      "{l.reason}"
                    </p>

                    {l.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveLeave(l.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectLeave(l.id)}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
  // EMPLOYEE SELF-SERVICE (ESS) DASHBOARD VIEW
  // ==========================================
  const empMetrics = data?.metrics || {};
  const leaveBalance = data?.leaveBalance;
  const recentLogs = data?.recentLogs || [];
  const assignedAssets = data?.assignedAssets || [];
  const enrolledTrainings = data?.enrolledTrainings || [];
  const latestPayslip = data?.latestPayslip;

  return (
    <div className="page-container">
      {/* Employee Overview Profile Hero Banner */}
      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        marginBottom: '2rem',
        padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Big Circular User Avatar */}
          <div style={{ position: 'relative' }}>
            <div className="user-avatar" style={{
              width: '84px',
              height: '84px',
              fontSize: '2rem',
              border: '3px solid var(--brand-green)',
              boxShadow: '0 4px 16px var(--brand-green-glow)'
            }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.first_name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')
              )}
            </div>
            <span className={`status-dot ${punchStatus}`} style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              border: '2px solid #ffffff'
            }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-primary)' }}>
                Hello, {user?.first_name || user?.username}! 👋
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                👤 Employee Portal
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
              {user?.job_title || 'Staff'} • {user?.department || 'Operations'} ({user?.employee_code || 'EMP-000'})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('profile')}>
            <span>My Profile & Settings</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('leaves')}>
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Interactive Punch Clock Hero Banner */}
      <div className="punch-clock-hero" style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <Calendar size={16} />
          <span>{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>

        <div className="digital-clock-display">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        <div className={`punch-status-badge ${punchStatus}`}>
          <span className={`status-dot ${punchStatus}`} />
          <span>
            {punchStatus === 'clocked_in' && 'Currently Working (Clocked In)'}
            {punchStatus === 'on_break' && 'On Lunch / Break'}
            {punchStatus === 'clocked_out' && 'Shift Ended (Clocked Out)'}
          </span>
        </div>

        {/* Action Punch Buttons */}
        <div className="punch-buttons-group">
          {/* Clock In */}
          <button
            className="btn btn-success punch-btn"
            disabled={punchStatus === 'clocked_in' || punchStatus === 'on_break'}
            onClick={() => handleQuickPunch('clock_in')}
            style={{ opacity: (punchStatus === 'clocked_in' || punchStatus === 'on_break') ? 0.4 : 1 }}
          >
            <PlayCircle size={22} />
            <span>Time In</span>
            <span className="sub">Shift Start</span>
          </button>

          {/* Lunch / Break */}
          <button
            className="btn btn-warning punch-btn"
            disabled={punchStatus !== 'clocked_in'}
            onClick={() => handleQuickPunch('break_start')}
            style={{ opacity: punchStatus !== 'clocked_in' ? 0.4 : 1 }}
          >
            <Coffee size={22} />
            <span>Lunch / Break</span>
            <span className="sub">Start Break</span>
          </button>

          {/* End Break */}
          <button
            className="btn btn-primary punch-btn"
            disabled={punchStatus !== 'on_break'}
            onClick={() => handleQuickPunch('break_end')}
            style={{ opacity: punchStatus !== 'on_break' ? 0.4 : 1 }}
          >
            <CheckCircle2 size={22} />
            <span>Resume Work</span>
            <span className="sub">End Break</span>
          </button>

          {/* Clock Out */}
          <button
            className="btn btn-danger punch-btn"
            disabled={punchStatus === 'clocked_out'}
            onClick={() => handleQuickPunch('clock_out')}
            style={{ opacity: punchStatus === 'clocked_out' ? 0.4 : 1 }}
          >
            <StopCircle size={22} />
            <span>Time Out</span>
            <span className="sub">Shift End</span>
          </button>
        </div>
      </div>

      {/* Employee Quick Info Grid */}
      <div className="grid-kpi">
        <div className="stat-card emerald" onClick={() => onNavigate('leaves')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <div className="label">Vacation Leave Balance</div>
            <div className="value" style={{ color: 'var(--success)' }}>{empMetrics.vacationRemaining || 0} Days</div>
            <div className="subtext">Out of {leaveBalance?.vacation_days || 15} total allotted</div>
          </div>
          <div className="stat-icon emerald">
            <Calendar size={22} />
          </div>
        </div>

        <div className="stat-card amber" onClick={() => onNavigate('leaves')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <div className="label">Sick Leave Balance</div>
            <div className="value" style={{ color: 'var(--warning)' }}>{empMetrics.sickRemaining || 0} Days</div>
            <div className="subtext">Out of {leaveBalance?.sick_days || 10} total allotted</div>
          </div>
          <div className="stat-icon amber">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card cyan" onClick={() => onNavigate('assets')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <div className="label">Assigned Equipment</div>
            <div className="value" style={{ color: 'var(--accent-cyan)' }}>{assignedAssets.length} Assets</div>
            <div className="subtext">Workstations & accessories</div>
          </div>
          <div className="stat-icon cyan">
            <Laptop size={22} />
          </div>
        </div>

        <div className="stat-card purple" onClick={() => onNavigate('training')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <div className="label">Enrolled Programs</div>
            <div className="value" style={{ color: 'var(--accent-purple)' }}>{enrolledTrainings.length} Courses</div>
            <div className="subtext">Skills development</div>
          </div>
          <div className="stat-icon purple">
            <GraduationCap size={22} />
          </div>
        </div>
      </div>

      {/* ESS Detailed Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Recent Punch History */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>🕒 My Recent Time Logs</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('timelogs')}>
              Full History <ArrowUpRight size={14} />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No punch logs recorded yet.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Break</th>
                    <th>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>{log.date}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>
                        {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ color: log.clock_out ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
                        {log.clock_out ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </td>
                      <td>{log.break_duration_mins || 0}m</td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {log.total_hours || 0} hrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Latest Payslip Quick Banner */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem' }}>💰 Latest Payslip</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('payroll')}>
                View Slips <ArrowUpRight size={14} />
              </button>
            </div>

            {latestPayslip ? (
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Period: {latestPayslip.period_start} ~ {latestPayslip.period_end}</span>
                  <span className="badge badge-success">{latestPayslip.payment_status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Payroll Ref: {latestPayslip.payroll_code}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem' }}>
                  <span>Gross Earnings</span>
                  <span style={{ fontWeight: '700' }}>₱{latestPayslip.gross_pay.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem', color: 'var(--danger)' }}>
                  <span>Total Deductions</span>
                  <span>-₱{(latestPayslip.tax_deduction + latestPayslip.social_deductions + latestPayslip.other_deductions).toLocaleString()}</span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Net Take-Home Pay</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)' }}>
                    ₱{latestPayslip.net_pay.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No payslips generated yet for your account.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNavigate('documents')}>
              <FolderLock size={16} />
              <span>Upload CV / ID Documents</span>
            </button>
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

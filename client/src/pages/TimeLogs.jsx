import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Clock,
  Calendar,
  Filter,
  Download,
  Plus,
  PlayCircle,
  Coffee,
  StopCircle,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import PunchClockModal from '../components/TimeClock/PunchClockModal';

export default function TimeLogs() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [liveStatus, setLiveStatus] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isManager ? 'live' : 'history');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual log form
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    break_start: '',
    break_end: '',
    clock_out: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Guard query execution until auth is fully resolved
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [token, user?.id, authLoading, startDate, endDate, selectedEmpId, statusFilter, isManager]);

  // Real-time synchronization and punch events subscriber
  useEffect(() => {
    const handleInvalidate = () => {
      if (token && !authLoading) {
        loadData(false);
      }
    };
    window.addEventListener('punch:updated', handleInvalidate);
    window.addEventListener('timelogs:invalidate', handleInvalidate);

    // Auto-poll live floor status every 15 seconds if manager is viewing live floor
    let intervalId;
    if (isManager && activeTab === 'live' && token) {
      intervalId = setInterval(() => {
        loadData(false);
      }, 15000);
    }

    return () => {
      window.removeEventListener('punch:updated', handleInvalidate);
      window.removeEventListener('timelogs:invalidate', handleInvalidate);
      if (intervalId) clearInterval(intervalId);
    };
  }, [token, authLoading, isManager, activeTab]);

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      if (isManager) {
        const [logsRes, liveRes, empsRes] = await Promise.all([
          api.timelogs.getAll({ startDate, endDate, employee_id: selectedEmpId, status: statusFilter }),
          api.timelogs.getLiveStatus(),
          api.employees.getAll()
        ]);
        setLogs(logsRes.logs || []);
        setLiveStatus(liveRes.liveStatus || liveRes.status || []);
        setEmployees(empsRes.employees || []);
      } else {
        const myLogsRes = await api.timelogs.getMy({ startDate, endDate });
        setLogs(myLogsRes.logs || []);
      }
    } catch (err) {
      if (showLoader) showToast(err.message, 'danger');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.timelogs.createManual(manualForm);
      showToast('Manual time log recorded successfully.', 'success');
      setShowManualModal(false);
      setManualForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        clock_in: '',
        break_start: '',
        break_end: '',
        clock_out: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      showToast('No logs available to export.', 'warning');
      return;
    }

    const headers = ['Date', 'Employee Code', 'Employee Name', 'Department', 'Clock In', 'Break Duration (mins)', 'Clock Out', 'Total Hours', 'Overtime Hours', 'Status', 'Notes'];
    const rows = logs.map(l => [
      l.date,
      l.employee_code || 'ME',
      l.first_name ? `${l.first_name} ${l.last_name}` : 'Self',
      l.department || 'N/A',
      l.clock_in ? new Date(l.clock_in).toLocaleTimeString() : '',
      l.break_duration_mins || 0,
      l.clock_out ? new Date(l.clock_out).toLocaleTimeString() : '',
      l.total_hours || 0,
      l.overtime_hours || 0,
      l.status,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `timesheet_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Timesheet exported to CSV.', 'success');
  };

  const formatTime = (iso) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>Time & Attendance Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Live attendance tracking, punch clock operations, and audit-ready timesheet logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => loadData()} title="Refresh Live Data">
            <Loader2 size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button className="btn btn-primary" onClick={() => setShowPunchModal(true)}>
            <Clock size={16} />
            <span>Open Punch Clock</span>
          </button>

          {isManager && (
            <button className="btn btn-secondary" onClick={() => setShowManualModal(true)}>
              <Plus size={16} />
              <span>Add Manual Log</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {isManager && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('live')}
          >
            <Users size={16} />
            <span>Live Floor Status Today ({liveStatus.filter(s => s.punch_status === 'clocked_in').length} In)</span>
          </button>
          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <Calendar size={16} />
            <span>Timesheets History & Logs</span>
          </button>
        </div>
      )}

      {/* ==========================================
          1. LIVE FLOOR STATUS TAB (Manager Only)
          ========================================== */}
      {isManager && activeTab === 'live' && (
        <div>
          {loading ? (
            <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={32} color="var(--brand-green)" style={{ margin: '0 auto 0.85rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Loading Live Floor Attendance...</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Synchronizing real-time shift punches from cloud database</div>
            </div>
          ) : (
            <>
              <div className="grid-kpi" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card emerald">
                  <div className="stat-info">
                    <div className="label">Clocked In & Working</div>
                    <div className="value" style={{ color: 'var(--success)' }}>
                      {liveStatus.filter(s => s.punch_status === 'clocked_in').length}
                    </div>
                    <div className="subtext">Active on shifts</div>
                  </div>
                  <div className="stat-icon emerald"><Clock size={22} /></div>
                </div>

                <div className="stat-card amber">
                  <div className="stat-info">
                    <div className="label">On Lunch / Break</div>
                    <div className="value" style={{ color: 'var(--warning)' }}>
                      {liveStatus.filter(s => s.punch_status === 'on_break').length}
                    </div>
                    <div className="subtext">Rest interval</div>
                  </div>
                  <div className="stat-icon amber"><Coffee size={22} /></div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <div className="label">Shift Ended / Out</div>
                    <div className="value">
                      {liveStatus.filter(s => s.punch_status === 'clocked_out' || !s.punch_status).length}
                    </div>
                    <div className="subtext">Completed or absent</div>
                  </div>
                  <div className="stat-icon"><StopCircle size={22} /></div>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Clock In</th>
                      <th>Break Start</th>
                      <th>Break End</th>
                      <th>Clock Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveStatus.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No employee attendance records found today.
                        </td>
                      </tr>
                    ) : (
                      liveStatus.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="user-avatar">
                                {emp.avatar_url ? <img src={emp.avatar_url} alt="Avatar" /> : emp.first_name[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700' }}>{emp.first_name} {emp.last_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employee_code} • {emp.job_title}</div>
                              </div>
                            </div>
                          </td>
                          <td>{emp.department}</td>
                          <td style={{ fontWeight: '600', color: emp.clock_in ? 'var(--success)' : 'var(--text-muted)' }}>
                            {formatTime(emp.clock_in)}
                          </td>
                          <td>{formatTime(emp.break_start)}</td>
                          <td>{formatTime(emp.break_end)}</td>
                          <td>{formatTime(emp.clock_out)}</td>
                          <td>
                            <span className={`badge badge-${emp.punch_status === 'clocked_in' ? 'success' : (emp.punch_status === 'on_break' ? 'warning' : 'neutral')}`}>
                              <span className={`status-dot ${emp.punch_status || 'clocked_out'}`} style={{ width: '6px', height: '6px' }} />
                              {emp.punch_status === 'clocked_in' ? 'Working' : (emp.punch_status === 'on_break' ? 'On Break' : (emp.punch_status === 'clocked_out' ? 'Clocked Out' : 'Not Clocked In'))}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==========================================
          2. TIMESHEET HISTORY TAB
          ========================================== */}
      {(!isManager || activeTab === 'history') && (
        <div>
          {/* Filters Bar */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {isManager && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Employee</label>
                  <select
                    className="form-control"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Punch Status</label>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="clocked_in">Clocked In</option>
                  <option value="on_break">On Break</option>
                  <option value="clocked_out">Clocked Out</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  {isManager && <th>Employee</th>}
                  <th>Clock In</th>
                  <th>Break Interval</th>
                  <th>Clock Out</th>
                  <th>Worked Hours</th>
                  <th>Overtime</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                      <Loader2 className="animate-spin" size={28} color="var(--brand-green)" style={{ margin: '0 auto 0.65rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Loading Timesheet Records...</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Retrieving work hours and shift logs</div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                      No punch records found for this period.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>{log.date}</td>
                      {isManager && (
                        <td>
                          <div style={{ fontWeight: '700' }}>{log.first_name} {log.last_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.employee_code} • {log.department}</div>
                        </td>
                      )}
                      <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                        {formatTime(log.clock_in)}
                      </td>
                      <td>
                        {log.break_start ? `${formatTime(log.break_start)} ~ ${formatTime(log.break_end)} (${log.break_duration_mins || 0}m)` : 'None'}
                      </td>
                      <td style={{ fontWeight: '600', color: log.clock_out ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {formatTime(log.clock_out)}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {log.total_hours || 0} hrs
                      </td>
                      <td style={{ color: log.overtime_hours > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: log.overtime_hours > 0 ? '700' : 'normal' }}>
                        {log.overtime_hours > 0 ? `+${log.overtime_hours} hrs` : '0.00'}
                      </td>
                      <td>
                        <span className={`badge badge-${log.status === 'clocked_in' ? 'success' : (log.status === 'on_break' ? 'warning' : 'neutral')}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MANUAL LOG ENTRY MODAL (Manager Only)
          ========================================== */}
      {showManualModal && (
        <div className="modal-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Plus size={20} color="var(--primary)" />
                <h3>Add Manual Attendance Record</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowManualModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    value={manualForm.employee_id}
                    onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Choose Employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Shift Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Clock In Timestamp *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={manualForm.clock_in}
                      onChange={(e) => setManualForm({ ...manualForm, clock_in: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clock Out Timestamp</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={manualForm.clock_out}
                      onChange={(e) => setManualForm({ ...manualForm, clock_out: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Break Start</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={manualForm.break_start}
                      onChange={(e) => setManualForm({ ...manualForm, break_start: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Break End</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={manualForm.break_end}
                      onChange={(e) => setManualForm({ ...manualForm, break_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Missed punch correction, offsite meeting..."
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Time Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Punch Clock Modal */}
      <PunchClockModal
        isOpen={showPunchModal}
        onClose={() => {
          setShowPunchModal(false);
          loadData();
        }}
      />
    </div>
  );
}

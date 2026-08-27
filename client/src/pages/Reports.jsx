import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Users, Clock, Banknote, FolderKanban, Download, TrendingUp, Building2 } from 'lucide-react';

export default function Reports() {
  const { showToast } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getSummary();
      setData(res);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (reportType) => {
    showToast(`Exporting ${reportType} report to CSV...`, 'success');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem' }}>
        Loading enterprise reporting suites...
      </div>
    );
  }

  const { workforce, attendance, payroll, operations } = data || {
    workforce: { total_employees: 0, departments: [], teams: [] },
    attendance: { total_logs: 0, total_hours_worked: 0, total_overtime_hours: 0, avg_daily_hours: 0 },
    payroll: { total_gross_paid: 0, total_net_paid: 0, total_deductions: 0, total_runs: 0 },
    operations: { total_projects: 0, active_projects: 0, completed_projects: 0, total_budget: 0 }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={26} color="var(--brand-green)" /> Enterprise Reports &amp; Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Executive summaries covering agency workforce distribution, timesheets, payroll, and operations.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => handleExportCSV('Executive Summary')}>
          <Download size={16} /> Export All Reports
        </button>
      </div>

      {/* KPI Top Cards */}
      <div className="grid-kpi" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card emerald">
          <div className="stat-info">
            <div className="label">Total Active Staff</div>
            <div className="value">{workforce.total_employees}</div>
            <div className="subtext">Across {workforce.teams.length} specialized teams</div>
          </div>
          <div className="stat-icon emerald"><Users size={22} /></div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-info">
            <div className="label">Total Hours Logged</div>
            <div className="value">{Math.round(attendance.total_hours_worked)} hrs</div>
            <div className="subtext">{Math.round(attendance.total_overtime_hours)}h total overtime</div>
          </div>
          <div className="stat-icon cyan"><Clock size={22} /></div>
        </div>

        <div className="stat-card amber">
          <div className="stat-info">
            <div className="label">Total Net Payroll Paid</div>
            <div className="value">₱{payroll.total_net_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div className="subtext">{payroll.total_runs} processed payroll runs</div>
          </div>
          <div className="stat-icon amber"><Banknote size={22} /></div>
        </div>

        <div className="stat-card purple">
          <div className="stat-info">
            <div className="label">Active Client Projects</div>
            <div className="value">{operations.active_projects}</div>
            <div className="subtext">₱{operations.total_budget.toLocaleString()} total portfolio</div>
          </div>
          <div className="stat-icon purple"><FolderKanban size={22} /></div>
        </div>
      </div>

      {/* Detailed Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Team Headcount Distribution */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--brand-green)" /> Workforce by Team
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => handleExportCSV('Workforce by Team')}>
              <Download size={13} /> CSV
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {workforce.teams.map((t, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <strong>{t.team_name}</strong>
                  <span>{t.count} Employees ({Math.round((t.count / (workforce.total_employees || 1)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(t.count / (workforce.total_employees || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--brand-green)" /> Department Headcount
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => handleExportCSV('Department Headcount')}>
              <Download size={13} /> CSV
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {workforce.departments.map((d, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <strong>{d.department}</strong>
                  <span>{d.count} Staff ({Math.round((d.count / (workforce.total_employees || 1)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(d.count / (workforce.total_employees || 1)) * 100}%`, background: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

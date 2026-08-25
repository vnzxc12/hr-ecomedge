import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Banknote,
  Calculator,
  Calendar,
  Printer,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Building,
  DollarSign,
  ArrowRight,
  X,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Payroll() {
  const { isManager, showToast } = useAuth();
  const [runs, setRuns] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRunDetailModal, setShowRunDetailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runSlips, setRunSlips] = useState([]);

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [activePayslip, setActivePayslip] = useState(null);

  // Generate form
  const [periodStart, setPeriodStart] = useState('2026-08-01');
  const [periodEnd, setPeriodEnd] = useState('2026-08-31');
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const res = await api.payroll.getRuns();
        setRuns(res.runs || []);
      } else {
        const res = await api.payroll.getMyPayslips();
        setMyPayslips(res.payslips || []);
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

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.payroll.generate(periodStart, periodEnd);
      showToast(res.message, 'success');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setShowGenerateModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenRun = async (run) => {
    setSelectedRun(run);
    setShowRunDetailModal(true);
    try {
      const res = await api.payroll.getRunById(run.id);
      setSelectedRun(res.run);
      setRunSlips(res.payslips || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleUpdateStatus = async (runId, newStatus) => {
    try {
      const res = await api.payroll.updateStatus(runId, newStatus);
      showToast(res.message, 'success');
      if (newStatus === 'paid') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      setSelectedRun(res.run);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleViewPayslip = async (slipId) => {
    try {
      const res = await api.payroll.getPayslipById(slipId);
      setActivePayslip(res.payslip);
      setShowPayslipModal(true);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            {isManager ? 'Payroll & Compensation Management' : 'My Payslips & Earnings'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isManager
              ? 'Automated salary computations from timesheets, tax deductions, and disbursements.'
              : 'View itemized earnings, overtime compensations, and official payslips.'}
          </p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
            <Calculator size={18} />
            <span>Generate New Payroll Run</span>
          </button>
        )}
      </div>

      {/* ==========================================
          MANAGER PAYROLL RUNS VIEW
          ========================================== */}
      {isManager && (
        <div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payroll Code</th>
                  <th>Period</th>
                  <th>Employees</th>
                  <th>Total Gross</th>
                  <th>Total Deductions</th>
                  <th>Total Net Pay</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Loading payroll batches...
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No payroll runs generated yet. Click "Generate New Payroll Run" to start.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {run.payroll_code}
                      </td>
                      <td>{run.period_start} ~ {run.period_end}</td>
                      <td>{run.employee_count || 'All Active'} Staff</td>
                      <td>${(run.total_gross || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>-${(run.total_deductions || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: '800', color: 'var(--success)' }}>
                        ${(run.total_net || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${run.status === 'paid' ? 'success' : (run.status === 'approved' ? 'info' : 'warning')}`}>
                          {run.status}
                        </span>
                      </td>
                      <td>{run.payment_date || 'Pending'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenRun(run)}
                        >
                          <Eye size={14} />
                          <span>View Slips</span>
                        </button>
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
          EMPLOYEE PAYSLIPS VIEW
          ========================================== */}
      {!isManager && (
        <div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payroll Ref</th>
                  <th>Period</th>
                  <th>Worked Hours</th>
                  <th>Basic Pay</th>
                  <th>Overtime</th>
                  <th>Allowances</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Take-Home</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Loading your payslips...
                    </td>
                  </tr>
                ) : myPayslips.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No payslips available for your profile yet.
                    </td>
                  </tr>
                ) : (
                  myPayslips.map((slip) => (
                    <tr key={slip.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {slip.payroll_code}
                      </td>
                      <td>{slip.period_start} ~ {slip.period_end}</td>
                      <td>{slip.total_hours_worked || 160} hrs</td>
                      <td>${slip.basic_pay.toLocaleString()}</td>
                      <td style={{ color: slip.overtime_pay > 0 ? 'var(--success)' : 'inherit' }}>
                        +${slip.overtime_pay.toLocaleString()}
                      </td>
                      <td>+${slip.allowances.toLocaleString()}</td>
                      <td style={{ fontWeight: '700' }}>${slip.gross_pay.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>
                        -${(slip.tax_deduction + slip.social_deductions + slip.other_deductions).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '800', color: 'var(--success)', fontSize: '0.95rem' }}>
                        ${slip.net_pay.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${slip.payment_status === 'paid' ? 'success' : 'warning'}`}>
                          {slip.payment_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleViewPayslip(slip.id)}
                        >
                          <Printer size={14} />
                          <span>Print Slip</span>
                        </button>
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
          GENERATE PAYROLL MODAL
          ========================================== */}
      {showGenerateModal && (
        <div className="modal-backdrop" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calculator size={20} color="var(--primary)" />
                <h3>Generate Automated Payroll Batch</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowGenerateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  The engine will automatically scan all employee timesheets between the chosen period, compute regular hours, 1.5x overtime rates, allowances, and mandatory taxes.
                </p>

                <div className="form-group">
                  <label className="form-label">Period Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Period End Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? 'Calculating...' : 'Run & Generate Payslips'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          RUN DETAILS & PAYSLIP LIST MODAL (Manager)
          ========================================== */}
      {showRunDetailModal && selectedRun && (
        <div className="modal-backdrop" onClick={() => setShowRunDetailModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Banknote size={22} color="var(--primary)" />
                <div>
                  <h3>Payroll Batch: {selectedRun.payroll_code}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Period: {selectedRun.period_start} ~ {selectedRun.period_end} • Status: <span className={`badge badge-${selectedRun.status === 'paid' ? 'success' : 'warning'}`}>{selectedRun.status}</span>
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowRunDetailModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Batch Actions Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Disbursement Total</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)' }}>
                    ${(selectedRun.total_net || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedRun.status === 'draft' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(selectedRun.id, 'approved')}>
                      Approve Run
                    </button>
                  )}
                  {selectedRun.status === 'approved' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(selectedRun.id, 'paid')}>
                      Mark as Paid & Disbursed
                    </button>
                  )}
                </div>
              </div>

              {/* Slips table */}
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Basic Pay</th>
                    <th>Overtime</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th style={{ textAlign: 'right' }}>Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {runSlips.map((slip) => (
                    <tr key={slip.id}>
                      <td>
                        <div style={{ fontWeight: '700' }}>{slip.first_name} {slip.last_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{slip.employee_code} • {slip.department}</div>
                      </td>
                      <td>${slip.basic_pay.toLocaleString()}</td>
                      <td>+${slip.overtime_pay.toLocaleString()}</td>
                      <td style={{ fontWeight: '700' }}>${slip.gross_pay.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>
                        -${(slip.tax_deduction + slip.social_deductions + slip.other_deductions).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '800', color: 'var(--success)' }}>
                        ${slip.net_pay.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleViewPayslip(slip.id)}>
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRunDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PRINTABLE PAYSLIP MODAL
          ========================================== */}
      {showPayslipModal && activePayslip && (
        <div className="modal-backdrop" onClick={() => setShowPayslipModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()} style={{ background: '#f3f4f6' }}>
            <div className="modal-header" style={{ background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={20} color="#6366f1" />
                <h3 style={{ color: '#111827' }}>Official Employee Payslip</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>Print Document</span>
                </button>
                <button className="btn-icon" onClick={() => setShowPayslipModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Paper Layout */}
              <div className="payslip-paper">
                {/* Header */}
                <div className="payslip-header">
                  <div>
                    <h2 style={{ fontSize: '1.4rem', color: '#1e1b4b', fontWeight: '800' }}>HR-ECOMEDGE ENTERPRISES</h2>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Workforce Management & Payroll Operations
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                      Payroll Code: <strong>{activePayslip.payroll_code}</strong>
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>PAYSLIP</div>
                    <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                      Period: {activePayslip.period_start} to {activePayslip.period_end}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700', marginTop: '0.2rem' }}>
                      Status: {activePayslip.payment_status?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Employee Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f9fafb', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                  <div>
                    <div><strong>Employee Name:</strong> {activePayslip.first_name} {activePayslip.last_name}</div>
                    <div><strong>Employee Code:</strong> {activePayslip.employee_code}</div>
                    <div><strong>Department:</strong> {activePayslip.department}</div>
                  </div>
                  <div>
                    <div><strong>Job Title:</strong> {activePayslip.job_title}</div>
                    <div><strong>Bank:</strong> {activePayslip.bank_name || 'Direct Deposit'}</div>
                    <div><strong>Account No:</strong> {activePayslip.bank_account_number || '**** 0000'}</div>
                  </div>
                </div>

                {/* Earnings & Deductions Grid */}
                <div className="payslip-grid">
                  {/* Earnings Box */}
                  <div className="payslip-box">
                    <h4>Earnings</h4>
                    <div className="payslip-line">
                      <span>Basic Pay ({activePayslip.total_hours_worked || 160} hrs)</span>
                      <span>${activePayslip.basic_pay.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line">
                      <span>Overtime Pay ({activePayslip.overtime_hours || 0} hrs @ 1.5x)</span>
                      <span>${activePayslip.overtime_pay.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line">
                      <span>Meal & Transport Allowance</span>
                      <span>${activePayslip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line payslip-total">
                      <span>Gross Earnings</span>
                      <span>${activePayslip.gross_pay.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Deductions Box */}
                  <div className="payslip-box">
                    <h4>Deductions</h4>
                    <div className="payslip-line">
                      <span>Income Tax Withholding (8%)</span>
                      <span>${activePayslip.tax_deduction.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line">
                      <span>Social & Health Fund (4%)</span>
                      <span>${activePayslip.social_deductions.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line">
                      <span>Other Withholdings</span>
                      <span>${activePayslip.other_deductions.toLocaleString()}</span>
                    </div>
                    <div className="payslip-line payslip-total" style={{ color: '#dc2626' }}>
                      <span>Total Deductions</span>
                      <span>-${(activePayslip.tax_deduction + activePayslip.social_deductions + activePayslip.other_deductions).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Banner */}
                <div className="net-pay-banner">
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>NET TAKE-HOME PAY</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Credited to employee bank account</div>
                  </div>
                  <div className="amount">
                    ${activePayslip.net_pay.toLocaleString()}
                  </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                  This document is a system-generated payslip authorized by HR-EcomEdge Enterprise System.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#ffffff' }}>
              <button className="btn btn-secondary" onClick={() => setShowPayslipModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  ArrowRight,
  X,
  CreditCard,
  ShieldCheck,
  Trash2,
  Loader2,
  Edit2,
  Sliders,
  Percent,
  Plus
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

  // Taxes & Deductions Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    tax_rate: 8.0,
    social_security_rate: 4.0,
    default_allowance: 1500.00,
    standard_monthly_hours: 160.0,
    overtime_multiplier: 1.5
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Edit Single Payslip Deductions/Pay Modal
  const [showEditSlipModal, setShowEditSlipModal] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);
  const [slipForm, setSlipForm] = useState({
    basic_pay: 0,
    overtime_pay: 0,
    allowances: 0,
    tax_deduction: 0,
    social_deductions: 0,
    other_deductions: 0,
    total_hours_worked: 0,
    overtime_hours: 0
  });
  const [savingSlip, setSavingSlip] = useState(false);

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

  const handleDeleteRun = async (runId) => {
    if (!window.confirm('Delete this draft payroll run? You can regenerate it with updated time logs.')) return;
    try {
      const res = await api.payroll.deleteRun(runId);
      showToast(res.message, 'info');
      setShowRunDetailModal(false);
      loadData();
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

  // Open & Save Global Config Modal
  const handleOpenConfigModal = async () => {
    try {
      const res = await api.payroll.getConfig();
      if (res.config) setConfigForm(res.config);
      setShowConfigModal(true);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.payroll.updateConfig(configForm);
      showToast(res.message, 'success');
      setShowConfigModal(false);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSavingConfig(false);
    }
  };

  // Open & Save Itemized Payslip Modal
  const handleOpenEditSlip = (slip) => {
    setEditingSlip(slip);
    setSlipForm({
      basic_pay: slip.basic_pay || 0,
      overtime_pay: slip.overtime_pay || 0,
      allowances: slip.allowances || 0,
      tax_deduction: slip.tax_deduction || 0,
      social_deductions: slip.social_deductions || 0,
      other_deductions: slip.other_deductions || 0,
      total_hours_worked: slip.total_hours_worked || 0,
      overtime_hours: slip.overtime_hours || 0
    });
    setShowEditSlipModal(true);
  };

  const handleSaveEditSlip = async (e) => {
    e.preventDefault();
    setSavingSlip(true);
    try {
      const res = await api.payroll.updatePayslip(editingSlip.id, slipForm);
      showToast(res.message, 'success');
      setShowEditSlipModal(false);

      // Refresh slips and run in modal
      if (selectedRun) {
        const runRes = await api.payroll.getRunById(selectedRun.id);
        setSelectedRun(runRes.run);
        setRunSlips(runRes.payslips || []);
      }
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSavingSlip(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Live computed values for edit slip modal
  const computedGross = (parseFloat(slipForm.basic_pay) || 0) + (parseFloat(slipForm.overtime_pay) || 0) + (parseFloat(slipForm.allowances) || 0);
  const computedDeductions = (parseFloat(slipForm.tax_deduction) || 0) + (parseFloat(slipForm.social_deductions) || 0) + (parseFloat(slipForm.other_deductions) || 0);
  const computedNet = Math.max(0, computedGross - computedDeductions);

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
              ? 'Automated salary computations from timesheets, overtime rates, and disbursements in Philippine Peso (₱).'
              : 'View itemized earnings, overtime compensations, and official payslips in Philippine Peso (₱).'}
          </p>
        </div>

        {isManager && (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleOpenConfigModal} title="Configure Default Deductions & Taxes">
              <Sliders size={16} />
              <span>Tax &amp; Deductions Rates</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
              <Calculator size={18} />
              <span>Generate New Payroll Run</span>
            </button>
          </div>
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
                      <Loader2 className="animate-spin" size={24} color="var(--brand-green)" style={{ margin: '0 auto 0.5rem' }} />
                      <div>Loading payroll batches...</div>
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
                      <td>₱{(run.total_gross || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>-₱{(run.total_deductions || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: '800', color: 'var(--success)' }}>
                        ₱{(run.total_net || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${run.status === 'paid' ? 'success' : (run.status === 'approved' ? 'info' : 'warning')}`}>
                          {run.status}
                        </span>
                      </td>
                      <td>{run.payment_date || 'Pending'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenRun(run)}
                            title="View Payslips"
                          >
                            <Eye size={14} />
                            <span>View Slips</span>
                          </button>
                          {run.status === 'draft' && (
                            <button
                              className="btn-icon"
                              onClick={() => handleDeleteRun(run.id)}
                              title="Delete Draft Run"
                              style={{ color: 'var(--danger)', width: '32px', height: '32px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
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
                      <Loader2 className="animate-spin" size={24} color="var(--brand-green)" style={{ margin: '0 auto 0.5rem' }} />
                      <div>Loading your payslips...</div>
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
                      <td>₱{slip.basic_pay.toLocaleString()}</td>
                      <td style={{ color: slip.overtime_pay > 0 ? 'var(--success)' : 'inherit' }}>
                        +₱{slip.overtime_pay.toLocaleString()}
                      </td>
                      <td>+₱{slip.allowances.toLocaleString()}</td>
                      <td style={{ fontWeight: '700' }}>₱{slip.gross_pay.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>
                        -₱{(slip.tax_deduction + slip.social_deductions + slip.other_deductions).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '800', color: 'var(--success)' }}>
                        ₱{slip.net_pay.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${slip.payment_status === 'paid' ? 'success' : 'warning'}`}>
                          {slip.payment_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewPayslip(slip.id)}
                        >
                          <Printer size={14} />
                          <span>View Slip</span>
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
          GENERATE PAYROLL RUN MODAL
          ========================================== */}
      {showGenerateModal && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calculator size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>Calculate &amp; Generate Payroll Run</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowGenerateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Select the compensation cycle date range. The system will calculate basic wages, logged overtime, allowances, and statutory taxes according to active deduction rules.
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
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
          GLOBAL TAX & DEDUCTIONS CONFIG MODAL
          ========================================== */}
      {showConfigModal && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sliders size={20} color="var(--brand-green)" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>Default Tax &amp; Deduction Rates</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowConfigModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Configure company-wide standard deduction percentages and monthly allowances applied to automated payroll computations.
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Withholding Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    className="form-control"
                    value={configForm.tax_rate}
                    onChange={(e) => setConfigForm({ ...configForm, tax_rate: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Social Security &amp; Healthcare Contribution Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    className="form-control"
                    value={configForm.social_security_rate}
                    onChange={(e) => setConfigForm({ ...configForm, social_security_rate: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Standard Monthly Transport &amp; Meal Allowance (₱)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    className="form-control"
                    value={configForm.default_allowance}
                    onChange={(e) => setConfigForm({ ...configForm, default_allowance: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Benchmark Monthly Hours</label>
                    <input
                      type="number"
                      step="1"
                      min="40"
                      max="300"
                      className="form-control"
                      value={configForm.standard_monthly_hours}
                      onChange={(e) => setConfigForm({ ...configForm, standard_monthly_hours: parseFloat(e.target.value) || 160 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Overtime Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="3.0"
                      className="form-control"
                      value={configForm.overtime_multiplier}
                      onChange={(e) => setConfigForm({ ...configForm, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingConfig}>
                  <CheckCircle2 size={16} />
                  <span>{savingConfig ? 'Saving...' : 'Save Default Rates'}</span>
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
        <div className="modal-backdrop" style={{ zIndex: 1000, padding: '1rem' }}>
          <div className="modal-card modal-xl" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1001, maxWidth: '1240px', width: '96vw' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Banknote size={22} color="var(--primary)" />
                <div>
                  <h3 style={{ margin: 0 }}>Payroll Batch: {selectedRun.payroll_code}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Period: {selectedRun.period_start} ~ {selectedRun.period_end} • Status: <span className={`badge badge-${selectedRun.status === 'paid' ? 'success' : 'warning'}`}>{selectedRun.status}</span>
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowRunDetailModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Batch Actions Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Disbursement Total</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)' }}>
                    ₱{(selectedRun.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      Mark as Paid &amp; Disbursed
                    </button>
                  )}
                </div>
              </div>

              {/* Slips table */}
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '160px' }}>Employee</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Logged Hours</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Basic Pay</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Overtime</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Allowances</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Gross</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Deductions</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Net Pay</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Slip / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runSlips.map((slip) => (
                      <tr key={slip.id}>
                        <td>
                          <div style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{slip.first_name} {slip.last_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{slip.employee_code} • {slip.department}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: (slip.total_hours_worked || 0) > 0 ? 'var(--brand-green)' : 'var(--text-muted)' }}>
                            {(slip.total_hours_worked || 0).toFixed(1)} hrs
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>₱{(slip.basic_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>+₱{(slip.overtime_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>+₱{(slip.allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>₱{(slip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                          -₱{((slip.tax_deduction || 0) + (slip.social_deductions || 0) + (slip.other_deductions || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ fontWeight: '800', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                          ₱{(slip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {selectedRun.status === 'draft' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditSlip(slip)}
                                title="Edit Deductions, Taxes & Pay"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => handleViewPayslip(slip.id)} title="Print Payslip">
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedRun.status === 'draft' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRun(selectedRun.id)}>
                    <Trash2 size={14} /> Delete Draft Run
                  </button>
                )}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowRunDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT ITEMIZED PAYSLIP DEDUCTIONS & PAY MODAL (Top Layer: z-index 99999)
          ========================================== */}
      {showEditSlipModal && editingSlip && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: 'rgba(10, 25, 49, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              zIndex: 100000,
              maxWidth: '580px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit2 size={20} color="var(--brand-green)" />
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800 }}>Edit Payslip Deductions &amp; Compensation</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {editingSlip.first_name} {editingSlip.last_name} ({editingSlip.employee_code})
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowEditSlipModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSlip}>
              <div className="modal-body">
                {/* Earnings breakdown */}
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Gross Earnings (₱)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Basic Pay (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.basic_pay}
                      onChange={(e) => setSlipForm({ ...slipForm, basic_pay: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Overtime Pay (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.overtime_pay}
                      onChange={(e) => setSlipForm({ ...slipForm, overtime_pay: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Allowances (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.allowances}
                      onChange={(e) => setSlipForm({ ...slipForm, allowances: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Deductions breakdown */}
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Itemized Deductions &amp; Taxes (₱)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Withholding Tax (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.tax_deduction}
                      onChange={(e) => setSlipForm({ ...slipForm, tax_deduction: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Social / Health (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.social_deductions}
                      onChange={(e) => setSlipForm({ ...slipForm, social_deductions: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Other Deductions (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={slipForm.other_deductions}
                      onChange={(e) => setSlipForm({ ...slipForm, other_deductions: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. loans / advances"
                    />
                  </div>
                </div>

                {/* Live Computed Summary Banner */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gross Earnings</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>₱{computedGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>Total Deductions</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)' }}>-₱{computedDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--success)' }}>Net Take-Home Pay</div>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--success)' }}>₱{computedNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditSlipModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingSlip}>
                  <CheckCircle2 size={16} />
                  <span>{savingSlip ? 'Saving...' : 'Save & Recalculate Slip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          PRINTABLE PAYSLIP MODAL
          ========================================== */}
      {showPayslipModal && activePayslip && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()} style={{ background: '#f1f5f9', zIndex: 1301, maxWidth: '880px' }}>
            <div className="modal-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={20} color="var(--brand-green)" />
                <h3 style={{ color: 'var(--brand-navy)', margin: 0, fontWeight: 800 }}>Official Employee Payslip</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={15} />
                  <span>Print / Export PDF</span>
                </button>
                <button className="btn-icon" onClick={() => setShowPayslipModal(false)} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '1.75rem', background: '#f1f5f9', overflowY: 'auto', maxHeight: '78vh' }}>
              {/* Paper Layout */}
              <div className="payslip-paper">
                {/* 1. Header Row */}
                <div className="payslip-header-row">
                  <div>
                    <h1 className="payslip-brand-title">ECOMEDGE</h1>
                    <div className="payslip-brand-subhead">Research and Analysis Services</div>
                    <div className="payslip-code-text">
                      Payroll Code: <strong style={{ color: '#0f172a' }}>{activePayslip.payroll_code}</strong>
                    </div>
                  </div>

                  <div className="payslip-doc-meta">
                    <h2 className="payslip-doc-title">PAYSLIP VOUCHER</h2>
                    <div className="payslip-period-text">
                      Period: <strong>{activePayslip.period_start}</strong> ~ <strong>{activePayslip.period_end}</strong>
                    </div>
                    <div>
                      {activePayslip.payment_status === 'paid' || activePayslip.payment_date ? (
                        <span className="payslip-status-pill paid">
                          <CheckCircle2 size={12} /> Disbursed ({activePayslip.payment_date || 'Paid'})
                        </span>
                      ) : (
                        <span className="payslip-status-pill pending">
                          <Clock size={12} /> Pending Processing
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accent Divider */}
                <div className="payslip-divider-bar" />

                {/* 2. Employee Metadata Grid */}
                <div className="payslip-employee-card">
                  <div className="payslip-meta-item">
                    <div className="label">Employee Name</div>
                    <div className="value">{activePayslip.first_name} {activePayslip.last_name}</div>
                  </div>
                  <div className="payslip-meta-item">
                    <div className="label">Employee Code</div>
                    <div className="value" style={{ fontFamily: 'ui-monospace, monospace' }}>{activePayslip.employee_code}</div>
                  </div>
                  <div className="payslip-meta-item">
                    <div className="label">Department / Team</div>
                    <div className="value">{activePayslip.department || 'General Operations'}</div>
                  </div>
                  <div className="payslip-meta-item">
                    <div className="label">Designation / Role</div>
                    <div className="value">{activePayslip.job_title || 'Staff Specialist'}</div>
                  </div>
                  <div className="payslip-meta-item">
                    <div className="label">Payment Method / Bank</div>
                    <div className="value">{activePayslip.bank_name || 'BDO Unibank'} - {activePayslip.bank_account_number || '•••• ••••'}</div>
                  </div>
                  <div className="payslip-meta-item">
                    <div className="label">Logged Attendance</div>
                    <div className="value" style={{ color: (activePayslip.total_hours_worked || 0) > 0 ? '#009640' : '#64748b' }}>
                      {(activePayslip.total_hours_worked || 0).toFixed(1)} hrs {activePayslip.overtime_hours > 0 ? `(+${activePayslip.overtime_hours}h OT)` : ''}
                    </div>
                  </div>
                </div>

                {/* 3. Side-by-Side Breakdown Tables */}
                <div className="payslip-breakdown-grid">
                  {/* Earnings Block */}
                  <div className="payslip-block">
                    <div className="payslip-block-header earnings">
                      <span>1. Gross Earnings</span>
                      <span>Amount (PHP)</span>
                    </div>
                    <table className="payslip-table">
                      <tbody>
                        <tr>
                          <td>Basic Compensation</td>
                          <td className="amount">₱{(activePayslip.basic_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td>Overtime Pay ({activePayslip.overtime_hours || 0} hrs)</td>
                          <td className="amount">₱{(activePayslip.overtime_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td>Transport &amp; Meal Allowance</td>
                          <td className="amount">₱{(activePayslip.allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="subtotal-row">
                          <td style={{ fontWeight: 800 }}>Total Gross Earnings</td>
                          <td className="amount" style={{ fontWeight: 900, color: '#0f172a' }}>
                            ₱{(activePayslip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions Block */}
                  <div className="payslip-block">
                    <div className="payslip-block-header deductions">
                      <span>2. Itemized Deductions</span>
                      <span>Amount (PHP)</span>
                    </div>
                    <table className="payslip-table">
                      <tbody>
                        <tr>
                          <td>Withholding Tax (BIR)</td>
                          <td className="amount" style={{ color: '#dc2626' }}>
                            -₱{(activePayslip.tax_deduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td>SSS / PhilHealth / HDMF</td>
                          <td className="amount" style={{ color: '#dc2626' }}>
                            -₱{(activePayslip.social_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td>Other Deductions / Advances</td>
                          <td className="amount" style={{ color: '#dc2626' }}>
                            -₱{(activePayslip.other_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="subtotal-row">
                          <td style={{ fontWeight: 800, color: '#dc2626' }}>Total Deductions</td>
                          <td className="amount" style={{ fontWeight: 900, color: '#dc2626' }}>
                            -₱{((activePayslip.tax_deduction || 0) + (activePayslip.social_deductions || 0) + (activePayslip.other_deductions || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Highlighted Net Pay Callout Banner */}
                <div className="payslip-net-card">
                  <div>
                    <div className="payslip-net-label">Net Take-Home Pay (Disbursed in PHP)</div>
                    <div className="payslip-net-amount">
                      ₱{(activePayslip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="payslip-net-seal">
                    <div className="payslip-net-seal-title">
                      <CheckCircle2 size={15} /> Verified Digital Record
                    </div>
                    <div className="payslip-net-seal-sub">Ecomedge Enterprise Seal</div>
                  </div>
                </div>

                {/* 5. Sign-off Acknowledgement Block */}
                <div className="payslip-signoff-row">
                  <div className="payslip-sign-col">
                    <div className="payslip-sign-line" />
                    <div className="payslip-sign-name">Prepared by: HR &amp; Operations Management</div>
                    <div className="payslip-sign-title">Authorized Payroll Officer</div>
                  </div>
                  <div className="payslip-sign-col">
                    <div className="payslip-sign-line" />
                    <div className="payslip-sign-name">Received by: {activePayslip.first_name} {activePayslip.last_name}</div>
                    <div className="payslip-sign-title">Employee Signature &amp; Date</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-secondary" onClick={() => setShowPayslipModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

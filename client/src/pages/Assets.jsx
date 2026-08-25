import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Laptop,
  Plus,
  Search,
  Filter,
  UserCheck,
  RotateCcw,
  Trash2,
  X,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Smartphone,
  HardDrive
} from 'lucide-react';

export default function Assets() {
  const { isManager, showToast } = useAuth();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Forms
  const [assetForm, setAssetForm] = useState({
    asset_tag: '',
    name: '',
    category: 'laptop',
    model_serial: '',
    condition: 'new',
    notes: '',
    assigned_to: '',
    expected_return_date: ''
  });

  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    expected_return_date: ''
  });

  const [returnForm, setReturnForm] = useState({
    condition: 'good',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const [aRes, eRes] = await Promise.all([
          api.assets.getAll({ search, category: categoryFilter, status: statusFilter }),
          api.employees.getAll()
        ]);
        setAssets(aRes.assets || []);
        setEmployees(eRes.employees || []);
      } else {
        const myRes = await api.assets.getMy();
        setAssets(myRes.assets || []);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, statusFilter, isManager]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.assets.create(assetForm);
      showToast('Asset added to company inventory.', 'success');
      setShowAddModal(false);
      setAssetForm({
        asset_tag: '',
        name: '',
        category: 'laptop',
        model_serial: '',
        condition: 'new',
        notes: '',
        assigned_to: '',
        expected_return_date: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      await api.assets.assign(selectedAsset.id, assignForm.employee_id, assignForm.expected_return_date);
      showToast('Asset successfully assigned.', 'success');
      setShowAssignModal(false);
      setSelectedAsset(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      await api.assets.returnAsset(selectedAsset.id, returnForm.condition, returnForm.notes);
      showToast('Asset returned to available stock.', 'info');
      setShowReturnModal(false);
      setSelectedAsset(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this asset?')) return;
    try {
      await api.assets.delete(id);
      showToast('Asset deleted from inventory.', 'info');
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            {isManager ? 'Company Asset & Hardware Inventory' : 'My Assigned Equipment'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isManager
              ? 'Track laptops, monitors, accessories, serial numbers, and equipment allocations.'
              : 'View devices and peripherals officially issued for your workstation.'}
          </p>
        </div>

        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>Add Asset Tag</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {isManager && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by tag, model, or staff name..."
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>

            <div>
              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="laptop">Laptops / MacBooks</option>
                <option value="monitor">Monitors & Displays</option>
                <option value="peripheral">Keyboards & Mice</option>
                <option value="mobile">Mobile Devices</option>
                <option value="equipment">Other Equipment</option>
              </select>
            </div>

            <div>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="available">Available in Stock</option>
                <option value="assigned">Assigned to Staff</option>
                <option value="maintenance">In Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Asset Tag</th>
              <th>Equipment Name</th>
              <th>Category</th>
              <th>Serial / Model</th>
              <th>Status</th>
              {isManager && <th>Assigned Employee</th>}
              <th>Condition</th>
              {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading asset catalog...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No hardware assets registered.
                </td>
              </tr>
            ) : (
              assets.map((ast) => (
                <tr key={ast.id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {ast.asset_tag}
                  </td>
                  <td style={{ fontWeight: '600' }}>{ast.name}</td>
                  <td>
                    <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                      {ast.category}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ast.model_serial || 'N/A'}
                  </td>
                  <td>
                    <span className={`badge badge-${ast.status === 'assigned' ? 'info' : (ast.status === 'available' ? 'success' : 'warning')}`}>
                      {ast.status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      {ast.first_name ? (
                        <div>
                          <div style={{ fontWeight: '700' }}>{ast.first_name} {ast.last_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned: {ast.assigned_date}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned (In Inventory)</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {ast.condition}
                    </span>
                  </td>
                  {isManager && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {ast.status === 'available' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedAsset(ast);
                              setShowAssignModal(true);
                            }}
                          >
                            Assign
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedAsset(ast);
                              setShowReturnModal(true);
                            }}
                          >
                            Return
                          </button>
                        )}

                        <button
                          className="btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(ast.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          ADD ASSET MODAL
          ========================================== */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Laptop size={20} color="var(--primary)" />
                <h3>Add Hardware Asset</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateAsset}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Asset Tag / ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AST-MBP-05"
                      value={assetForm.asset_tag}
                      onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-control"
                      value={assetForm.category}
                      onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    >
                      <option value="laptop">Laptop / MacBook</option>
                      <option value="monitor">External Monitor</option>
                      <option value="peripheral">Keyboard / Mouse</option>
                      <option value="mobile">Smartphone / Tablet</option>
                      <option value="equipment">Other Equipment</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Equipment Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MacBook Pro 16 M3 Max 36GB"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. C02G4190MD6R"
                      value={assetForm.model_serial}
                      onChange={(e) => setAssetForm({ ...assetForm, model_serial: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select
                      className="form-control"
                      value={assetForm.condition}
                      onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                    >
                      <option value="new">Brand New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="damaged">Needs Repair</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Immediately to Employee (Optional)</label>
                  <select
                    className="form-control"
                    value={assetForm.assigned_to}
                    onChange={(e) => setAssetForm({ ...assetForm, assigned_to: e.target.value })}
                  >
                    <option value="">Keep in Available Inventory</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ASSIGN ASSET MODAL
          ========================================== */}
      {showAssignModal && selectedAsset && (
        <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserCheck size={20} color="var(--primary)" />
                <h3>Assign Asset to Staff</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAssignModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '700' }}>{selectedAsset.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tag: {selectedAsset.asset_tag} • SN: {selectedAsset.model_serial || 'N/A'}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    value={assignForm.employee_id}
                    onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Choose employee...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Return Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={assignForm.expected_return_date}
                    onChange={(e) => setAssignForm({ ...assignForm, expected_return_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          RETURN ASSET MODAL
          ========================================== */}
      {showReturnModal && selectedAsset && (
        <div className="modal-backdrop" onClick={() => setShowReturnModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <RotateCcw size={20} color="var(--primary)" />
                <h3>Return Asset to Stock</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowReturnModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReturnSubmit}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '700' }}>{selectedAsset.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Currently held by: {selectedAsset.first_name} {selectedAsset.last_name}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Return Condition *</label>
                  <select
                    className="form-control"
                    value={returnForm.condition}
                    onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                  >
                    <option value="good">Good / Functional</option>
                    <option value="new">Like New</option>
                    <option value="fair">Fair (Wear & Tear)</option>
                    <option value="damaged">Damaged / Needs Servicing</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes upon return</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Device returned clean, power adapter included..."
                    value={returnForm.notes}
                    onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Returning...' : 'Accept Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  FolderLock,
  Upload,
  FileText,
  Download,
  Trash2,
  Filter,
  Search,
  Plus,
  X,
  File,
  CheckCircle2
} from 'lucide-react';

export default function Documents() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('resume_cv');
  const [targetEmpId, setTargetEmpId] = useState('');
  const [uploading, setUploading] = useState(false);

  const categories = [
    { id: '', label: 'All Files' },
    { id: 'resume_cv', label: 'CV / Resumes' },
    { id: 'government_id', label: 'Government IDs & Passports' },
    { id: 'contract_nda', label: 'Contracts & Non-Disclosures' },
    { id: 'performance_review', label: 'Performance Evaluations' },
    { id: 'company_policy', label: 'Company Handbook & Policies' },
    { id: 'certificate', label: 'Training Certificates' },
    { id: 'other', label: 'Miscellaneous' }
  ];

  // Guard query execution until auth is fully resolved
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadDocs();
  }, [token, user?.id, authLoading, categoryFilter, selectedEmpId, search, isManager]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const [docRes, empRes] = await Promise.all([
          api.documents.getAll({ category: categoryFilter, employee_id: selectedEmpId, search }),
          api.employees.getAll()
        ]);
        setDocuments(docRes.documents || []);
        setEmployees(empRes.employees || []);
      } else {
        const docRes = await api.documents.getMy();
        let filtered = docRes.documents || [];
        if (categoryFilter) filtered = filtered.filter(d => d.category === categoryFilter);
        setDocuments(filtered);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please choose a file to upload.', 'warning');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('category', category);
      if (isManager && targetEmpId) {
        formData.append('employee_id', targetEmpId);
      }

      await api.documents.upload(formData);
      showToast('Document securely uploaded to vault.', 'success');
      setShowUploadModal(false);
      setFile(null);
      setTitle('');
      setTargetEmpId('');
      loadDocs();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document from the vault?')) return;
    try {
      await api.documents.delete(docId);
      showToast('Document removed.', 'info');
      loadDocs();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${Math.round(kb)} KB`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            {isManager ? 'Company Document Vault & Records' : 'My Documents & Files'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isManager
              ? 'Centralized encrypted archive for employee CVs, passports, signed agreements, and tax IDs.'
              : 'Upload and manage your Curriculum Vitae, government IDs, certificates, and view signed contracts.'}
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Category Pills Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`btn btn-sm ${categoryFilter === c.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCategoryFilter(c.id)}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Manager Employee Search Filter */}
      {isManager && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search documents by title or employee name..."
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>

            <div>
              <select
                className="form-control"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading document repository...
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FolderLock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>No documents found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Upload your CV, Government Passport/ID, or employment certificates to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={22} />
                  </div>

                  <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                    {doc.category.replace('_', ' ')}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem', lineHeight: '1.3' }}>
                  {doc.title}
                </h4>

                {isManager && doc.first_name && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Owner: <strong>{doc.first_name} {doc.last_name}</strong> ({doc.employee_code})
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Size: {formatFileSize(doc.file_size)} • Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                <a
                  href={doc.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>

                <button
                  className="btn-icon"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDelete(doc.id)}
                  title="Delete file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          UPLOAD MODAL
          ========================================== */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Upload size={20} color="var(--primary)" />
                <h3>Upload Document to Vault</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="modal-body">
                {isManager && (
                  <div className="form-group">
                    <label className="form-label">Assign To Employee *</label>
                    <select
                      className="form-control"
                      value={targetEmpId}
                      onChange={(e) => setTargetEmpId(e.target.value)}
                    >
                      <option value="">Myself / General</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Document Category *</label>
                  <select
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="resume_cv">Curriculum Vitae (CV) / Resume</option>
                    <option value="government_id">Government ID / Passport / Driver License</option>
                    <option value="contract">Employment Contract / Offer Letter / NDA</option>
                    <option value="certificate">Certification / Diploma / Training Proof</option>
                    <option value="performance_review">Performance Appraisal</option>
                    <option value="other">Other Official Document</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Document Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John_Doe_Passport_2026.pdf"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select File (PDF, DOCX, PNG, JPG, ZIP) *</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

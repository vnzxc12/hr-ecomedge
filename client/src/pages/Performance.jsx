import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Award, Plus, Star, Users, CheckCircle2, Search, Target, TrendingUp, Sparkles } from 'lucide-react';

export default function Performance() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    review_period: 'Q3 2026',
    rating: 5.0,
    productivity_score: 5.0,
    quality_score: 5.0,
    accuracy_score: 5.0,
    client_satisfaction: 5.0,
    goals: '',
    manager_comments: '',
    employee_comments: '',
    review_date: new Date().toISOString().split('T')[0]
  });

  // Guard query execution until auth is fully resolved
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [token, user?.id, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, empRes] = await Promise.all([
        api.performance.getAll(),
        api.employees.getAll()
      ]);
      setReviews(revRes.reviews || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.performance.create(formData);
      showToast('Performance appraisal submitted successfully!', 'success');
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={26} color="var(--brand-green)" /> Performance &amp; KPI Appraisals
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Track research quality, catalog accuracy, client satisfaction, and quarterly milestone goals.
          </p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Performance Review
          </button>
        )}
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          No performance reviews recorded yet.
        </div>
      ) : (
        <div className="grid-responsive-cards">
          {reviews.map(rev => (
            <div key={rev.id} className="glass-card review-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                  {rev.review_period}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.92rem' }}>
                  <Star size={16} fill="#f59e0b" />
                  <span>{rev.rating.toFixed(1)} / 5.0</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="user-avatar" style={{ width: '38px', height: '38px', fontSize: '0.85rem' }}>
                  {rev.avatar_url ? <img src={rev.avatar_url} alt="Avatar" /> : rev.first_name[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    {rev.first_name} {rev.last_name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rev.job_title} • {rev.team_name || rev.department}
                  </div>
                </div>
              </div>

              {/* KPI Scores Breakdown */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Productivity: </span>
                  <strong>{rev.productivity_score} / 5</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Quality: </span>
                  <strong>{rev.quality_score} / 5</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Accuracy: </span>
                  <strong>{rev.accuracy_score} / 5</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Client Rating: </span>
                  <strong>{rev.client_satisfaction} / 5</strong>
                </div>
              </div>

              {rev.goals && (
                <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--brand-green)' }}>Quarterly Goals: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{rev.goals}</span>
                </div>
              )}

              {rev.manager_comments && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', fontStyle: 'italic' }}>
                  "{rev.manager_comments}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Review Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>Submit Performance Appraisal</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Employee *</label>
                    <select
                      className="form-control"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.job_title})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Review Period *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Q3 2026 or Annual 2026"
                      value={formData.review_period}
                      onChange={(e) => setFormData({ ...formData, review_period: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Overall Rating (1.0 - 5.0)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      className="form-control"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Research Accuracy (1 - 5)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      className="form-control"
                      value={formData.accuracy_score}
                      onChange={(e) => setFormData({ ...formData, accuracy_score: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Productivity Score (1 - 5)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      className="form-control"
                      value={formData.productivity_score}
                      onChange={(e) => setFormData({ ...formData, productivity_score: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Deliverable Quality (1 - 5)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      className="form-control"
                      value={formData.quality_score}
                      onChange={(e) => setFormData({ ...formData, quality_score: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Quarterly Goals &amp; Milestone Targets</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Master Helium 10 reverse ASIN scraping pipeline"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Manager Feedback &amp; Appraisal Comments</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Provide specific feedback on data accuracy, diligence, and team leadership..."
                    value={formData.manager_comments}
                    onChange={(e) => setFormData({ ...formData, manager_comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Appraisal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Building2, Users, Plus, Edit2, Trash2, CheckCircle2, Search, ArrowRight, UserCheck } from 'lucide-react';

export default function Teams() {
  const { isManager, showToast } = useAuth();
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', department: 'Research & Analytics', team_lead_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamRes, empRes] = await Promise.all([
        api.teams.getAll(),
        api.employees.getAll()
      ]);
      setTeams(teamRes.teams || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedTeam(null);
    setFormData({ name: '', description: '', department: 'Research & Analytics', team_lead_id: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      department: team.department,
      team_lead_id: team.team_lead_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTeam) {
        await api.teams.update(selectedTeam.id, formData);
        showToast('Team updated successfully!', 'success');
      } else {
        await api.teams.create(formData);
        showToast('Team created successfully!', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team? Members will be unassigned from this team.')) return;
    try {
      await api.teams.delete(id);
      showToast('Team deleted successfully.', 'info');
      loadData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={26} color="var(--brand-green)" /> Teams &amp; Departments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Manage EcomEdge functional groups, research squads, and team lead structures.
          </p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Team
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search teams by name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading teams...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          No teams found matching your search.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredTeams.map((team) => (
            <div key={team.id} className="glass-card team-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                  {team.department}
                </span>
                {isManager && (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn-icon" onClick={() => handleOpenEdit(team)} title="Edit Team" style={{ width: '30px', height: '30px' }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(team.id)} title="Delete Team" style={{ width: '30px', height: '30px', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                {team.name}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', minHeight: '38px', lineHeight: '1.4' }}>
                {team.description || 'Specialized workforce team supporting research and e-commerce client operations.'}
              </p>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.65rem' }}>
                    {team.lead_avatar_url ? (
                      <img src={team.lead_avatar_url} alt="Lead" />
                    ) : (
                      team.lead_first_name ? team.lead_first_name[0] : 'U'
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lead: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {team.lead_first_name ? `${team.lead_first_name} ${team.lead_last_name}` : 'Unassigned'}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-green)' }}>
                  <Users size={15} />
                  <span>{team.member_count || 0} Staff</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem' }}>
                {selectedTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Team Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. E-Commerce Research"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department *</label>
                  <select
                    className="form-control"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  >
                    <option value="Research & Analytics">Research &amp; Analytics</option>
                    <option value="Operations">Operations</option>
                    <option value="Client Services">Client Services</option>
                    <option value="Management">Management</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Team Lead</label>
                  <select
                    className="form-control"
                    value={formData.team_lead_id}
                    onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
                  >
                    <option value="">-- Select Team Lead --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.job_title})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe this team's primary tasks and client deliverables..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

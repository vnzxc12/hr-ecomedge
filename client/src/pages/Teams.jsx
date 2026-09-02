import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Building2, Users, Plus, Edit2, Trash2, CheckCircle2, Search, ArrowRight, UserCheck, UserPlus, UserMinus, X, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function Teams() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', department: 'Research & Analytics', team_lead_id: '' });

  // Team Members Modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeTeamMembers, setActiveTeamMembers] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [selectedEmpToAssign, setSelectedEmpToAssign] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Guard query execution until auth is fully resolved
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    loadData();
  }, [token, user?.id, authLoading]);

  // Global cache invalidation subscriber
  useEffect(() => {
    const handleInvalidate = () => {
      if (token && !authLoading) {
        loadData();
      }
    };
    window.addEventListener('teams:invalidate', handleInvalidate);
    return () => window.removeEventListener('teams:invalidate', handleInvalidate);
  }, [token, authLoading]);

  const loadData = async () => {
    setLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const [teamRes, empRes] = await Promise.all([
        api.teams.getAll(),
        api.employees.getAll()
      ]);
      setTeams(teamRes.teams || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to load teams & departments.');
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
      window.dispatchEvent(new CustomEvent('teams:invalidate'));
      window.dispatchEvent(new CustomEvent('employees:invalidate'));
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
      window.dispatchEvent(new CustomEvent('teams:invalidate'));
      window.dispatchEvent(new CustomEvent('employees:invalidate'));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Open Manage Members Modal
  const handleOpenMembersModal = async (team) => {
    setActiveTeamMembers(team);
    setSelectedEmpToAssign('');
    setShowMembersModal(true);
    setLoadingMembers(true);
    try {
      const res = await api.teams.getById(team.id);
      setMembersList(res.members || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAssignMember = async (e) => {
    e.preventDefault();
    if (!selectedEmpToAssign || !activeTeamMembers) return;
    setIsAssigning(true);
    try {
      await api.teams.assignMember(activeTeamMembers.id, { employee_id: parseInt(selectedEmpToAssign, 10) });
      showToast('Member assigned to team successfully!', 'success');
      setSelectedEmpToAssign('');
      // Reload roster
      const res = await api.teams.getById(activeTeamMembers.id);
      setMembersList(res.members || []);
      loadData();
      window.dispatchEvent(new CustomEvent('teams:invalidate'));
      window.dispatchEvent(new CustomEvent('employees:invalidate'));
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMember = async (empId, empName) => {
    if (!window.confirm(`Remove ${empName} from this team?`)) return;
    try {
      await api.teams.removeMember(activeTeamMembers.id, empId);
      showToast(`${empName} removed from team.`, 'info');
      // Reload roster
      const res = await api.teams.getById(activeTeamMembers.id);
      setMembersList(res.members || []);
      loadData();
      window.dispatchEvent(new CustomEvent('teams:invalidate'));
      window.dispatchEvent(new CustomEvent('employees:invalidate'));
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
            Manage EcomEdge functional groups, research squads, team assignments, and leadership structures.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => loadData()}
            title="Refresh Teams"
          >
            <Loader2 size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {isManager && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Add Team
            </button>
          )}
        </div>
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

      {/* Teams Grid / Loading / Error States */}
      {(loading || authLoading) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--brand-green)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hydrating Teams &amp; Squad Rosters...</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Synchronizing departmental records from EcomEdge Cloud</div>
          </div>
          <div className="grid-responsive-cards">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: '190px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ height: '20px', width: '40%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{ height: '32px', width: '70%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{ height: '36px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Unable to Load Teams</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 1rem' }}>
            {errorMessage || 'A network error occurred while retrieving team data.'}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
            Retry Connection
          </button>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Building2 size={38} color="var(--text-muted)" style={{ margin: '0 auto 0.85rem', opacity: 0.6 }} />
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No teams found</div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '440px', margin: '0.3rem auto 1.25rem' }}>
            {search ? 'No squads matched your search query.' : 'No teams have been created yet. Click below to add your first operational team.'}
          </p>
          <div style={{ display: 'inline-flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {search && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>
                Clear Search
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
              Refresh
            </button>
            {isManager && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                <Plus size={14} /> Add Team
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-responsive-cards">
          {filteredTeams.map((team) => (
            <div key={team.id} className="glass-card team-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
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
              </div>

              <div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    <span>{team.member_count || 0} Members</span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                  onClick={() => handleOpenMembersModal(team)}
                >
                  <Users size={14} /> Manage Team Members &amp; Roster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem' }}>
                {selectedTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button type="button" className="btn-icon" onClick={() => setShowModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Team Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. E-Commerce Research Squad A"
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

      {/* Manage Team Members & Roster Modal */}
      {showMembersModal && activeTeamMembers && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '95vw', zIndex: 1101 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Building2 size={22} color="var(--brand-green)" />
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800 }}>Team Roster: {activeTeamMembers.name}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {activeTeamMembers.department} • {membersList.length} Active Members
                  </span>
                </div>
              </div>
              <button type="button" className="btn-icon" onClick={() => setShowMembersModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Quick Member Assignment Box (Managers) */}
              {isManager && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                    <UserPlus size={16} color="var(--brand-green)" /> Assign Staff Member to Team
                  </h4>
                  <form onSubmit={handleAssignMember} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="form-control"
                      style={{ flex: 1, minWidth: '220px' }}
                      value={selectedEmpToAssign}
                      onChange={(e) => setSelectedEmpToAssign(e.target.value)}
                      required
                    >
                      <option value="">-- Select Employee to Assign --</option>
                      {employees
                        .filter(emp => emp.employment_status === 'active' && !membersList.some(m => m.id === emp.id))
                        .map(emp => {
                          const currentTeam = teams.find(t => t.id === emp.team_id);
                          return (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name} — {emp.job_title} ({currentTeam ? `Currently: ${currentTeam.name}` : 'Unassigned'})
                            </option>
                          );
                        })}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!selectedEmpToAssign || isAssigning}>
                      <Plus size={14} /> {isAssigning ? 'Assigning...' : 'Add to Team'}
                    </button>
                  </form>
                </div>
              )}

              {/* Roster List Table */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem 0' }}>
                  Current Team Members ({membersList.length})
                </h4>

                {loadingMembers ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading roster...</div>
                ) : membersList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.88rem' }}>No staff members currently assigned to this team.</p>
                    {isManager && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem' }}>Use the form above to assign employees into this squad.</p>}
                  </div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Role / Job Title</th>
                          <th>Department</th>
                          <th>Status</th>
                          {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {membersList.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.78rem' }}>
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.first_name} />
                                  ) : (
                                    member.first_name[0]
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{member.first_name} {member.last_name}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.employee_code}</div>
                                </div>
                              </div>
                            </td>
                            <td>{member.job_title}</td>
                            <td>{member.department}</td>
                            <td>
                              <span className={`badge badge-${member.employment_status === 'active' ? 'success' : 'warning'}`} style={{ textTransform: 'capitalize' }}>
                                {member.employment_status}
                              </span>
                            </td>
                            {isManager && (
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                  onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                                  title="Remove from team"
                                >
                                  <UserMinus size={13} />
                                  <span>Remove</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMembersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


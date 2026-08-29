import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FolderKanban, Plus, Users, Briefcase, Calendar, CheckCircle2, Search, BarChart2, ArrowUpRight, Clock, ShieldAlert, X, Edit2, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export default function Projects() {
  const { user, token, loading: authLoading, isManager, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'clients', 'workload'
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workloadData, setWorkloadData] = useState({ teams: [], employeeWorkloads: [] });
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Forms
  const [projectForm, setProjectForm] = useState({
    client_id: '',
    name: '',
    project_code: '',
    description: '',
    project_manager_id: '',
    team_id: '',
    start_date: '',
    end_date: '',
    priority: 'high',
    budget: ''
  });

  const [assignForm, setAssignForm] = useState({
    project_id: '',
    employee_id: '',
    role_on_project: 'Research Analyst',
    allocation_percent: 100,
    start_date: '',
    end_date: ''
  });

  const [clientForm, setClientForm] = useState({
    name: '',
    code: '',
    industry: 'E-Commerce Research & Analytics',
    contact_person: '',
    email: '',
    phone: ''
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

  // Global cache invalidation subscriber
  useEffect(() => {
    const handleInvalidate = () => {
      if (token && !authLoading) {
        loadData();
      }
    };
    window.addEventListener('projects:invalidate', handleInvalidate);
    window.addEventListener('teams:invalidate', handleInvalidate);
    return () => {
      window.removeEventListener('projects:invalidate', handleInvalidate);
      window.removeEventListener('teams:invalidate', handleInvalidate);
    };
  }, [token, authLoading]);

  const loadData = async () => {
    setLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const [prjRes, clientRes, teamRes, empRes, workloadRes] = await Promise.all([
        api.projects.getAll(),
        api.projects.getClients(),
        api.teams.getAll(),
        api.employees.getAll(),
        api.projects.getWorkload()
      ]);
      setProjects(prjRes.projects || []);
      setClients(clientRes.clients || []);
      setTeams(teamRes.teams || []);
      setEmployees(empRes.employees || []);
      setWorkloadData(workloadRes || { teams: [], employeeWorkloads: [] });
    } catch (err) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to load projects and operations data.');
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await api.projects.create(projectForm);
      showToast('Project created successfully!', 'success');
      setShowProjectModal(false);
      setProjectForm({
        client_id: '',
        name: '',
        project_code: '',
        description: '',
        project_manager_id: '',
        team_id: '',
        start_date: '',
        end_date: '',
        priority: 'high',
        budget: ''
      });
      loadData();
      window.dispatchEvent(new CustomEvent('projects:invalidate'));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleAssignMember = async (e) => {
    e.preventDefault();
    try {
      await api.projects.assign(assignForm);
      showToast('Employee assigned to project successfully!', 'success');
      setShowAssignModal(false);
      setAssignForm({
        project_id: '',
        employee_id: '',
        role_on_project: 'Research Analyst',
        allocation_percent: 100,
        start_date: '',
        end_date: ''
      });
      loadData();
      window.dispatchEvent(new CustomEvent('projects:invalidate'));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      await api.projects.createClient(clientForm);
      showToast('Client added successfully!', 'success');
      setShowClientModal(false);
      setClientForm({
        name: '',
        code: '',
        industry: 'E-Commerce Research & Analytics',
        contact_person: '',
        email: '',
        phone: ''
      });
      loadData();
      window.dispatchEvent(new CustomEvent('projects:invalidate'));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDeleteClient = async (id, clientName) => {
    if (!window.confirm(`Delete client "${clientName}"? Any associated projects will also be deleted.`)) return;
    try {
      await api.projects.deleteClient(id);
      showToast('Client deleted successfully.', 'info');
      loadData();
      window.dispatchEvent(new CustomEvent('projects:invalidate'));
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
            <FolderKanban size={26} color="var(--brand-green)" /> E-Commerce Clients &amp; Projects
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Track client research intelligence projects, work assignments, and agency team workload.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => loadData()}
            title="Refresh Projects &amp; Clients"
          >
            <Loader2 size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {isManager && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowClientModal(true)}>
                <Plus size={15} /> Add Client
              </button>
              <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
                <Plus size={15} /> Add Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="subtabs-bar">
        <button
          className={`subtab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban size={16} /> Active Projects ({projects.length})
        </button>
        <button
          className={`subtab-btn ${activeTab === 'workload' ? 'active' : ''}`}
          onClick={() => setActiveTab('workload')}
        >
          <BarChart2 size={16} /> Team Workload &amp; Allocation
        </button>
        <button
          className={`subtab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Briefcase size={16} /> Client Accounts ({clients.length})
        </button>
      </div>

      {/* Content Rendering / Loading / Error States */}
      {(loading || authLoading) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--brand-green)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hydrating Client Projects &amp; Workload Data...</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Synchronizing enterprise client records from EcomEdge Cloud</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: '210px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ height: '22px', width: '35%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{ height: '32px', width: '65%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{ height: '40px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Unable to Load Operations Data</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 1rem' }}>
            {errorMessage || 'A network error occurred while retrieving project records.'}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
            Retry Connection
          </button>
        </div>
      ) : activeTab === 'projects' ? (
        /* PROJECTS VIEW */
        projects.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <FolderKanban size={38} color="var(--text-muted)" style={{ margin: '0 auto 0.85rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No active projects found</div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '440px', margin: '0.3rem auto 1.25rem' }}>
              No research or analytics projects are currently active. Click below to initialize a client project deliverable.
            </p>
            <div style={{ display: 'inline-flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
                Refresh
              </button>
              {isManager && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowProjectModal(true)}>
                  <Plus size={14} /> Add Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {projects.map(prj => (
              <div key={prj.id} className="glass-card project-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    {prj.client_name || 'Client Account'}
                  </span>
                  <span className={`badge ${prj.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                    {prj.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {prj.name}
                </h3>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-green)', marginBottom: '0.6rem' }}>
                  CODE: {prj.project_code} • {prj.team_name || 'Research Team'}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', minHeight: '36px', lineHeight: '1.4' }}>
                  {prj.description || 'Deliverable-driven marketplace analytics and research scope.'}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Manager: <strong style={{ color: 'var(--text-primary)' }}>{prj.pm_first_name ? `${prj.pm_first_name} ${prj.pm_last_name}` : 'Unassigned'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-green)' }}>
                      {prj.assigned_count || 0} Assigned
                    </span>
                    {isManager && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setAssignForm({ ...assignForm, project_id: prj.id });
                          setShowAssignModal(true);
                        }}
                        title="Assign Staff"
                      >
                        <Plus size={13} /> Assign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'workload' ? (
        /* TEAM WORKLOAD VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Team Aggregates */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} color="var(--brand-green)" /> Team Allocation Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {workloadData.teams.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem' }}>{t.name}</strong>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{t.department}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Active Squad Staff:</span>
                      <strong>{t.total_employees} Staff</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Active Projects:</span>
                      <strong>{t.active_projects} Projects</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Average Utilization:</span>
                      <strong style={{ color: t.avg_allocation > 100 ? 'var(--danger)' : 'var(--brand-green)' }}>
                        {Math.round(t.avg_allocation)}%
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Workload Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--brand-green)" /> Staff Member Allocation &amp; Capacity
              </h3>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Team</th>
                    <th>Job Title</th>
                    <th>Assigned Projects</th>
                    <th>Total Allocation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.employeeWorkloads.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {emp.avatar_url ? <img src={emp.avatar_url} alt="Avatar" /> : emp.first_name[0]}
                          </div>
                          <div>
                            <strong>{emp.first_name} {emp.last_name}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td>{emp.team_name || 'General'}</td>
                      <td>{emp.job_title}</td>
                      <td>
                        <span className="badge badge-success">{emp.assigned_projects_count} Projects</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div className="progress-bar-bg" style={{ width: '80px' }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.min(emp.total_allocation, 100)}%`,
                                background: emp.total_allocation > 100 ? 'var(--danger)' : 'var(--brand-green)'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{emp.total_allocation}%</span>
                        </div>
                      </td>
                      <td>
                        {emp.total_allocation > 100 ? (
                          <span className="badge badge-danger">Overallocated</span>
                        ) : emp.total_allocation >= 75 ? (
                          <span className="badge badge-success">Optimal</span>
                        ) : (
                          <span className="badge badge-warning">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* CLIENTS VIEW */
        clients.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Briefcase size={38} color="var(--text-muted)" style={{ margin: '0 auto 0.85rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No client accounts registered</div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '440px', margin: '0.3rem auto 1.25rem' }}>
              No commercial client profiles have been configured yet. Click below to add an e-commerce brand or agency partner.
            </p>
            <div style={{ display: 'inline-flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
                Refresh
              </button>
              {isManager && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowClientModal(true)}>
                  <Plus size={14} /> Add Client
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {clients.map(client => (
              <div key={client.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{client.code}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{client.project_count || 0} Projects</span>
                      {isManager && (
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          title="Delete Client"
                          style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem' }}>{client.name}</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--brand-green)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    {client.industry}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div>Contact: <strong style={{ color: 'var(--text-primary)' }}>{client.contact_person || 'N/A'}</strong></div>
                  <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{client.email || 'N/A'}</strong></div>
                  <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{client.phone || 'N/A'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="modal-backdrop">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Create New Client Research Project</h3>
              <button type="button" className="btn-icon" onClick={() => setShowProjectModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Client *</label>
                  <select
                    className="form-control"
                    value={projectForm.client_id}
                    onChange={(e) => setProjectForm({ ...projectForm, client_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Project Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Amazon Product Research"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Project Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. PRJ-AMZ-05"
                      value={projectForm.project_code}
                      onChange={(e) => setProjectForm({ ...projectForm, project_code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assigned Team</label>
                    <select
                      className="form-control"
                      value={projectForm.team_id}
                      onChange={(e) => setProjectForm({ ...projectForm, team_id: e.target.value })}
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Project Manager</label>
                    <select
                      className="form-control"
                      value={projectForm.project_manager_id}
                      onChange={(e) => setProjectForm({ ...projectForm, project_manager_id: e.target.value })}
                    >
                      <option value="">-- Select Manager --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Target End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Description &amp; Deliverables Scope</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter project deliverables, tools used, and research goals..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Assign Employee to Project</h3>
              <button type="button" className="btn-icon" onClick={() => setShowAssignModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignMember}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Employee *</label>
                  <select
                    className="form-control"
                    value={assignForm.employee_id}
                    onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.job_title} - {emp.team_name || emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role on Project *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Lead Research Analyst"
                    value={assignForm.role_on_project}
                    onChange={(e) => setAssignForm({ ...assignForm, role_on_project: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Allocation Percentage (%) *</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={10}
                    className="form-control"
                    value={assignForm.allocation_percent}
                    onChange={(e) => setAssignForm({ ...assignForm, allocation_percent: parseInt(e.target.value, 10) })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showClientModal && (
        <div className="modal-backdrop">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Add Client Account</h3>
              <button type="button" className="btn-icon" onClick={() => setShowClientModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateClient}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Client Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Apex Global Brands"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Client Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CLI-APX"
                    value={clientForm.code}
                    onChange={(e) => setClientForm({ ...clientForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Industry / Business Type</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Amazon US & Shopify DTC Brands"
                    value={clientForm.industry}
                    onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sarah Jenkins"
                      value={clientForm.contact_person}
                      onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="client@company.com"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

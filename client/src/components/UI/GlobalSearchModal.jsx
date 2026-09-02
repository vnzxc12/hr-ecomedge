import React, { useState, useEffect } from 'react';
import { Search, Users, FolderKanban, Briefcase, FileText, Laptop, ArrowRight, X } from 'lucide-react';
import { api } from '../../services/api';

export default function GlobalSearchModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ employees: [], projects: [], teams: [], documents: [], assets: [] });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ employees: [], projects: [], teams: [], documents: [], assets: [] });
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ employees: [], projects: [], teams: [], documents: [], assets: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [empRes, prjRes, teamRes] = await Promise.all([
          api.employees.getAll({ search: query }).catch(() => ({ employees: [] })),
          api.projects.getAll().catch(() => ({ projects: [] })),
          api.teams.getAll().catch(() => ({ teams: [] }))
        ]);

        const qLower = query.toLowerCase();
        const filteredProjects = (prjRes.projects || []).filter(p =>
          p.name.toLowerCase().includes(qLower) ||
          p.project_code.toLowerCase().includes(qLower) ||
          (p.client_name && p.client_name.toLowerCase().includes(qLower))
        );

        const filteredTeams = (teamRes.teams || []).filter(t =>
          t.name.toLowerCase().includes(qLower) ||
          t.department.toLowerCase().includes(qLower)
        );

        setResults({
          employees: (empRes.employees || []).slice(0, 5),
          projects: filteredProjects.slice(0, 5),
          teams: filteredTeams.slice(0, 4)
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.employees.length + results.projects.length + results.teams.length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card search-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Header Bar */}
        <div className="search-input-header">
          <Search size={20} color="var(--brand-green)" />
          <input
            type="text"
            className="search-main-input"
            placeholder="Search employees, teams, client projects, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query ? (
            <button className="btn-icon" onClick={() => setQuery('')} style={{ width: '28px', height: '28px' }} title="Clear search">
              <X size={16} />
            </button>
          ) : (
            <button className="btn-icon mobile-search-close" onClick={onClose} style={{ width: '28px', height: '28px' }} title="Close search">
              <X size={16} />
            </button>
          )}
          <span className="search-esc-badge">ESC</span>
        </div>

        {/* Search Body Results */}
        <div className="search-modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Searching EcomEdge records...
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
              No matches found for "<strong>{query}</strong>"
            </div>
          )}

          {!loading && !query && (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              Type at least 2 characters to search across staff, research projects, and teams.
            </div>
          )}

          {!loading && totalResults > 0 && (
            <div className="search-results-list">
              {/* Employees Section */}
              {results.employees.length > 0 && (
                <div className="search-section">
                  <div className="search-section-label">
                    <Users size={14} /> Employees &amp; Researchers ({results.employees.length})
                  </div>
                  {results.employees.map(emp => (
                    <div
                      key={`emp-${emp.id}`}
                      className="search-result-row"
                      onClick={() => {
                        onNavigate('employees', emp.id);
                        onClose();
                      }}
                    >
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt="Avatar" />
                        ) : (
                          <span>{emp.first_name[0]}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {emp.first_name} {emp.last_name} <span style={{ color: 'var(--brand-green)', fontSize: '0.75rem' }}>({emp.employee_code})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {emp.job_title} • {emp.team_name || emp.department}
                        </div>
                      </div>
                      <ArrowRight size={15} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Projects Section */}
              {results.projects.length > 0 && (
                <div className="search-section">
                  <div className="search-section-label">
                    <FolderKanban size={14} /> Client Research Projects ({results.projects.length})
                  </div>
                  {results.projects.map(prj => (
                    <div
                      key={`prj-${prj.id}`}
                      className="search-result-row"
                      onClick={() => {
                        onNavigate('projects', prj.id);
                        onClose();
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(0, 150, 64, 0.12)',
                        color: 'var(--brand-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Briefcase size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {prj.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{prj.project_code}]</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Client: {prj.client_name} • Team: {prj.team_name || 'E-Commerce'}
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{prj.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Teams Section */}
              {results.teams.length > 0 && (
                <div className="search-section">
                  <div className="search-section-label">
                    <Users size={14} /> Teams &amp; Departments ({results.teams.length})
                  </div>
                  {results.teams.map(team => (
                    <div
                      key={`team-${team.id}`}
                      className="search-result-row"
                      onClick={() => {
                        onNavigate('teams', team.id);
                        onClose();
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', flex: 1 }}>
                        {team.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({team.department})</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-green)', fontWeight: 600 }}>
                        {team.member_count || 0} Members
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="search-modal-footer">
          <span>Tip: Press <kbd>Tab</kbd> to navigate, <kbd>Enter</kbd> to open.</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

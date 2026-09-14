import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import {
  FolderGit2,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Tag,
  Building2,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENTS = [
  'All',
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Computer Applications',
  'Other'
];

export const AdminProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query projects with author profiles - strictly excluding email to protect PII
      const { data, error: fetchErr } = await supabase
        .from('projects')
        .select('*, profiles:user_id(full_name, department, role, is_verified, course, year)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching institutional projects:', err);
      setError(err.message || 'Unable to load projects from the collegiate repository.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.profiles?.full_name && p.profiles.full_name.toLowerCase().includes(query)) ||
      (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(query)));

    const matchesDept =
      selectedDept === 'All' ||
      (p.department && p.department.toLowerCase() === selectedDept.toLowerCase()) ||
      (p.profiles?.department && p.profiles.department.toLowerCase() === selectedDept.toLowerCase());

    return matchesSearch && matchesDept;
  });

  // Calculate quick stats
  const totalProjects = projects.length;
  const uniqueDepartments = new Set(
    projects.map((p) => p.department || p.profiles?.department).filter(Boolean)
  ).size;
  const studentLedCount = projects.filter((p) => p.profiles?.role !== 'mentor').length;

  return (
    <AdminLayout activeTab="projects">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="label-academic terracotta">Collegiate Repository</span>
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: '2rem',
                color: 'var(--color-primary-dark)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Institutional Projects Registry
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                marginTop: '0.35rem',
                maxWidth: '650px',
              }}
            >
              Comprehensive oversight of student capstones, faculty research initiatives, and interdisciplinary venture projects across all institutional departments.
            </p>
          </div>

          <button
            onClick={fetchProjects}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>Refresh Registry</span>
          </button>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--surface-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-terracotta-subtle)',
                color: 'var(--color-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FolderGit2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Submissions
              </div>
              <div className="font-serif" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {totalProjects}
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--surface-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warm-gold-subtle)',
                color: '#8C6A30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Departments
              </div>
              <div className="font-serif" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {uniqueDepartments}
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--surface-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-terracotta-subtle)',
                color: 'var(--color-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Student-Led Works
              </div>
              <div className="font-serif" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {studentLedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-primary)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 300px',
              minWidth: '240px',
            }}
          >
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search projects by title, description, tags, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: '2.5rem',
                fontSize: '0.875rem',
                width: '100%',
              }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Department:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.85rem',
                minWidth: '180px',
              }}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--color-terracotta-subtle)',
              border: '1px solid var(--color-terracotta)',
              color: 'var(--color-terracotta)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        {/* Content Table */}
        {loading ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
            <p style={{ fontSize: '0.95rem' }}>Loading institutional project registry...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <FolderGit2 size={42} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
              No Projects Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
              {searchQuery || selectedDept !== 'All'
                ? 'No project records matched your current query or department filter.'
                : 'No projects have been published to the institutional repository yet.'}
            </p>
            {(searchQuery || selectedDept !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDept('All');
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div
            className="card"
            style={{
              backgroundColor: 'var(--surface-primary)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0,0,0,0.015)',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Project Title & Abstract
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Lead Author
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Department
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Submitted
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => {
                    const authorName = p.profiles?.full_name || 'Academic Scholar';
                    const authorDept = p.profiles?.department || p.department || 'General Academic';
                    const authorRole = p.profiles?.role || 'student';
                    const authorCourse = p.profiles?.course;
                    const dateStr = p.created_at
                      ? new Date(p.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title & Description */}
                        <td style={{ padding: '1.15rem 1.25rem', maxWidth: '380px' }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              color: 'var(--color-primary-dark)',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {p.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.825rem',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {p.description || 'No abstract provided.'}
                          </div>
                          {Array.isArray(p.tags) && p.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                              {p.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.675rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--surface-secondary)',
                                    color: 'var(--text-muted)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                  }}
                                >
                                  <Tag size={10} />
                                  {tag}
                                </span>
                              ))}
                              {p.tags.length > 3 && (
                                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                                  +{p.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Author */}
                        <td style={{ padding: '1.15rem 1rem' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {authorName}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span
                              className={`badge-dept ${authorRole === 'mentor' ? 'gold' : 'terracotta'}`}
                              style={{ fontSize: '0.65rem', padding: '0.08rem 0.35rem' }}
                            >
                              {authorRole === 'mentor' ? 'Faculty Lead' : authorCourse ? `${authorCourse} Student` : 'Student'}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '1.15rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.825rem',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                            {authorDept}
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td style={{ padding: '1.15rem 1rem', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '0.825rem',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Calendar size={13} />
                            {dateStr}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1.15rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              onClick={() => setSelectedProject(p)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            >
                              Inspect Details
                            </button>
                            <Link
                              to="/projects"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              title="View in public showcase"
                            >
                              <span>Public View</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: 'rgba(0,0,0,0.01)',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Showing {filteredProjects.length} of {projects.length} recorded submissions</span>
              <span>All student submissions audited for academic integrity</span>
            </div>
          </div>
        )}

        {/* Project Inspector Modal */}
        {selectedProject && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setSelectedProject(null)}
          >
            <div
              className="card"
              style={{
                maxWidth: '620px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                backgroundColor: 'var(--surface-primary)',
                padding: '2rem',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span className="label-academic terracotta">Project Inspection</span>
                  <h2 className="font-serif" style={{ fontSize: '1.45rem', color: 'var(--color-primary-dark)', margin: '0.25rem 0 0 0' }}>
                    {selectedProject.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.35rem 0.65rem' }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Lead Author
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginTop: '0.15rem' }}>
                    {selectedProject.profiles?.full_name || 'Academic Scholar'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedProject.profiles?.role === 'mentor' ? 'Faculty Lead' : selectedProject.profiles?.course ? `${selectedProject.profiles.course} Student` : 'Student Scholar'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Department
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginTop: '0.15rem' }}>
                    {selectedProject.department || selectedProject.profiles?.department || 'General Academic'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Submission ID
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {selectedProject.id}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                  Project Abstract
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                  {selectedProject.description || 'No detailed abstract recorded for this submission.'}
                </p>
              </div>

              {Array.isArray(selectedProject.tags) && selectedProject.tags.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                    Keywords & Disciplines
                  </h4>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {selectedProject.tags.map((t, idx) => (
                      <span key={idx} className="badge-dept" style={{ fontSize: '0.75rem' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button onClick={() => setSelectedProject(null)} className="btn btn-secondary btn-sm">
                  Dismiss
                </button>
                <Link to="/projects" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Open in Public Showcase</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

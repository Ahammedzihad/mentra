import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import {
  FolderGit2,
  GraduationCap,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Building2,
  Calendar,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';

const PROJECT_VIEWS = [
  { id: 'all', label: 'All Projects', icon: FolderGit2 },
  { id: 'student', label: 'Student Projects', icon: GraduationCap },
  { id: 'mentor', label: 'Mentor Projects', icon: Users },
];

const getInitials = (name) => {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AdminProjectsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const initialView = searchParams.get('view') || 'all';
  const [viewFilter, setViewFilter] = useState(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modal State for View Project / Details Action
  const [inspectedProject, setInspectedProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query projects with foreign-key joined profiles:user_id
      // Strictly excluding email to protect student and faculty PII
      const { data, error: fetchErr } = await supabase
        .from('projects')
        .select('id, user_id, title, description, created_at, profiles:user_id(id, full_name, role, department, course, year, batch, is_verified)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching institutional projects:', err);
      setError(err.message || 'Unable to load projects from collegiate repository.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sync view filter with URL query params
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['all', 'student', 'mentor'].includes(viewParam.toLowerCase())) {
      setViewFilter(viewParam.toLowerCase());
    } else {
      setViewFilter('all');
    }
  }, [searchParams]);

  const handleViewChange = (newView) => {
    setViewFilter(newView);
    if (newView === 'all') {
      searchParams.delete('view');
    } else {
      searchParams.set('view', newView);
    }
    setSearchParams(searchParams);
  };

  // Departments for dropdown
  const departments = useMemo(() => {
    const depts = projects
      .map((p) => p.profiles?.department)
      .filter((d) => Boolean(d && d.trim()));
    return ['All', ...new Set(depts)].sort();
  }, [projects]);

  // Counts for each view
  const studentProjectsCount = useMemo(
    () => projects.filter((p) => p.profiles?.role === 'student').length,
    [projects]
  );
  const mentorProjectsCount = useMemo(
    () => projects.filter((p) => p.profiles?.role === 'mentor').length,
    [projects]
  );

  // Combined filtering: View + Search + Department
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const role = p.profiles?.role || 'student';
      const authorName = (p.profiles?.full_name || '').toLowerCase();
      const authorDept = (p.profiles?.department || '').toLowerCase();
      const authorCourse = (p.profiles?.course || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      // 1. Separate Project Views Filter
      let matchesView = true;
      if (viewFilter === 'student') {
        matchesView = role === 'student';
      } else if (viewFilter === 'mentor') {
        matchesView = role === 'mentor';
      }

      // 2. Search Query Filter
      const matchesSearch =
        !query ||
        title.includes(query) ||
        desc.includes(query) ||
        authorName.includes(query) ||
        authorDept.includes(query) ||
        authorCourse.includes(query);

      // 3. Department Filter
      const matchesDept =
        selectedDept === 'All' ||
        (p.profiles?.department && p.profiles.department.toLowerCase() === selectedDept.toLowerCase());

      return matchesView && matchesSearch && matchesDept;
    });
  }, [projects, viewFilter, searchQuery, selectedDept]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setViewFilter('all');
    searchParams.delete('view');
    setSearchParams(searchParams);
  };

  const hasActiveFilters = searchQuery || selectedDept !== 'All' || viewFilter !== 'all';

  return (
    <AdminLayout activeTab="projects">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="label-academic terracotta">Collegiate Repository</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                &bull; {projects.length} Total Registered Submissions
              </span>
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
              Administrative oversight of all student and faculty research, capstone, and venture projects across academic departments.
            </p>
          </div>

          <button
            onClick={fetchProjects}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>Refresh Projects</span>
          </button>
        </div>

        {/* Separate Project Views Tabs Bar */}
        <div
          style={{
            marginBottom: '1.5rem',
            backgroundColor: 'var(--surface-primary)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Project Submission Category</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-terracotta)', textTransform: 'none', fontWeight: 500 }}>
              {viewFilter === 'all'
                ? 'Showing All Projects (Student & Mentor)'
                : viewFilter === 'student'
                ? 'Showing Only Student Submissions'
                : 'Showing Only Faculty Mentor Submissions'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
            }}
          >
            {PROJECT_VIEWS.map((v) => {
              const isSelected = viewFilter === v.id;
              const Icon = v.icon;
              const count =
                v.id === 'all'
                  ? projects.length
                  : v.id === 'student'
                  ? studentProjectsCount
                  : mentorProjectsCount;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleViewChange(v.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: isSelected
                      ? '1.5px solid var(--color-terracotta)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected
                      ? 'var(--color-primary-dark)'
                      : 'var(--color-warm-ivory)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-primary-dark)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory)';
                  }}
                >
                  <Icon size={16} />
                  <span>{v.label}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.5rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'var(--color-terracotta)' : 'var(--surface-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Bar: Search and Department */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-primary)',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div>
            <label
              htmlFor="project-search-input"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Search Projects
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="project-search-input"
                type="text"
                placeholder="Title, abstract, author name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '2.35rem',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label
              htmlFor="project-dept-select"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Author Department
            </label>
            <select
              id="project-dept-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field"
              style={{
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
              }}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Active Filters:
            </span>
            {viewFilter !== 'all' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-terracotta-subtle)',
                  color: 'var(--color-terracotta)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: 600,
                }}
              >
                View: {viewFilter === 'student' ? 'Student Projects' : 'Mentor Projects'}
                <button
                  type="button"
                  onClick={() => handleViewChange('all')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedDept !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Dept: {selectedDept}
                <button
                  type="button"
                  onClick={() => setSelectedDept('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Query: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-terracotta)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.15rem 0.35rem',
              }}
            >
              Clear All
            </button>
          </div>
        )}

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

        {/* Results Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredProjects.length}</strong> of {projects.length} recorded submissions
            {viewFilter !== 'all' && (
              <span> ({viewFilter === 'student' ? 'Student Submissions Only' : 'Mentor Submissions Only'})</span>
            )}
          </div>
        </div>

        {/* Projects Listing */}
        {loading ? (
          <div
            className="card"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading institutional project registry...</p>
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
            <FolderGit2 size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              {viewFilter === 'student'
                ? 'No Student Projects Found'
                : viewFilter === 'mentor'
                ? 'No Mentor Projects Found'
                : 'No Projects Found in Registry'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
              {viewFilter === 'student'
                ? 'No student-led project submissions currently match your active filters or department selection.'
                : viewFilter === 'mentor'
                ? 'No faculty mentor project initiatives currently match your active filters or department selection.'
                : 'No projects match your current search query or department filter.'}
            </p>
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm">
              Show All Projects
            </button>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0,0,0,0.015)',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Project Title & Abstract
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Submitter Scholar
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Role & Program
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Department
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status & Date
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project, idx) => {
                    const submitter = project.profiles;
                    const submitterName = submitter?.full_name || 'Academic Scholar';
                    const role = submitter?.role === 'mentor' ? 'Mentor' : 'Student';
                    const course = submitter?.course || 'B.Tech';
                    const dept = submitter?.department || 'General Academic';
                    const initials = getInitials(submitterName);
                    const dateStr = project.created_at
                      ? new Date(project.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={project.id}
                        style={{
                          borderBottom: idx < filteredProjects.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title & Abstract */}
                        <td style={{ padding: '1.15rem 1.25rem', maxWidth: '340px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-primary-dark)', marginBottom: '0.25rem' }}>
                            {project.title}
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
                            {project.description || 'No abstract provided.'}
                          </div>
                        </td>

                        {/* Submitter Profile Photo & Full Name */}
                        <td style={{ padding: '1.15rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                backgroundColor: role === 'Mentor' ? '#8C6A30' : 'var(--color-primary-dark)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>
                                {submitterName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                ID: {project.user_id ? project.user_id.slice(0, 8) : 'unknown'}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Course if Student */}
                        <td style={{ padding: '1.15rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span
                              className={`badge-dept ${role === 'Mentor' ? 'gold' : 'terracotta'}`}
                              style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', fontWeight: 600 }}
                            >
                              {role === 'Mentor' ? 'Faculty Mentor' : 'Student Scholar'}
                            </span>
                            {role === 'Student' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Program: <strong>{course}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '1.15rem 1rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>{dept}</span>
                          </div>
                        </td>

                        {/* Status & Submission Date */}
                        <td style={{ padding: '1.15rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: '#E8F5E9',
                                color: '#2E7D32',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Published</span>
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              <span>{dateStr}</span>
                            </span>
                          </div>
                        </td>

                        {/* Actions: View Project / Details */}
                        <td style={{ padding: '1.15rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setInspectedProject(project)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <FileText size={13} />
                              <span>View Details</span>
                            </button>
                            <Link
                              to="/projects"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              title="Open public showcase"
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
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                Displaying <strong>{filteredProjects.length}</strong> {viewFilter === 'all' ? 'total' : viewFilter === 'student' ? 'student' : 'mentor'} project submissions
              </span>
              <span>All student and mentor project submissions audited under academic integrity standards</span>
            </div>
          </div>
        )}

        {/* View Project / Details Modal */}
        {inspectedProject && (
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
            onClick={() => setInspectedProject(null)}
          >
            <div
              className="card"
              style={{
                maxWidth: '640px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                backgroundColor: 'var(--surface-primary)',
                padding: '2rem',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span className="label-academic terracotta">Project Submission Details</span>
                  <h2 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary-dark)', margin: '0.25rem 0 0 0' }}>
                    {inspectedProject.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedProject(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0.25rem',
                    display: 'flex',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Submitter Metadata Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--color-warm-ivory)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor:
                      inspectedProject.profiles?.role === 'mentor' ? '#8C6A30' : 'var(--color-primary-dark)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(inspectedProject.profiles?.full_name)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                      {inspectedProject.profiles?.full_name || 'Academic Scholar'}
                    </span>
                    <span
                      className={`badge-dept ${inspectedProject.profiles?.role === 'mentor' ? 'gold' : 'terracotta'}`}
                      style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                    >
                      {inspectedProject.profiles?.role === 'mentor' ? 'Faculty Mentor' : 'Student Scholar'}
                    </span>
                    {inspectedProject.profiles?.role === 'student' && inspectedProject.profiles?.course && (
                      <span className="badge-dept terracotta" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                        {inspectedProject.profiles.course}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span>Department of {inspectedProject.profiles?.department || 'Academic Studies'}</span>
                    {inspectedProject.profiles?.year && (
                      <span>&bull; {inspectedProject.profiles.year}</span>
                    )}
                    {inspectedProject.profiles?.batch && (
                      <span>&bull; Cohort {inspectedProject.profiles.batch}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Meta Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Submission Date
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginTop: '0.2rem' }}>
                    {inspectedProject.created_at
                      ? new Date(inspectedProject.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Publication Status
                  </div>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#E8F5E9',
                        color: '#2E7D32',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>Active / Published</span>
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Registry ID
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {inspectedProject.id}
                  </div>
                </div>
              </div>

              {/* Description Abstract */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                  Project Abstract & Scope
                </h4>
                <div
                  style={{
                    fontSize: '0.925rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.65',
                    whiteSpace: 'pre-line',
                    backgroundColor: '#FFFFFF',
                    padding: '1.15rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {inspectedProject.description || 'No abstract text provided for this submission.'}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setInspectedProject(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close Details
                </button>
                <Link
                  to="/projects"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>Open Public Showcase</span>
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

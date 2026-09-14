import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  FolderPlus,
  Search,
  FolderGit2,
  Calendar,
  ArrowRight,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENTS = ['All', 'B.Tech', 'B.Des', 'BBA', 'BCA'];

export const ProjectsPage = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query projects with foreign-key joined profiles:user_id including is_verified status (excluding email to protect student PII)
      const { data, error: fetchErr } = await supabase
        .from('projects')
        .select('*, profiles:user_id(full_name, department, role, is_verified)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Unable to retrieve projects from the collegiate registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Project mutation callbacks
  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects((prev) =>
      prev.map((item) => (item.id === updatedProject.id ? updatedProject : item))
    );
  };

  const handleProjectDeleted = (deletedId) => {
    setProjects((prev) => prev.filter((item) => item.id !== deletedId));
  };

  // Filter projects by search query & department
  const filteredProjects = projects.filter((proj) => {
    const q = searchQuery.toLowerCase().trim();
    const creatorName = proj.profiles?.full_name?.toLowerCase() || '';
    const creatorDept = proj.profiles?.department || '';

    const matchesSearch =
      !q ||
      (proj.title && proj.title.toLowerCase().includes(q)) ||
      (proj.description && proj.description.toLowerCase().includes(q)) ||
      creatorName.includes(q);

    const matchesDept =
      selectedDept === 'All' ||
      creatorDept === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container">
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <span className="label-academic terracotta">Collegiate Registry</span>
              <span className="badge-dept">Mentra Academic Initiatives</span>
            </div>
            <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>
              Academic Projects
            </h1>
            <p style={{ maxWidth: '640px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Explore hypotheses, engineering prototypes, and design systems authored by students across collegiate cohorts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={fetchProjects}
              className="btn btn-secondary btn-sm"
              title="Refresh project catalog"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            {user ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <FolderPlus size={16} />
                <span>Inaugurate Project</span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-secondary">
                <span>Sign in to Inaugurate</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Filter Controls: Search & Department Tabs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
            <Search
              size={16}
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
              className="form-input"
              placeholder="Search by title, description, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          {/* Department Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: selectedDept === dept ? 'var(--color-primary-dark)' : 'var(--border-subtle)',
                  backgroundColor: selectedDept === dept ? 'var(--color-primary-dark)' : 'var(--color-white)',
                  color: selectedDept === dept ? 'var(--color-warm-ivory)' : 'var(--text-secondary)',
                  fontWeight: selectedDept === dept ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                }}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Results count & status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
          }}
        >
          <span>
            Displaying <strong>{filteredProjects.length}</strong> {filteredProjects.length === 1 ? 'project' : 'projects'}
            {selectedDept !== 'All' && <span> in <strong>{selectedDept}</strong></span>}
          </span>

          {user && profile?.role === 'mentor' && profile?.is_verified === true && (
            <span style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
              Mentor mode: Browse, review, and advise on student initiatives.
            </span>
          )}
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div
            className="card-academic"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--color-primary-dark)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
              Retrieving projects from the collegiate registry...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div
            className="card-academic"
            style={{
              textAlign: 'center',
              padding: '4.5rem 2rem',
              backgroundColor: 'var(--color-warm-ivory-light)',
            }}
          >
            <FolderGit2 size={40} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1.25rem auto' }} />
            <h2 className="font-serif" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              {searchQuery || selectedDept !== 'All'
                ? 'No matching projects found'
                : 'The Project Registry is currently empty'}
            </h2>
            <p
              style={{
                fontSize: '0.925rem',
                maxWidth: '480px',
                margin: '0 auto 1.75rem auto',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}
            >
              {searchQuery || selectedDept !== 'All'
                ? 'No collegiate initiatives matched your filter criteria. Try broadening your terms or reset the filters.'
                : 'Be the first to inaugurate a collective endeavor. Publish your project hypothesis, methodology, and invite scholarly inquiry.'}
            </p>

            {user ? (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <FolderPlus size={16} />
                <span>Inaugurate First Project</span>
              </button>
            ) : (
              <Link to="/signup" className="btn btn-primary">
                Join Mentra to Create Project
              </Link>
            )}
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid-2" style={{ gap: '1.75rem' }}>
            {filteredProjects.map((project) => {
              const isOwner = user?.id && user.id === project.user_id;
              const creatorName =
                project.profiles?.full_name ||
                (isOwner ? profile?.full_name || 'You' : 'Collegiate Scholar');
              const creatorDept = project.profiles?.department || (isOwner ? profile?.department : null);
              const isCreatorVerifiedMentor =
                Boolean(
                  (project.profiles?.role === 'mentor' && project.profiles?.is_verified === true) ||
                  (isOwner && profile?.role === 'mentor' && profile?.is_verified === true)
                );
              const createdDate = project.created_at
                ? new Date(project.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Archived';

              return (
                <article
                  key={project.id}
                  className="card-academic"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  <div>
                    {/* Top Row: Department / Category & Date */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {creatorDept ? (
                          <span className="badge-dept terracotta">{creatorDept}</span>
                        ) : (
                          <span className="badge-dept">Academic Project</span>
                        )}
                        {isCreatorVerifiedMentor && (
                          <span className="badge-dept gold">
                            Verified Faculty
                          </span>
                        )}
                        {isOwner && (
                          <span className="badge-dept gold" style={{ fontSize: '0.65rem' }}>
                            Your Project
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Calendar size={13} />
                        <span>{createdDate}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2
                      className="font-serif"
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        marginBottom: '0.75rem',
                        color: 'var(--color-primary-dark)',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {project.title}
                    </h2>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.65',
                        color: 'var(--text-secondary)',
                        marginBottom: '1.5rem',
                        whiteSpace: 'pre-line',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {project.description}
                    </p>
                  </div>

                  {/* Card Bottom: Creator & Actions */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.825rem',
                    }}
                  >
                    {/* Creator Display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-dark-surface)',
                          color: 'var(--color-warm-ivory)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {creatorName[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                          {creatorName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Creator {creatorDept ? `• ${creatorDept}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Owner Action Buttons (Strictly only for the owner) */}
                    {isOwner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => setEditingProject(project)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.65rem' }}
                          title="Revise Project Details"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingProject(project)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.65rem', color: '#9E382A' }}
                          title="Withdraw Project"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {isCreatorVerifiedMentor ? 'Guided by Verified Faculty' : 'Collegiate Initiative'}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onProjectUpdated={handleProjectUpdated}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingProject)}
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onProjectDeleted={handleProjectDeleted}
      />
    </div>
  );
};

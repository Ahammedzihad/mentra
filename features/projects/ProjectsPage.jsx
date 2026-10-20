import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectPhotoGallery } from './ProjectPhotoGallery';
import { StartProjectComposer } from './StartProjectComposer';
import { ProjectPostCard } from './ProjectPostCard';
import { VISIBILITY_OPTIONS } from './projectVisibilityOptions';
import {
  FolderPlus,
  Eye,
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

class ProjectsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Projects feed error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-academic notice-box error" style={{ margin: '2rem auto', maxWidth: '720px', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={20} style={{ color: 'var(--color-terracotta, #B86F52)' }} />
            <h3 className="font-serif" style={{ margin: 0, fontSize: '1.25rem' }}>Collegiate Registry Feed</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #5A534C)', marginBottom: '1rem' }}>
            An unexpected error occurred while rendering the project feed. Please retry to reload your view.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry Feed
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ProjectsPage = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState('manual');

  const handleStartProject = (mode = 'manual') => {
    setCreateModalMode(mode);
    setIsCreateModalOpen(true);
  };
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [likedProjectIds, setLikedProjectIds] = useState(new Set());

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mentra Phase 7 Step 11:
      // Query projects with foreign-key joined profiles:user_id, comments count, and project_likes count.
      // comments(count) and project_likes(count) prevent N+1 queries by aggregating in a single call.
      let fetchedProjects = null;
      let likesSupported = true;

      const { data: primaryData, error: primaryErr } = await supabase
        .from('projects')
        .select('*, profiles:user_id(full_name, department, role, is_verified), comments(count), project_likes(count)')
        .order('created_at', { ascending: false });

      if (primaryErr) {
        // Fallback: If project_likes table is not yet migrated in PostgREST schema cache
        if (primaryErr.code === 'PGRST200' || primaryErr.code === 'PGRST205' || primaryErr.code === '42P01') {
          likesSupported = false;
          console.warn('project_likes table not found in schema cache. Reverting to comments-only count query.');
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('projects')
            .select('*, profiles:user_id(full_name, department, role, is_verified), comments(count)')
            .order('created_at', { ascending: false });

          if (fallbackErr) throw fallbackErr;
          fetchedProjects = fallbackData || [];
        } else {
          throw primaryErr;
        }
      } else {
        fetchedProjects = primaryData || [];
      }

      setProjects(fetchedProjects);

      // Single batched query to load current user's liked project IDs across all visible cards
      const projectIds = fetchedProjects.map((p) => p.id).filter(Boolean);
      if (user?.id && projectIds.length > 0 && likesSupported) {
        const { data: userLikes, error: likesErr } = await supabase
          .from('project_likes')
          .select('project_id')
          .eq('user_id', user.id)
          .in('project_id', projectIds);

        if (likesErr) {
          console.warn('Failed to batch load user project likes:', likesErr);
        } else {
          setLikedProjectIds(new Set((userLikes || []).map((l) => l.project_id)));
        }
      } else {
        setLikedProjectIds(new Set());
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Unable to retrieve projects from the collegiate registry.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleLikeToggle = useCallback((projectId, isLiked, newCount) => {
    setLikedProjectIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          likes_count: newCount,
          project_likes: [{ count: newCount }],
        };
      })
    );
  }, []);

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
    <ProjectsErrorBoundary>
      <div style={{ padding: '2rem 0 5rem 0' }}>
      <div className="container">
                <style>{`
          .mentra-composer-refresh-row .mentra-start-project-composer {
            margin-bottom: 0 !important;
          }
          @media (max-width: 640px) {
            .mentra-composer-refresh-row {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 0.75rem !important;
            }
            .mentra-composer-refresh-btn-wrapper {
              display: flex !important;
              justifyContent: flex-end !important;
              width: 100% !important;
            }
          }
        `}</style>

        {/* Start a Project Composer & Refresh Row */}
        <div
          className="mentra-composer-refresh-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            maxWidth: '720px',
            margin: '0 auto 1.5rem auto',
            width: '100%',
          }}
        >
          <div style={{ flex: '1', minWidth: '0' }}>
            <StartProjectComposer
              user={user}
              profile={profile}
              onStartProject={handleStartProject}
            />
          </div>

          <div className="mentra-composer-refresh-btn-wrapper" style={{ flexShrink: 0 }}>
            <button
              onClick={fetchProjects}
              className="btn btn-secondary btn-sm"
              title="Refresh project catalog"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
            >
              <RefreshCw size={14} style={loading ? { animation: 'spin 0.8s linear infinite' } : undefined} />
              <span>Refresh</span>
            </button>
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
                onClick={() => handleStartProject('manual')}
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
          /* Projects Feed Stream */
          <div
            className="projects-feed-stream"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxWidth: '720px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {filteredProjects.map((project) => (
              <ProjectPostCard
                key={project.id}
                project={project}
                currentUserId={user?.id}
                isLiked={likedProjectIds.has(project.id)}
                onLikeToggle={handleLikeToggle}
                onOpenDetails={(proj) => setViewingProject(proj)}
                onEdit={(proj) => setEditingProject(proj)}
                onDelete={(proj) => setDeletingProject(proj)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectDetailModal
        isOpen={Boolean(viewingProject)}
        project={viewingProject}
        onClose={() => setViewingProject(null)}
        onProjectUpdated={(updated) => {
          handleProjectUpdated(updated);
          setViewingProject(updated);
        }}
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        initialMode={createModalMode}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalMode('manual');
        }}
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
    </ProjectsErrorBoundary>
  );
};

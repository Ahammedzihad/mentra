import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../frontend/context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit3,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Compass,
  FolderPlus,
  RotateCcw,
  Info
} from 'lucide-react';

export const ResumeBuilderPage = () => {
  const { user, profile } = useAuth();

  // In-memory draft state initialized from student's own Journey and Projects
  const [draft, setDraft] = useState({
    summary: '',
    projects: [],
    journey: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active inline edit states for individual entries
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingJourneyId, setEditingJourneyId] = useState(null);

  /**
   * Securely loads authenticated user's own projects and journey entries.
   * RLS and user_id filtering guarantee isolation from other users' records.
   */
  const loadSourceRecords = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Concurrently query authenticated student's own projects and journey milestones
      // Selecting strictly confirmed existing schema columns
      const [projRes, journeyRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, user_id, title, description, created_at, visibility, tags')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('journey')
          .select('id, user_id, title, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (projRes.error) throw projRes.error;
      if (journeyRes.error) throw journeyRes.error;

      const rawProjects = projRes.data || [];
      const rawJourney = journeyRes.data || [];

      // Initialize in-memory resume draft structure
      setDraft({
        summary:
          profile?.bio ||
          (profile?.department
            ? `Collegiate scholar in ${profile.department} focused on academic excellence, hands-on project work, and interdisciplinary collaboration.`
            : 'Collegiate scholar focused on academic excellence, hands-on project work, and interdisciplinary collaboration.'),
        projects: rawProjects.map((p) => ({
          id: p.id,
          sourceId: p.id,
          sourceType: 'project',
          title: p.title || 'Untitled Project',
          description: p.description || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          created_at: p.created_at,
          date: p.created_at
            ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
            : '',
          included: true,
          originalTitle: p.title || 'Untitled Project',
          originalDescription: p.description || ''
        })),
        journey: rawJourney.map((j) => ({
          id: j.id,
          sourceId: j.id,
          sourceType: 'journey',
          title: j.title || 'Milestone',
          description: j.description || '',
          created_at: j.created_at,
          date: j.created_at
            ? new Date(j.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
            : '',
          included: true,
          originalTitle: j.title || 'Milestone',
          originalDescription: j.description || ''
        }))
      });
    } catch (err) {
      console.error('Error auto-populating resume draft:', err);
      setError(err.message || 'Unable to load your collegiate projects and milestones.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadSourceRecords();
  }, [loadSourceRecords]);

  // --- In-Memory State Mutators (Zero writes to projects or journey tables) ---

  const handleSummaryChange = (e) => {
    const val = e.target.value;
    setDraft((prev) => ({ ...prev, summary: val }));
  };

  // Projects: Inclusion toggle
  const toggleProjectInclusion = (id) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, included: !p.included } : p
      )
    }));
  };

  // Projects: Reorder
  const moveProject = (index, direction) => {
    setDraft((prev) => {
      const list = [...prev.projects];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, projects: list };
    });
  };

  // Projects: Inline text editing
  const updateProjectField = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    }));
  };

  // Projects: Reset to original text
  const resetProjectText = (id) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id
          ? { ...p, title: p.originalTitle, description: p.originalDescription }
          : p
      )
    }));
  };

  // Journey: Inclusion toggle
  const toggleJourneyInclusion = (id) => {
    setDraft((prev) => ({
      ...prev,
      journey: prev.journey.map((j) =>
        j.id === id ? { ...j, included: !j.included } : j
      )
    }));
  };

  // Journey: Reorder
  const moveJourney = (index, direction) => {
    setDraft((prev) => {
      const list = [...prev.journey];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, journey: list };
    });
  };

  // Journey: Inline text editing
  const updateJourneyField = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      journey: prev.journey.map((j) =>
        j.id === id ? { ...j, [field]: value } : j
      )
    }));
  };

  // Journey: Reset to original text
  const resetJourneyText = (id) => {
    setDraft((prev) => ({
      ...prev,
      journey: prev.journey.map((j) =>
        j.id === id
          ? { ...j, title: j.originalTitle, description: j.originalDescription }
          : j
      )
    }));
  };

  // Computed views for live preview
  const includedProjects = draft.projects.filter((p) => p.included);
  const includedJourney = draft.journey.filter((j) => j.included);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--color-primary-dark)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Auto-populating resume draft from your collegiate records...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 5rem 0' }}>
      <div className="container">
        {/* Header Breadcrumb & Context */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span className="badge-dept terracotta">Phase 6 Part B</span>
            <span className="badge-dept">Resume Builder</span>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--color-warm-ivory-light)',
                border: '1px solid var(--border-subtle)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}
            >
              In-Memory Editor State
            </span>
          </div>
          <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.4rem' }}>
            Collegiate Resume Builder
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.6 }}>
            Generated directly from your authentic Mentra Journey milestones and portfolio projects.
            Edits and reordering exist solely within this resume layer and do not modify your source records.
          </p>
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }} role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={loadSourceRecords}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={13} />
              <span>Retry Loading Records</span>
            </button>
          </div>
        )}

        {/* Dual-Column Layout: Left = Interactive Editor, Right = Live CV Preview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '2.25rem',
            alignItems: 'start'
          }}
        >
          {/* ============================================================== */}
          {/* LEFT COLUMN: Controls & In-Memory Draft Editor                */}
          {/* ============================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Section 1: Candidate Profile & Objective */}
            <section
              className="card-academic"
              aria-labelledby="section-profile-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-profile-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    1. Academic Identity & Summary
                  </h2>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Profile Data</span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--color-warm-ivory-light)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {profile?.full_name || 'Student Scholar'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {user?.email} &bull; {profile?.department || 'Department Undergrad'}
                  {profile?.program ? ` &bull; ${profile.program}` : ''}
                  {profile?.specialization ? ` (${profile.specialization})` : ''}
                </div>
                {(profile?.year || profile?.batch) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {profile?.year ? `Year ${profile.year}` : ''}
                    {profile?.year && profile?.batch ? ' &bull; ' : ''}
                    {profile?.batch ? `Batch ${profile.batch}` : ''}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="resume-summary-input"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  Candidate Objective & Academic Summary
                </label>
                <textarea
                  id="resume-summary-input"
                  value={draft.summary}
                  onChange={handleSummaryChange}
                  rows={3}
                  placeholder="Summarize your academic focus, interdisciplinary projects, and aspirations..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    backgroundColor: 'var(--color-white)'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Editable for this resume draft only. Does not overwrite your saved account biography.
                </span>
              </div>
            </section>

            {/* Section 2: Projects Section */}
            <section
              className="card-academic"
              aria-labelledby="section-projects-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-projects-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    2. Portfolio Projects
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-terracotta)',
                    backgroundColor: 'var(--color-terracotta-subtle)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {includedProjects.length} of {draft.projects.length} included
                </span>
              </div>

              {draft.projects.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    backgroundColor: 'var(--color-warm-ivory-light)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-strong)'
                  }}
                >
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    No portfolio projects recorded yet.
                  </p>
                  <Link to="/student" className="btn btn-secondary btn-sm">
                    <FolderPlus size={14} />
                    <span>Create a Project First</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {draft.projects.map((proj, idx) => {
                    const isEditing = editingProjectId === proj.id;
                    const hasModifications =
                      proj.title !== proj.originalTitle ||
                      proj.description !== proj.originalDescription;

                    return (
                      <article
                        key={proj.id}
                        data-testid={`project-entry-${proj.id}`}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1.15rem',
                          backgroundColor: proj.included ? 'var(--color-white)' : '#F9F8F6',
                          opacity: proj.included ? 1 : 0.65,
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {/* Entry Header: Title, Include Toggle, Reorder Controls */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            marginBottom: '0.65rem'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h3
                                style={{
                                  fontSize: '1.05rem',
                                  margin: 0,
                                  color: proj.included ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {proj.title}
                              </h3>
                              <span className="badge-dept" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                                Project
                              </span>
                              {proj.date && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {proj.date}
                                </span>
                              )}
                              {hasModifications && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--color-terracotta)',
                                    backgroundColor: 'var(--color-terracotta-subtle)',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                  title="Text edited for resume draft only"
                                >
                                  Edited
                                </span>
                              )}
                              {!proj.included && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--text-muted)',
                                    backgroundColor: '#EAE6E1',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                >
                                  Excluded
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls Row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {/* Reorder Up */}
                            <button
                              type="button"
                              onClick={() => moveProject(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move project "${proj.title}" up in resume`}
                              title="Move up"
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === 0 ? 0.35 : 1
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>

                            {/* Reorder Down */}
                            <button
                              type="button"
                              onClick={() => moveProject(idx, 'down')}
                              disabled={idx === draft.projects.length - 1}
                              aria-label={`Move project "${proj.title}" down in resume`}
                              title="Move down"
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === draft.projects.length - 1 ? 'not-allowed' : 'pointer',
                                color: idx === draft.projects.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === draft.projects.length - 1 ? 0.35 : 1
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* Edit Inline Toggle */}
                            <button
                              type="button"
                              onClick={() => setEditingProjectId(isEditing ? null : proj.id)}
                              aria-label={isEditing ? `Done editing project "${proj.title}"` : `Edit text for project "${proj.title}"`}
                              title={isEditing ? 'Done editing' : 'Edit text inline'}
                              style={{
                                background: isEditing ? 'var(--color-primary-dark)' : 'var(--color-warm-ivory)',
                                color: isEditing ? 'var(--color-white)' : 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0 0.5rem',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={12} />
                              <span>{isEditing ? 'Done' : 'Edit'}</span>
                            </button>

                            {/* Include / Exclude Toggle Switch */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={proj.included}
                              onClick={() => toggleProjectInclusion(proj.id)}
                              aria-label={`${proj.included ? 'Exclude' : 'Include'} project "${proj.title}" in resume`}
                              title={proj.included ? 'Exclude from resume' : 'Include in resume'}
                              style={{
                                backgroundColor: proj.included ? '#2E5A36' : 'var(--color-warm-ivory)',
                                color: proj.included ? 'var(--color-white)' : 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0 0.55rem',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              {proj.included ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{proj.included ? 'Included' : 'Hidden'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form OR Display View */}
                        {isEditing ? (
                          <div
                            style={{
                              backgroundColor: 'var(--color-warm-ivory-light)',
                              padding: '0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              marginTop: '0.5rem'
                            }}
                          >
                            <div style={{ marginBottom: '0.65rem' }}>
                              <label
                                htmlFor={`proj-title-${proj.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Project Title
                              </label>
                              <input
                                id={`proj-title-${proj.id}`}
                                type="text"
                                value={proj.title}
                                onChange={(e) => updateProjectField(proj.id, 'title', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              />
                            </div>

                            <div style={{ marginBottom: '0.65rem' }}>
                              <label
                                htmlFor={`proj-desc-${proj.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Project Description (Tailor or condense for CV)
                              </label>
                              <textarea
                                id={`proj-desc-${proj.id}`}
                                value={proj.description}
                                onChange={(e) => updateProjectField(proj.id, 'description', e.target.value)}
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  resize: 'vertical'
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Source project record in Supabase remains untouched.
                              </span>
                              {hasModifications && (
                                <button
                                  type="button"
                                  onClick={() => resetProjectText(proj.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  <RotateCcw size={11} />
                                  <span>Revert to Source Text</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                              {proj.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
                            </p>
                            {proj.tags && proj.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {proj.tags.map((tag) => (
                                  <span key={tag} className="badge-dept" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Journey Milestones Section */}
            <section
              className="card-academic"
              aria-labelledby="section-journey-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-journey-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    3. Journey Milestones
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-terracotta)',
                    backgroundColor: 'var(--color-terracotta-subtle)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {includedJourney.length} of {draft.journey.length} included
                </span>
              </div>

              {draft.journey.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    backgroundColor: 'var(--color-warm-ivory-light)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-strong)'
                  }}
                >
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    No journey milestones logged on your timeline yet.
                  </p>
                  <Link to="/journey" className="btn btn-secondary btn-sm">
                    <Sparkles size={14} />
                    <span>Log a Milestone First</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {draft.journey.map((item, idx) => {
                    const isEditing = editingJourneyId === item.id;
                    const hasModifications =
                      item.title !== item.originalTitle ||
                      item.description !== item.originalDescription;

                    return (
                      <article
                        key={item.id}
                        data-testid={`journey-entry-${item.id}`}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1.15rem',
                          backgroundColor: item.included ? 'var(--color-white)' : '#F9F8F6',
                          opacity: item.included ? 1 : 0.65,
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {/* Entry Header: Title, Phase badge, Reorder & Edit Controls */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            marginBottom: '0.65rem'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h3
                                style={{
                                  fontSize: '1.05rem',
                                  margin: 0,
                                  color: item.included ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {item.title}
                              </h3>
                              <span className="badge-dept terracotta" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                                Journey
                              </span>
                              {item.date && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {item.date}
                                </span>
                              )}
                              {hasModifications && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--color-terracotta)',
                                    backgroundColor: 'var(--color-terracotta-subtle)',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                  title="Text edited for resume draft only"
                                >
                                  Edited
                                </span>
                              )}
                              {!item.included && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--text-muted)',
                                    backgroundColor: '#EAE6E1',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                >
                                  Excluded
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls Row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {/* Reorder Up */}
                            <button
                              type="button"
                              onClick={() => moveJourney(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move milestone "${item.title}" up in resume`}
                              title="Move up"
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === 0 ? 0.35 : 1
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>

                            {/* Reorder Down */}
                            <button
                              type="button"
                              onClick={() => moveJourney(idx, 'down')}
                              disabled={idx === draft.journey.length - 1}
                              aria-label={`Move milestone "${item.title}" down in resume`}
                              title="Move down"
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === draft.journey.length - 1 ? 'not-allowed' : 'pointer',
                                color: idx === draft.journey.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === draft.journey.length - 1 ? 0.35 : 1
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* Edit Inline Toggle */}
                            <button
                              type="button"
                              onClick={() => setEditingJourneyId(isEditing ? null : item.id)}
                              aria-label={isEditing ? `Done editing milestone "${item.title}"` : `Edit text for milestone "${item.title}"`}
                              title={isEditing ? 'Done editing' : 'Edit text inline'}
                              style={{
                                background: isEditing ? 'var(--color-primary-dark)' : 'var(--color-warm-ivory)',
                                color: isEditing ? 'var(--color-white)' : 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0 0.5rem',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={12} />
                              <span>{isEditing ? 'Done' : 'Edit'}</span>
                            </button>

                            {/* Include / Exclude Toggle Switch */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.included}
                              onClick={() => toggleJourneyInclusion(item.id)}
                              aria-label={`${item.included ? 'Exclude' : 'Include'} milestone "${item.title}" in resume`}
                              title={item.included ? 'Exclude from resume' : 'Include in resume'}
                              style={{
                                backgroundColor: item.included ? '#2E5A36' : 'var(--color-warm-ivory)',
                                color: item.included ? 'var(--color-white)' : 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0 0.55rem',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              {item.included ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{item.included ? 'Included' : 'Hidden'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form OR Display View */}
                        {isEditing ? (
                          <div
                            style={{
                              backgroundColor: 'var(--color-warm-ivory-light)',
                              padding: '0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              marginTop: '0.5rem'
                            }}
                          >
                            <div style={{ marginBottom: '0.65rem' }}>
                              <label
                                htmlFor={`journey-title-${item.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Milestone Title
                              </label>
                              <input
                                id={`journey-title-${item.id}`}
                                type="text"
                                value={item.title}
                                onChange={(e) => updateJourneyField(item.id, 'title', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              />
                            </div>

                            <div style={{ marginBottom: '0.65rem' }}>
                              <label
                                htmlFor={`journey-desc-${item.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Milestone Description
                              </label>
                              <textarea
                                id={`journey-desc-${item.id}`}
                                value={item.description}
                                onChange={(e) => updateJourneyField(item.id, 'description', e.target.value)}
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  resize: 'vertical'
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Source timeline record in Supabase remains untouched.
                              </span>
                              {hasModifications && (
                                <button
                                  type="button"
                                  onClick={() => resetJourneyText(item.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  <RotateCcw size={11} />
                                  <span>Revert to Source Text</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                              {item.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Live Formatted Collegiate Document Preview       */}
          {/* ============================================================== */}
          <div style={{ position: 'sticky', top: '5.5rem' }}>
            {/* Preview Document Shell */}
            <div
              className="card-academic"
              style={{
                padding: '2.5rem 2rem',
                backgroundColor: 'var(--color-white)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                minHeight: '620px'
              }}
              data-testid="resume-preview-document"
              aria-label="Live Resume Preview"
            >
              {/* Document Header */}
              <header style={{ borderBottom: '2px solid var(--color-primary-dark)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: '1.85rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--color-primary-dark)',
                    letterSpacing: '-0.02em'
                  }}
                  data-testid="preview-candidate-name"
                >
                  {profile?.full_name || 'Student Scholar'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                  <span>{profile?.department || 'Department Scholar'}</span>
                  {profile?.program && <span> &bull; {profile.program}</span>}
                  {profile?.specialization && <span> &bull; Specialization: {profile.specialization}</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>{user?.email}</span>
                  {(profile?.year || profile?.batch) && (
                    <span> &bull; Year {profile?.year || '—'}, Batch {profile?.batch || '—'}</span>
                  )}
                  <span> &bull; Mentra Collegiate Member</span>
                </div>
              </header>

              {/* Summary / Objective Block */}
              {draft.summary && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-terracotta)',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '0.25rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Academic Focus & Objective
                  </h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-secondary)' }} data-testid="preview-summary">
                    {draft.summary}
                  </p>
                </div>
              )}

              {/* Projects Preview Block */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-terracotta)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.25rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>Featured Portfolio Projects</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {includedProjects.length} included
                  </span>
                </h3>

                {includedProjects.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No projects selected for this draft. Toggle entries on the left to include them.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} data-testid="preview-projects-list">
                    {includedProjects.map((proj) => (
                      <div key={proj.id} data-testid={`preview-project-${proj.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            {proj.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {proj.tags && proj.tags.length > 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {proj.tags.map((t) => `#${t}`).join(' ')}
                              </span>
                            )}
                            {proj.date && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {proj.date}
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '0.2rem', marginBottom: 0 }}>
                          {proj.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Journey Milestones Preview Block */}
              <div>
                <h3
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-terracotta)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.25rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>Collegiate Journey & Milestones</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {includedJourney.length} included
                  </span>
                </h3>

                {includedJourney.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No milestones selected for this draft. Toggle entries on the left to include them.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} data-testid="preview-journey-list">
                    {includedJourney.map((j) => (
                      <div key={j.id} data-testid={`preview-journey-${j.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            {j.title}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {j.date ? `Journey \u2022 ${j.date}` : 'Journey'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '0.2rem', marginBottom: 0 }}>
                          {j.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 7 & 8 Boundary Notice */}
            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--color-warm-ivory)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Info size={14} style={{ color: 'var(--color-terracotta)', flexShrink: 0 }} />
                <span>Step 6 in-memory editor active. Draft persistence (Step 7) and PDF export (Step 8) are upcoming steps.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

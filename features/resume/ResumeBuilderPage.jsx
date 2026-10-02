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
  CheckCircle2,
  Info,
  Download,
  Award,
  Trophy
} from 'lucide-react';
import { generateResumePdf, formatAcademicDetails } from './generateResumePdf';

/**
 * Safely parses and normalizes saved draft content from public.resume_drafts.content.
 * Ensures malformed, partial, or missing fields never crash the UI or corrupt state.
 */
function safeHydrateDraft(content, profile) {
  if (!content || typeof content !== 'object') {
    return {
      summary: profile?.bio || '',
      skills: Array.isArray(profile?.skills)
        ? profile.skills.map((s, idx) => {
            const name = typeof s === 'string' ? s : (s?.name || s?.title || `Skill ${idx + 1}`);
            return {
              id: `skill-${idx}`,
              sourceId: `profile-skill-${idx}`,
              sourceType: 'skill',
              name,
              title: name,
              included: true,
              originalName: name,
              originalTitle: name
            };
          })
        : [],
      achievements: Array.isArray(profile?.achievements)
        ? profile.achievements.map((a, idx) => {
            const title = typeof a === 'string' ? a : (a?.title || a?.name || `Achievement ${idx + 1}`);
            return {
              id: `ach-${idx}`,
              sourceId: `profile-ach-${idx}`,
              sourceType: 'achievement',
              title,
              name: title,
              description: '',
              date: '',
              included: true,
              originalTitle: title,
              originalName: title,
              originalDescription: ''
            };
          })
        : [],
      projects: [],
      journey: []
    };
  }

  const rawSummary =
    typeof content.summary === 'string'
      ? content.summary
      : (profile?.bio ||
        (profile?.department
          ? `Collegiate scholar in ${profile.department} focused on academic excellence, hands-on project work, and interdisciplinary collaboration.`
          : 'Collegiate scholar focused on academic excellence, hands-on project work, and interdisciplinary collaboration.'));

  // Skills hydration:
  // If content.skills is an array (even empty []), preserve saved choices!
  // If content.skills is undefined (older draft saved before this feature), fall back to profile?.skills.
  const rawSkills = Array.isArray(content.skills)
    ? content.skills
    : (Array.isArray(profile?.skills) ? profile.skills : []);
  const skills = rawSkills.map((s, idx) => {
    const name = typeof s === 'string' ? s : (s?.name || s?.title || `Skill ${idx + 1}`);
    const originalName = typeof s === 'string' ? s : (s?.originalName || s?.originalTitle || name);
    return {
      id: s?.id || `skill-hydrated-${idx}`,
      sourceId: s?.sourceId || `profile-skill-${idx}`,
      sourceType: 'skill',
      name,
      title: name,
      included: typeof s?.included === 'boolean' ? s.included : true,
      originalName,
      originalTitle: originalName
    };
  });

  // Achievements hydration:
  // If content.achievements is an array (even empty []), preserve saved choices!
  // If content.achievements is undefined (older draft saved before this feature), fall back to profile?.achievements.
  const rawAchievements = Array.isArray(content.achievements)
    ? content.achievements
    : (Array.isArray(profile?.achievements) ? profile.achievements : []);
  const achievements = rawAchievements.map((a, idx) => {
    const title = typeof a === 'string' ? a : (a?.title || a?.name || `Achievement ${idx + 1}`);
    const originalTitle = typeof a === 'string' ? a : (a?.originalTitle || a?.originalName || title);
    return {
      id: a?.id || `ach-hydrated-${idx}`,
      sourceId: a?.sourceId || `profile-ach-${idx}`,
      sourceType: 'achievement',
      title,
      name: title,
      description: typeof a?.description === 'string' ? a.description : '',
      date: typeof a?.date === 'string' ? a.date : '',
      included: typeof a?.included === 'boolean' ? a.included : true,
      originalTitle,
      originalName: originalTitle,
      originalDescription: typeof a?.originalDescription === 'string' ? a.originalDescription : (a?.description || '')
    };
  });

  const rawProjects = Array.isArray(content.projects) ? content.projects : [];
  const projects = rawProjects.map((p, idx) => ({
    id: p?.id || `proj-hydrated-${idx}`,
    sourceId: p?.sourceId || p?.id || `proj-${idx}`,
    sourceType: 'project',
    title: typeof p?.title === 'string' ? p.title : 'Untitled Project',
    description: typeof p?.description === 'string' ? p.description : '',
    tags: Array.isArray(p?.tags) ? p.tags : [],
    created_at: p?.created_at || null,
    date:
      typeof p?.date === 'string' && p.date
        ? p.date
        : p?.created_at
        ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : '',
    included: typeof p?.included === 'boolean' ? p.included : true,
    originalTitle: typeof p?.originalTitle === 'string' ? p.originalTitle : (p?.title || 'Untitled Project'),
    originalDescription: typeof p?.originalDescription === 'string' ? p.originalDescription : (p?.description || '')
  }));

  const rawJourney = Array.isArray(content.journey) ? content.journey : [];
  const journey = rawJourney.map((j, idx) => ({
    id: j?.id || `journey-hydrated-${idx}`,
    sourceId: j?.sourceId || j?.id || `journey-${idx}`,
    sourceType: 'journey',
    title: typeof j?.title === 'string' ? j.title : 'Milestone',
    description: typeof j?.description === 'string' ? j.description : '',
    created_at: j?.created_at || null,
    date:
      typeof j?.date === 'string' && j.date
        ? j.date
        : j?.created_at
        ? new Date(j.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : '',
    included: typeof j?.included === 'boolean' ? j.included : true,
    originalTitle: typeof j?.originalTitle === 'string' ? j.originalTitle : (j?.title || 'Milestone'),
    originalDescription: typeof j?.originalDescription === 'string' ? j.originalDescription : (j?.description || '')
  }));

  return {
    summary: rawSummary,
    skills,
    achievements,
    projects,
    journey
  };
}

export const ResumeBuilderPage = () => {
  const { user, profile } = useAuth();

  // In-memory draft state (hydrated from saved draft OR auto-populated from Profile, Journey and Projects)
  const [draft, setDraft] = useState({
    summary: '',
    skills: [],
    achievements: [],
    projects: [],
    journey: []
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSavedDraft, setIsSavedDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // PDF download operation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Active inline edit states for individual entries
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingAchievementId, setEditingAchievementId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingJourneyId, setEditingJourneyId] = useState(null);

  /**
   * Loads user's saved draft from public.resume_drafts.
   * If a saved row exists, hydrates from saved content.
   * If no saved row exists, auto-populates from user's authentic Journey & Projects.
   * If a load error occurs, displays the error and prevents accidental save overwrites.
   */
  const loadDraftOrSourceRecords = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setSaveError(null);

    try {
      // 1. Fetch user's profile to obtain authentic Skills & Achievements and verify schema presence
      const { data: profileRow, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id, full_name, department, course, program, specialization, year, batch, bio, skills, achievements')
        .eq('id', user.id)
        .maybeSingle();

      if (profileFetchError) {
        console.error('Error fetching profile records:', profileFetchError);
        setLoadError(profileFetchError.message || 'Unable to load profile skills and achievements.');
        setLoading(false);
        return;
      }

      const activeProfile = profileRow || profile;

      // 2. Check for existing saved draft row for the authenticated user
      const { data: savedDraftRow, error: draftFetchError } = await supabase
        .from('resume_drafts')
        .select('id, user_id, content, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (draftFetchError) {
        console.error('Error fetching saved resume draft:', draftFetchError);
        // Treat load errors distinctly from "no row found"
        // Avoid silently replacing potentially saved data with a fresh draft
        setLoadError(draftFetchError.message || 'Unable to check for your saved resume draft.');
        setLoading(false);
        return;
      }

      if (savedDraftRow && savedDraftRow.content) {
        // Hydrate from existing saved draft - saved choices are preserved
        const hydrated = safeHydrateDraft(savedDraftRow.content, activeProfile);
        setDraft(hydrated);
        setIsSavedDraft(true);
        setLastSavedAt(savedDraftRow.updated_at);
        setLoading(false);
        return;
      }

      // 3. No saved draft exists -> Auto-populate from authentic Profile, Journey & Projects
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

      const rawSkills = Array.isArray(activeProfile?.skills) ? activeProfile.skills : [];
      const rawAchievements = Array.isArray(activeProfile?.achievements) ? activeProfile.achievements : [];

      setDraft({
        summary:
          activeProfile?.bio ||
          (activeProfile?.department
            ? `Collegiate scholar in ${activeProfile.department} focused on academic excellence, hands-on project work, and interdisciplinary collaboration.`
            : 'Collegiate scholar focused on academic excellence, hands-on project work, and interdisciplinary collaboration.'),
        skills: rawSkills.map((s, idx) => ({
          id: `skill-${idx}`,
          sourceId: `profile-skill-${idx}`,
          sourceType: 'skill',
          name: typeof s === 'string' ? s : (s?.name || `Skill ${idx + 1}`),
          title: typeof s === 'string' ? s : (s?.name || `Skill ${idx + 1}`),
          included: true,
          originalName: typeof s === 'string' ? s : (s?.name || `Skill ${idx + 1}`),
          originalTitle: typeof s === 'string' ? s : (s?.name || `Skill ${idx + 1}`)
        })),
        achievements: rawAchievements.map((a, idx) => ({
          id: `ach-${idx}`,
          sourceId: `profile-ach-${idx}`,
          sourceType: 'achievement',
          title: typeof a === 'string' ? a : (a?.title || `Achievement ${idx + 1}`),
          name: typeof a === 'string' ? a : (a?.title || `Achievement ${idx + 1}`),
          description: '',
          date: '',
          included: true,
          originalTitle: typeof a === 'string' ? a : (a?.title || `Achievement ${idx + 1}`),
          originalName: typeof a === 'string' ? a : (a?.title || `Achievement ${idx + 1}`),
          originalDescription: ''
        })),
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
      setIsSavedDraft(false);
      setLastSavedAt(null);
    } catch (err) {
      console.error('Error loading resume data:', err);
      setLoadError(err.message || 'Unable to load collegiate records.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadDraftOrSourceRecords();
  }, [loadDraftOrSourceRecords]);

  /**
   * Saves the current editor state to public.resume_drafts.
   * Upserts on user_id conflict target using authenticated user.id.
   * Updates updated_at timestamp.
   * Does NOT modify projects or journey tables.
   */
  const handleSaveDraft = async () => {
    if (!user || isSaving || Boolean(loadError)) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const nowIso = new Date().toISOString();

      // Structure content preserving item order, inclusion, inline edits, and summary
      const contentPayload = {
        summary: draft.summary,
        skills: draft.skills.map((s, idx) => ({
          id: s.id,
          sourceId: s.sourceId,
          sourceType: 'skill',
          name: s.name,
          title: s.title || s.name,
          included: s.included,
          order: idx,
          originalName: s.originalName,
          originalTitle: s.originalTitle || s.originalName
        })),
        achievements: draft.achievements.map((a, idx) => ({
          id: a.id,
          sourceId: a.sourceId,
          sourceType: 'achievement',
          title: a.title,
          name: a.name || a.title,
          description: a.description,
          date: a.date,
          included: a.included,
          order: idx,
          originalTitle: a.originalTitle,
          originalName: a.originalName || a.originalTitle,
          originalDescription: a.originalDescription
        })),
        projects: draft.projects.map((p, idx) => ({
          id: p.id,
          sourceId: p.sourceId,
          sourceType: 'project',
          title: p.title,
          description: p.description,
          tags: p.tags,
          created_at: p.created_at,
          date: p.date,
          included: p.included,
          order: idx,
          originalTitle: p.originalTitle,
          originalDescription: p.originalDescription
        })),
        journey: draft.journey.map((j, idx) => ({
          id: j.id,
          sourceId: j.sourceId,
          sourceType: 'journey',
          title: j.title,
          description: j.description,
          created_at: j.created_at,
          date: j.date,
          included: j.included,
          order: idx,
          originalTitle: j.originalTitle,
          originalDescription: j.originalDescription
        })),
        version: 1,
        savedAt: nowIso
      };

      // Upsert into resume_drafts with unique conflict target 'user_id'
      const { data, error: upsertError } = await supabase
        .from('resume_drafts')
        .upsert(
          {
            user_id: user.id,
            content: contentPayload,
            updated_at: nowIso
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id, updated_at')
        .single();

      if (upsertError) throw upsertError;

      setIsSavedDraft(true);
      setLastSavedAt(data?.updated_at || nowIso);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving resume draft:', err);
      // Keep current editor state completely intact upon error
      setSaveError(err.message || 'Failed to save resume draft. Your editor changes have been preserved.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Generates and downloads a formatted PDF from current in-memory editor state.
   * Zero database reads or writes (does not modify resume_drafts, projects, or journey).
   * Works whether the draft has been saved or remains unsaved.
   */
  const handleDownloadPdf = () => {
    if (loading || Boolean(loadError) || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      generateResumePdf({
        draft,
        profile,
        user,
        download: true
      });
    } catch (err) {
      console.error('Error generating resume PDF:', err);
      setPdfError(err.message || 'Unable to generate PDF document. Please check your browser settings.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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

  // Skills: Inclusion toggle
  const toggleSkillInclusion = (id) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.id === id ? { ...s, included: !s.included } : s
      )
    }));
  };

  // Skills: Reorder
  const moveSkill = (index, direction) => {
    setDraft((prev) => {
      const list = [...prev.skills];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, skills: list };
    });
  };

  // Skills: Inline text editing
  const updateSkillField = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'name') updated.title = value;
        if (field === 'title') updated.name = value;
        return updated;
      })
    }));
  };

  // Skills: Reset to original text
  const resetSkillText = (id) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.id === id
          ? { ...s, name: s.originalName, title: s.originalTitle }
          : s
      )
    }));
  };

  // Achievements: Inclusion toggle
  const toggleAchievementInclusion = (id) => {
    setDraft((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, included: !a.included } : a
      )
    }));
  };

  // Achievements: Reorder
  const moveAchievement = (index, direction) => {
    setDraft((prev) => {
      const list = [...prev.achievements];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, achievements: list };
    });
  };

  // Achievements: Inline text editing
  const updateAchievementField = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, [field]: value };
        if (field === 'title') updated.name = value;
        if (field === 'name') updated.title = value;
        return updated;
      })
    }));
  };

  // Achievements: Reset to original text
  const resetAchievementText = (id) => {
    setDraft((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id
          ? {
              ...a,
              title: a.originalTitle,
              name: a.originalTitle,
              description: a.originalDescription
            }
          : a
      )
    }));
  };

  // Computed views for live preview
  const includedSkills = draft.skills.filter((s) => s.included);
  const includedAchievements = draft.achievements.filter((a) => a.included);
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
        {/* Header Breadcrumb, Context & Save Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge-dept terracotta">Phase 6 Part B</span>
              <span className="badge-dept">Resume Builder</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: isSavedDraft ? '#E6F4EA' : 'var(--color-warm-ivory-light)',
                  border: `1px solid ${isSavedDraft ? '#CEEAD6' : 'var(--border-subtle)'}`,
                  color: isSavedDraft ? '#137333' : 'var(--text-muted)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500
                }}
                data-testid="draft-source-status"
              >
                {isSavedDraft ? 'Saved Draft' : 'Auto-Populated Draft'}
              </span>
              {lastSavedAt && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} data-testid="last-saved-timestamp">
                  Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.4rem' }}>
              Collegiate Resume Builder
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.6 }}>
              Generated directly from your authentic Mentra Journey milestones and portfolio projects.
              Edits and reordering exist solely within this resume layer and do not modify your source records.
            </p>
          </div>

          {/* Action Buttons: Download PDF & Save Draft */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              id="download-pdf-button"
              data-testid="download-pdf-button"
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || Boolean(loadError) || isGeneratingPdf}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                minWidth: '145px',
                justifyContent: 'center',
                cursor: (loading || Boolean(loadError) || isGeneratingPdf) ? 'not-allowed' : 'pointer',
                opacity: (loading || Boolean(loadError) || isGeneratingPdf) ? 0.65 : 1
              }}
              aria-label={isGeneratingPdf ? 'Generating resume PDF...' : 'Download formatted resume as PDF'}
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              id="save-draft-button"
              data-testid="save-draft-button"
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || Boolean(loadError)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                minWidth: '135px',
                justifyContent: 'center',
                cursor: (isSaving || Boolean(loadError)) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || Boolean(loadError)) ? 0.65 : 1
              }}
              aria-label={isSaving ? 'Saving resume draft...' : 'Save resume draft to resume_drafts'}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Save Draft</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Load Error Notice */}
        {loadError && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }} role="alert" data-testid="load-error-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{loadError}</span>
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
              To protect your existing saved resume draft from being accidentally overwritten, saving is disabled while in this error state.
            </p>
            <button
              onClick={loadDraftOrSourceRecords}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={13} />
              <span>Retry Loading Saved Draft</span>
            </button>
          </div>
        )}

        {/* Save Success Banner */}
        {saveSuccess && (
          <div
            className="notice-box success"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#E6F4EA',
              border: '1px solid #CEEAD6',
              color: '#137333',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem'
            }}
            role="status"
            data-testid="save-success-banner"
          >
            <CheckCircle2 size={16} style={{ color: '#137333', flexShrink: 0 }} />
            <span>Resume draft saved successfully to your Mentra Collegiate profile!</span>
          </div>
        )}

        {/* Save Error Banner */}
        {saveError && (
          <div
            className="notice-box error"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#FCE8E6',
              border: '1px solid #FAD2CF',
              color: '#C5221F',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem'
            }}
            role="alert"
            data-testid="save-error-banner"
          >
            <AlertCircle size={16} style={{ color: '#C5221F', flexShrink: 0 }} />
            <span>{saveError}</span>
          </div>
        )}

        {/* PDF Error Banner */}
        {pdfError && (
          <div
            className="notice-box error"
            style={{
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#FCE8E6',
              border: '1px solid #FAD2CF',
              color: '#C5221F',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem'
            }}
            role="alert"
            data-testid="pdf-error-banner"
          >
            <AlertCircle size={16} style={{ color: '#C5221F', flexShrink: 0 }} />
            <span>{pdfError}</span>
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
                  {user?.email} &bull; {formatAcademicDetails(profile, {
                    fallback: 'Department Undergrad',
                    formatSpec: (spec) => `(${spec})`
                  })}
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

            {/* Section 2: Technical & Academic Skills */}
            <section
              className="card-academic"
              aria-labelledby="section-skills-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-skills-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    2. Technical & Academic Skills
                  </h2>
                  <span className="badge-dept" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                    Self-Reported
                  </span>
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
                  {includedSkills.length} of {draft.skills.length} included
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                Auto-populated from your self-reported profile skills. Edits, reordering, and inclusion choices exist solely in this resume draft.
              </p>

              {draft.skills.length === 0 ? (
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
                    No self-reported skills found on your collegiate profile.
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Add skills via Edit Profile in the navigation bar to include them on your resume.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {draft.skills.map((skill, idx) => {
                    const isEditing = editingSkillId === skill.id;
                    const hasModifications = skill.name !== skill.originalName;

                    return (
                      <article
                        key={skill.id}
                        data-testid={`skill-entry-${skill.id}`}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.9rem 1.15rem',
                          backgroundColor: skill.included ? 'var(--color-white)' : '#F9F8F6',
                          opacity: skill.included ? 1 : 0.65,
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h3
                                style={{
                                  fontSize: '0.95rem',
                                  margin: 0,
                                  color: skill.included ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {skill.name}
                              </h3>
                              <span className="badge-dept" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                Skill
                              </span>
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
                              {!skill.included && (
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
                              onClick={() => moveSkill(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move skill "${skill.name}" up in resume`}
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
                              onClick={() => moveSkill(idx, 'down')}
                              disabled={idx === draft.skills.length - 1}
                              aria-label={`Move skill "${skill.name}" down in resume`}
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
                                cursor: idx === draft.skills.length - 1 ? 'not-allowed' : 'pointer',
                                color: idx === draft.skills.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === draft.skills.length - 1 ? 0.35 : 1
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* Edit Inline Toggle */}
                            <button
                              type="button"
                              onClick={() => setEditingSkillId(isEditing ? null : skill.id)}
                              aria-label={isEditing ? `Done editing skill "${skill.name}"` : `Edit text for skill "${skill.name}"`}
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
                              aria-checked={skill.included}
                              onClick={() => toggleSkillInclusion(skill.id)}
                              aria-label={`${skill.included ? 'Exclude' : 'Include'} skill "${skill.name}" in resume`}
                              title={skill.included ? 'Exclude from resume' : 'Include in resume'}
                              style={{
                                backgroundColor: skill.included ? '#2E5A36' : 'var(--color-warm-ivory)',
                                color: skill.included ? 'var(--color-white)' : 'var(--text-muted)',
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
                              {skill.included ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{skill.included ? 'Included' : 'Hidden'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form */}
                        {isEditing && (
                          <div
                            style={{
                              backgroundColor: 'var(--color-warm-ivory-light)',
                              padding: '0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              marginTop: '0.65rem'
                            }}
                          >
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label
                                htmlFor={`skill-name-${skill.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Skill Label
                              </label>
                              <input
                                id={`skill-name-${skill.id}`}
                                type="text"
                                value={skill.name}
                                onChange={(e) => updateSkillField(skill.id, 'name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Source profile skill in database remains untouched.
                              </span>
                              {hasModifications && (
                                <button
                                  type="button"
                                  onClick={() => resetSkillText(skill.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  <RotateCcw size={11} />
                                  <span>Revert to Source Text</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Projects Section */}
            <section
              className="card-academic"
              aria-labelledby="section-projects-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-projects-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    3. Portfolio Projects
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
                    4. Journey Milestones
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

            {/* Section 5: Honors & Achievements */}
            <section
              className="card-academic"
              aria-labelledby="section-achievements-heading"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} style={{ color: 'var(--color-terracotta)' }} />
                  <h2 id="section-achievements-heading" style={{ fontSize: '1.25rem', margin: 0 }}>
                    5. Honors & Achievements
                  </h2>
                  <span className="badge-dept" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                    Self-Reported
                  </span>
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
                  {includedAchievements.length} of {draft.achievements.length} included
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                Auto-populated from your self-reported profile achievements. Edits, reordering, and inclusion choices exist solely in this resume draft.
              </p>

              {draft.achievements.length === 0 ? (
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
                    No self-reported achievements found on your collegiate profile.
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Add achievements via Edit Profile in the navigation bar to include them on your resume.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {draft.achievements.map((ach, idx) => {
                    const isEditing = editingAchievementId === ach.id;
                    const hasModifications =
                      ach.title !== ach.originalTitle ||
                      ach.description !== ach.originalDescription;

                    return (
                      <article
                        key={ach.id}
                        data-testid={`achievement-entry-${ach.id}`}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.9rem 1.15rem',
                          backgroundColor: ach.included ? 'var(--color-white)' : '#F9F8F6',
                          opacity: ach.included ? 1 : 0.65,
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            marginBottom: ach.description || isEditing ? '0.5rem' : 0
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h3
                                style={{
                                  fontSize: '0.95rem',
                                  margin: 0,
                                  color: ach.included ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {ach.title}
                              </h3>
                              <span className="badge-dept terracotta" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                Achievement
                              </span>
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
                              {!ach.included && (
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
                              onClick={() => moveAchievement(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move achievement "${ach.title}" up in resume`}
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
                              onClick={() => moveAchievement(idx, 'down')}
                              disabled={idx === draft.achievements.length - 1}
                              aria-label={`Move achievement "${ach.title}" down in resume`}
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
                                cursor: idx === draft.achievements.length - 1 ? 'not-allowed' : 'pointer',
                                color: idx === draft.achievements.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                opacity: idx === draft.achievements.length - 1 ? 0.35 : 1
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* Edit Inline Toggle */}
                            <button
                              type="button"
                              onClick={() => setEditingAchievementId(isEditing ? null : ach.id)}
                              aria-label={isEditing ? `Done editing achievement "${ach.title}"` : `Edit text for achievement "${ach.title}"`}
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
                              aria-checked={ach.included}
                              onClick={() => toggleAchievementInclusion(ach.id)}
                              aria-label={`${ach.included ? 'Exclude' : 'Include'} achievement "${ach.title}" in resume`}
                              title={ach.included ? 'Exclude from resume' : 'Include in resume'}
                              style={{
                                backgroundColor: ach.included ? '#2E5A36' : 'var(--color-warm-ivory)',
                                color: ach.included ? 'var(--color-white)' : 'var(--text-muted)',
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
                              {ach.included ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{ach.included ? 'Included' : 'Hidden'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form */}
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
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label
                                htmlFor={`ach-title-${ach.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Resume Achievement Title
                              </label>
                              <input
                                id={`ach-title-${ach.id}`}
                                type="text"
                                value={ach.title}
                                onChange={(e) => updateAchievementField(ach.id, 'title', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label
                                htmlFor={`ach-desc-${ach.id}`}
                                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}
                              >
                                Detail / Context (Optional)
                              </label>
                              <textarea
                                id={`ach-desc-${ach.id}`}
                                value={ach.description}
                                onChange={(e) => updateAchievementField(ach.id, 'description', e.target.value)}
                                rows={2}
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
                                Source profile achievement in database remains untouched.
                              </span>
                              {hasModifications && (
                                <button
                                  type="button"
                                  onClick={() => resetAchievementText(ach.id)}
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
                          ach.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginTop: '0.35rem' }}>
                              {ach.description}
                            </p>
                          )
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
                <div
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}
                  data-testid="preview-academic-details"
                >
                  <span>{formatAcademicDetails(profile, { fallback: 'Department Scholar' })}</span>
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

              {/* Technical & Academic Skills Preview Block */}
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
                  <span>Technical & Academic Skills</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {includedSkills.length} included
                  </span>
                </h3>

                {includedSkills.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No skills selected for this draft. Toggle entries on the left to include them.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.45rem',
                      alignItems: 'center'
                    }}
                    data-testid="preview-skills-list"
                  >
                    {includedSkills.map((sk) => (
                      <span
                        key={sk.id}
                        data-testid={`preview-skill-${sk.id}`}
                        style={{
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--color-warm-ivory-light)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.2rem 0.55rem',
                          fontWeight: 500
                        }}
                      >
                        {sk.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

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

              {/* Honors & Achievements Preview Block */}
              <div style={{ marginTop: '1.5rem' }}>
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
                  <span>Honors & Achievements</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {includedAchievements.length} included
                  </span>
                </h3>

                {includedAchievements.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No achievements selected for this draft. Toggle entries on the left to include them.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} data-testid="preview-achievements-list">
                    {includedAchievements.map((ach) => (
                      <div key={ach.id} data-testid={`preview-achievement-${ach.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            &bull; {ach.title}
                          </h4>
                          {ach.date && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {ach.date}
                            </span>
                          )}
                        </div>
                        {ach.description && (
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '0.2rem', marginBottom: 0, paddingLeft: '0.85rem' }}>
                            {ach.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 8 PDF Export Active Notice */}
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
                <span>
                  PDF download generates directly from your in-memory editor state (saved or unsaved) with zero database mutations.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={loading || Boolean(loadError) || isGeneratingPdf}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                aria-label="Export resume as PDF"
              >
                <Download size={12} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

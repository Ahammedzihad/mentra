import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { CreateProjectModal } from '../../../features/projects/CreateProjectModal';
import { EditProjectModal } from '../../../features/projects/EditProjectModal';
import { DeleteConfirmModal } from '../../../features/projects/DeleteConfirmModal';
import { AddJourneyModal } from '../../../features/journey/AddJourneyModal';
import {
  FolderPlus,
  Sparkles,
  Edit3,
  Trash2,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [journeyEntries, setJourneyEntries] = useState([]);
  const [verifiedMentors, setVerifiedMentors] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);

  const loadStudentData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch own projects
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects(projData || []);

      // 2. Fetch own journey entries
      const { data: journeyData, error: journeyErr } = await supabase
        .from('journey')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (journeyErr) throw journeyErr;
      setJourneyEntries(journeyData || []);

      // 3. Fetch verified mentors ONLY (is_verified = true and role = 'mentor')
      const { data: mentorsData } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, is_verified')
        .eq('role', 'mentor')
        .eq('is_verified', true);

      setVerifiedMentors(mentorsData || []);

      // 4. Fetch own mentorship requests (Phase 2 connection layer)
      const { data: mentorshipsData, error: mentorErr } = await supabase
        .from('mentorships')
        .select('id, mentor_id, status, created_at, mentor:profiles!mentor_id(id, full_name, department, role, is_verified)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (!mentorErr) {
        setMentorships(mentorshipsData || []);
      }
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message || 'Unable to load student records.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

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

  const handleJourneyAdded = (newEntry) => {
    setJourneyEntries((prev) => [newEntry, ...prev]);
  };

  const connectedMentors = mentorships.filter((m) => m.status === 'accepted');

  return (
    <div style={{ padding: '3rem 0 5rem 0' }}>
      <div className="container">
        {/* Student Profile & Action Bar */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2.25rem',
            marginBottom: '2.5rem',
            boxShadow: 'var(--shadow-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="badge-dept terracotta">Student Space</span>
              <span className="badge-dept">{profile?.department || 'Department Undergrad'}</span>
            </div>
            <h1 className="font-serif" style={{ fontSize: '2.1rem', marginBottom: '0.25rem' }}>
              {profile?.full_name || 'Student Scholar'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {user?.email} &bull; Academic matriculation active &bull; College Fellowship Member
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/mentors"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <GraduationCap size={15} style={{ color: 'var(--color-warm-gold)' }} />
              <span>Browse Mentors</span>
            </Link>
            <button
              onClick={() => setIsJourneyModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={15} style={{ color: 'var(--color-terracotta)' }} />
              <span>Record Milestone</span>
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FolderPlus size={15} />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Phase 2: Connected Mentors Section (Item 5: Accepted mentorships only) */}
        {connectedMentors.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span className="label-academic gold">Active Guidance</span>
                <h2 style={{ fontSize: '1.45rem', marginTop: '0.15rem' }}>Connected Mentors</h2>
              </div>
              <Link to="/mentors" className="btn btn-secondary btn-sm">
                <span>View Network</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid-3">
              {connectedMentors.map((c) => (
                <div key={c.id} className="card-academic" style={{ borderLeft: '3px solid #2E5A36' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge-dept terracotta">{c.mentor?.department || 'Faculty'}</span>
                    <span className="badge-dept" style={{ backgroundColor: '#EBF3EC', color: '#266432', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={12} /> Connected
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{c.mentor?.full_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Collegiate Faculty Advisor &bull; {c.mentor?.department}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: My Mentorship Requests Section (Item 3) */}
        {mentorships.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span className="label-academic charcoal">Inquiry Tracking</span>
                <h2 style={{ fontSize: '1.45rem', marginTop: '0.15rem' }}>My Mentorship Requests</h2>
              </div>
              <Link to="/mentors" className="btn btn-secondary btn-sm">
                <span>Browse Directory</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mentorships.map((req) => (
                <div
                  key={req.id}
                  className="card-academic"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '1.15rem 1.5rem',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge-dept terracotta" style={{ fontSize: '0.7rem' }}>
                        {req.mentor?.department || 'Academic Dept'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', margin: 0 }}>{req.mentor?.full_name}</h4>
                  </div>

                  <div>
                    {req.status === 'pending' && (
                      <span className="badge-dept gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem' }}>
                        <Clock size={13} /> Pending
                      </span>
                    )}
                    {req.status === 'accepted' && (
                      <span className="badge-dept" style={{ backgroundColor: '#EBF3EC', color: '#266432', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem' }}>
                        <CheckCircle2 size={13} /> Accepted
                      </span>
                    )}
                    {req.status === 'declined' && (
                      <span className="badge-dept terracotta" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem' }}>
                        <XCircle size={13} /> Declined
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2 Column Layout: Projects & Journey Timeline */}
        <div className="grid-2" style={{ alignItems: 'flex-start', gap: '2rem' }}>
          {/* Column 1: My Projects */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span className="label-academic charcoal">Inaugurated Work</span>
                <h2 style={{ fontSize: '1.45rem', marginTop: '0.15rem' }}>My Projects</h2>
              </div>
              <Link to="/projects" className="btn btn-secondary btn-sm">
                <span>Browse All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="card-academic" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Retrieving your project records...</p>
              </div>
            ) : projects.length === 0 ? (
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)',
                }}
              >
                <FolderPlus size={32} style={{ color: 'var(--color-terracotta)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  No projects inaugurated yet
                </h3>
                <p style={{ fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
                  Inaugurate your first academic project or collaborative build. Share your hypothesis and invite peer inquiry.
                </p>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="btn btn-primary btn-sm"
                >
                  <FolderPlus size={14} />
                  <span>Inaugurate First Project</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {projects.map((proj) => (
                  <div key={proj.id} className="card-academic">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.15rem' }}>{proj.title}</h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1rem', whiteSpace: 'pre-line', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {proj.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                      <button
                        onClick={() => setEditingProject(proj)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        title="Revise Project Details"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingProject(proj)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: '#9E382A' }}
                        title="Withdraw Project"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: My Journey Timeline */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span className="label-academic gold">Chronological Growth</span>
                <h2 style={{ fontSize: '1.45rem', marginTop: '0.15rem' }}>My Journey</h2>
              </div>
              <Link to="/journey" className="btn btn-secondary btn-sm">
                <span>View Full Path</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="card-academic" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading journey milestones...</p>
              </div>
            ) : journeyEntries.length === 0 ? (
              <div
                className="card-academic"
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  backgroundColor: 'var(--color-warm-ivory-light)',
                }}
              >
                <Sparkles size={32} style={{ color: 'var(--color-warm-gold)', margin: '0 auto 1rem auto' }} />
                <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  No milestones recorded yet
                </h3>
                <p style={{ fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
                  Your collegiate journey unfolds through six intentional phases: Learn, Connect, Build, Share, Discover, and Grow.
                </p>
                <button
                  onClick={() => setIsJourneyModalOpen(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Sparkles size={14} />
                  <span>Record First Milestone</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {journeyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="card-academic"
                    style={{ borderLeft: '3px solid var(--color-terracotta)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{entry.title}</h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'Recorded'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      {entry.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verified Faculty Advisors Section */}
        <div style={{ marginTop: '3.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="label-academic gold">Academic Advisory</span>
              <h2 className="font-serif" style={{ fontSize: '1.5rem', marginTop: '0.2rem' }}>Verified Faculty Mentors</h2>
            </div>
            <Link to="/mentors" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={14} />
              <span>Browse All Verified Mentors &rarr;</span>
            </Link>
          </div>

          {verifiedMentors.length === 0 ? (
            <div className="card-academic" style={{ backgroundColor: 'var(--color-warm-ivory-light)', padding: '2.25rem', textAlign: 'center' }}>
              <GraduationCap size={32} style={{ color: 'var(--color-warm-gold)', margin: '0 auto 0.75rem auto' }} />
              <h3 className="font-serif" style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>
                Faculty Verification Underway
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
                Collegiate mentor applications undergo institutional vetting by the college academic committee. Verified faculty mentors will appear here once officially ratified.
              </p>
            </div>
          ) : (
            <div className="grid-3">
              {verifiedMentors.map((mentor) => (
                <div key={mentor.id} className="card-academic">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge-dept terracotta">{mentor.department || 'Academic Dept'}</span>
                    <span className="badge-dept gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={12} style={{ color: '#8C6A30' }} />
                      <span>Verified</span>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{mentor.full_name}</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Collegiate Faculty Mentor &bull; {mentor.department}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
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
      <AddJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
        onEntryAdded={handleJourneyAdded}
      />
    </div>
  );
};

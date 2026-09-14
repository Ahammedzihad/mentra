import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../frontend/lib/supabase';
import { AddJourneyModal } from './AddJourneyModal';
import { EditJourneyModal } from './EditJourneyModal';
import { DeleteJourneyModal } from './DeleteJourneyModal';
import {
  Sparkles,
  Compass,
  Calendar,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  Lock
} from 'lucide-react';

const PHASES = [
  { name: 'Learn', subtitle: 'Theoretical rigor & syllabus foundation' },
  { name: 'Connect', subtitle: 'Peer cohorts & mentor engagement' },
  { name: 'Build', subtitle: 'Tangible prototypes & code initiatives' },
  { name: 'Share', subtitle: 'Departmental review & symposium publishing' },
  { name: 'Discover', subtitle: 'Emerging specializations & campus inquiry' },
  { name: 'Grow', subtitle: 'Collegiate leadership & peer mentorship' },
];

export const JourneyPage = () => {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);

  const fetchJourney = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Securely fetch ONLY the authenticated user's own journey entries, matching database RLS
      const { data, error: fetchErr } = await supabase
        .from('journey')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching journey timeline:', err);
      setError(err.message || 'Unable to load journey milestones.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  // Mutation handlers
  const handleEntryAdded = (newEntry) => {
    setEntries((prev) => [newEntry, ...prev]);
  };

  const handleEntryUpdated = (updatedEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    );
  };

  const handleEntryDeleted = (deletedId) => {
    setEntries((prev) => prev.filter((item) => item.id !== deletedId));
  };

  const isMentor = Boolean(profile?.role === 'mentor' && profile?.is_verified === true);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="label-academic gold">Chronological Archival</span>
              <span className="badge-dept">{profile?.department || 'Collegiate Cohort'}</span>
              {isMentor && <span className="badge-dept gold">Faculty Mentor</span>}
            </div>
            <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>
              {isMentor ? 'Mentorship & Academic Journey' : 'Student Journey Timeline'}
            </h1>
            <p style={{ maxWidth: '640px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {isMentor
                ? 'A record of your scholarly guidance, research supervisions, and departmental contributions.'
                : 'A living chronological record of your scholarly evolution across the six collegiate epochs.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={fetchJourney}
              className="btn btn-secondary btn-sm"
              title="Refresh timeline records"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              <span>Record Milestone</span>
            </button>
          </div>
        </div>

        {/* Mentor Privacy Banner */}
        {isMentor && (
          <div
            className="notice-box info"
            style={{
              marginBottom: '2.5rem',
              backgroundColor: 'var(--color-warm-gold-subtle)',
              border: '1px solid rgba(197, 164, 109, 0.4)',
            }}
          >
            <Lock size={18} style={{ color: '#8C6A30', flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--color-primary-dark)' }}>
              <strong>Academic Privacy Guard:</strong> Student journeys are strictly private to each scholar to protect personal self-reflection and academic freedom. As faculty, this space chronicles your personal milestones, advising highlights, and research achievements.
            </div>
          </div>
        )}

        {/* 6 Phases Flow Indicator */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            marginBottom: '3.5rem',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Compass size={18} style={{ color: 'var(--color-terracotta)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary-dark)' }}>
              The Six Epochs of Collegiate Development
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {PHASES.map((p, idx) => (
              <div
                key={p.name}
                style={{
                  borderLeft: '2px solid var(--color-soft-beige)',
                  paddingLeft: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--color-terracotta)', fontWeight: 700 }}>
                  0{idx + 1}
                </div>
                <div className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '0.2rem' }}>
                  {p.subtitle}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="notice-box error" style={{ marginBottom: '2rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Timeline Records */}
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="label-academic charcoal">Chronological Registry</span>
              <h2 className="font-serif" style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>
                Your Documented Milestones
              </h2>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>{entries.length}</strong> {entries.length === 1 ? 'Milestone' : 'Milestones'} logged
            </span>
          </div>

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
                Retrieving your chronological records from Supabase...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : entries.length === 0 ? (
            /* Empty State */
            <div
              className="card-academic"
              style={{
                textAlign: 'center',
                padding: '4.5rem 2rem',
                backgroundColor: 'var(--color-warm-ivory-light)',
              }}
            >
              <Sparkles size={40} style={{ color: 'var(--color-warm-gold)', margin: '0 auto 1.25rem auto' }} />
              <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                Your journey timeline is waiting to begin
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
                Record your first major academic realization, research milestone, prototype build, or symposium presentation. Every milestone stays recorded in your scholarly portfolio.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-primary"
              >
                <Sparkles size={16} />
                <span>Record First Milestone</span>
              </button>
            </div>
          ) : (
            /* Vertical Timeline */
            <div
              style={{
                position: 'relative',
                paddingLeft: '2rem',
                borderLeft: '2px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
              }}
            >
              {entries.map((entry) => {
                // Parse stage tag if formatted like "[Learn] Headline"
                const match = entry.title?.match(/^\[(.*?)\]\s*(.*)$/);
                const stageTag = match ? match[1] : null;
                const displayTitle = match ? match[2] : entry.title;
                const formattedDate = entry.created_at
                  ? new Date(entry.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Milestone';

                return (
                  <div
                    key={entry.id}
                    style={{
                      position: 'relative',
                    }}
                  >
                    {/* Timeline Node Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-2.65rem',
                        top: '1.5rem',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-dark)',
                        border: '3px solid var(--color-warm-ivory)',
                        boxShadow: '0 0 0 1px var(--border-strong)',
                      }}
                    />

                    <article className="card-academic">
                      {/* Top Header of Milestone Card */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {stageTag ? (
                            <span className="badge-dept terracotta">{stageTag}</span>
                          ) : (
                            <span className="badge-dept">Milestone</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Personal Archive
                          </span>
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
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3
                        className="font-serif"
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 600,
                          color: 'var(--color-primary-dark)',
                          marginBottom: '0.75rem',
                          lineHeight: 1.3,
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {displayTitle}
                      </h3>

                      {/* Description / Reflection */}
                      <p
                        style={{
                          fontSize: '0.925rem',
                          lineHeight: '1.65',
                          color: 'var(--text-secondary)',
                          marginBottom: '1.25rem',
                          whiteSpace: 'pre-line',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {entry.description}
                      </p>

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          paddingTop: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Verified in your collegiate journey
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                            title="Revise Milestone"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingEntry(entry)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: '#9E382A' }}
                            title="Remove Milestone"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddJourneyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEntryAdded={handleEntryAdded}
      />

      <EditJourneyModal
        isOpen={Boolean(editingEntry)}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onEntryUpdated={handleEntryUpdated}
      />

      <DeleteJourneyModal
        isOpen={Boolean(deletingEntry)}
        entry={deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onEntryDeleted={handleEntryDeleted}
      />
    </div>
  );
};

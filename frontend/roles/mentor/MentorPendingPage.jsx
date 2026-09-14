import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  ArrowRight,
  FolderGit2
} from 'lucide-react';

export const MentorPendingPage = () => {
  const { profile } = useAuth();

  return (
    <div style={{ padding: '4rem 0 6rem 0', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div className="container container-narrow">
        <div
          className="card-academic"
          style={{
            padding: '3rem 2.5rem',
            backgroundColor: 'var(--color-white)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-warm-gold-subtle)',
                border: '1px solid rgba(197, 164, 109, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                color: '#7A5714',
              }}
            >
              <Clock size={28} />
            </div>

            <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)' }}>
              Institutional Review Protocol
            </span>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.85rem, 3.5vw, 2.35rem)',
                color: 'var(--color-primary-dark)',
                marginTop: '0.4rem',
                marginBottom: '0.75rem',
              }}
            >
              Your mentor application is under review.
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
              Thank you for applying to advise scholars within the Mentra college community.
            </p>
          </div>

          {/* Review Details Box */}
          <div
            style={{
              backgroundColor: 'var(--color-warm-ivory-light)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.75rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Applicant
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {profile?.full_name || 'Academic Mentor'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span className="badge-dept terracotta">{profile?.department || 'Department Advisor'}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#FFF5E6',
                    border: '1px solid #F0D4A0',
                    color: '#8A5812',
                  }}
                >
                  <Clock size={12} />
                  <span>Pending Approval</span>
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', fontSize: '0.875rem', lineHeight: '1.65', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>Why is verification required?</strong> To protect academic integrity and ensure students receive accountable, qualified faculty guidance, all mentor accounts are manually reviewed and verified by college academic administrators.
              </p>
              <p style={{ margin: 0 }}>
                Mentors cannot self-verify. Once your credentials and department affiliation are confirmed by the academic review committee, your account will be granted official <strong>Verified Mentor</strong> standing.
              </p>
            </div>
          </div>

          {/* What you can do now */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', marginBottom: '0.85rem' }}>
              What you can do while awaiting review:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)', marginTop: '0.5rem', flexShrink: 0 }} />
                <span>
                  <strong>Explore the Project Registry:</strong> Browse research initiatives and design builds across departments.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)', marginTop: '0.5rem', flexShrink: 0 }} />
                <span>
                  <strong>Inspect Your Mentor Studio:</strong> View your advising portfolio and status updates.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)', marginTop: '0.5rem', flexShrink: 0 }} />
                <span>
                  <strong>Student Visibility:</strong> During the review period, you will not appear in the verified mentor directory to students until institutional approval is finalized.
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.75rem',
            }}
          >
            <Link to="/mentor" className="btn btn-primary">
              <span>Go to Mentor Studio</span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/projects" className="btn btn-secondary">
              <FolderGit2 size={15} />
              <span>Browse Projects</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

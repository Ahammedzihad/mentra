import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-primary-dark)',
        color: 'var(--text-on-dark)',
        padding: '4rem 0 2.5rem 0',
        marginTop: 'auto',
        borderTop: '1px solid var(--border-on-dark)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            paddingBottom: '3rem',
            borderBottom: '1px solid var(--border-on-dark)',
          }}
        >
          {/* Brand & Mission */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginBottom: '0.85rem' }}>
              <span className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warm-ivory)' }}>
                Mentra
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-terracotta)' }}>
                Collegiate
              </span>
            </div>
            <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              A trusted educational college community connecting students, mentors, projects, mentorship, and student journeys into an integrated fellowship.
            </p>
          </div>

          {/* Academic Cohorts */}
          <div>
            <h4 style={{ fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-warm-gold)', marginBottom: '1rem', fontWeight: 600 }}>
              Academic Cohorts
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>B.Tech — Technology & Computing</li>
              <li style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>B.Des — Design & Spatial Systems</li>
              <li style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>BBA — Management & Enterprise</li>
              <li style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>BCA — Applied Computer Science</li>
            </ul>
          </div>

          {/* Platform Exploration */}
          <div>
            <h4 style={{ fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-warm-gold)', marginBottom: '1rem', fontWeight: 600 }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>
                <Link to="/" style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                  Overview & Ecosystem
                </Link>
              </li>
              <li>
                <Link to="/projects" style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                  College Projects Registry
                </Link>
              </li>
              <li>
                <Link to="/journey" style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                  Student Journey Timeline
                </Link>
              </li>
              <li>
                <Link to="/signup" style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                  Sign Up for Mentra
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Trust Principles */}
          <div>
            <h4 style={{ fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-warm-gold)', marginBottom: '1rem', fontWeight: 600 }}>
              Pillars of Trust
            </h4>
            <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
              Built upon academic rigor, verified faculty guidance, zero commercial advertising, and deliberate human mentorship.
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-on-dark-secondary)', opacity: 0.8 }}>
              Learn &bull; Connect &bull; Build &bull; Share &bull; Discover &bull; Grow
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          style={{
            paddingTop: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-on-dark-secondary)',
            gap: '1rem',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Mentra Educational Community. Phase 1 Academic Release.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Collegiate Fellowship</span>
            <span>Verified Mentorship</span>
            <span>Institutional Honor Code</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

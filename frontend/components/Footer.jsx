import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: '#1C1B19',
        color: '#F5F0E8',
        padding: '3.75rem 0 3rem 0',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr 1.3fr',
            gap: '2.5rem',
            alignItems: 'start',
            paddingBottom: '2.5rem',
          }}
          className="footer-grid-container"
        >
          {/* Column 1: Brand & Tagline */}
          <div>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                textDecoration: 'none',
                marginBottom: '0.85rem',
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: '#F5F0E8',
                  letterSpacing: '-0.02em',
                }}
              >
                Mentra
              </span>
              <span
                className="font-serif"
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 400,
                  color: '#C8BFB3',
                  marginLeft: '0.35rem',
                  letterSpacing: '-0.01em',
                }}
              >
                Collegiate
              </span>
            </Link>
            <p
              style={{
                color: '#8E877D',
                fontSize: '0.825rem',
                lineHeight: '1.5',
                marginTop: '0.25rem',
              }}
            >
              People. Projects. Perspective. A brighter tomorrow.
            </p>
          </div>

          {/* Column 2: Explore */}
          <div>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#FAF7F2',
                marginBottom: '1rem',
                letterSpacing: '0.02em',
              }}
            >
              Explore
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <Link to="/" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/projects" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/discover" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Discover
                </Link>
              </li>
              <li>
                <Link to="/journey" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Journey
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Community */}
          <div>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#FAF7F2',
                marginBottom: '1rem',
                letterSpacing: '0.02em',
              }}
            >
              Community
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <Link to="/student" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Student Space
                </Link>
              </li>
              <li>
                <Link to="/mentors" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Browse Mentors
                </Link>
              </li>
              <li>
                <Link to="/ai" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Personal AI
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#FAF7F2',
                marginBottom: '1rem',
                letterSpacing: '0.02em',
              }}
            >
              Support
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <a href="#help" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Help Center
                </a>
              </li>
              <li>
                <a href="#contact" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#guidelines" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Community Guidelines
                </a>
              </li>
              <li>
                <a href="#privacy" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" style={{ color: '#8E877D', fontSize: '0.825rem', textDecoration: 'none', transition: 'color 0.2s' }}>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Botanical Icon & Connected Statement */}
          <div
            style={{
              paddingLeft: '1.5rem',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
            className="footer-statement-col"
          >
            {/* Botanical gold sprout icon */}
            <div style={{ color: '#C5A46D' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 20h10" />
                <path d="M12 20v-8" />
                <path d="M12 12c-2.5-3-2-6 1-8 2 3 1.5 6-1 8z" />
                <path d="M8 14c-2-1.5-2.5-4-1-6 2 1.5 2 4 1 6z" />
              </svg>
            </div>
            <p
              style={{
                color: '#A39C91',
                fontSize: '0.825rem',
                lineHeight: '1.55',
                fontStyle: 'normal',
              }}
            >
              A more connected collegiate experience for what comes next.
            </p>
            <div
              style={{
                width: '32px',
                height: '2px',
                backgroundColor: '#A84B2B',
                marginTop: '0.25rem',
              }}
            />
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          style={{
            paddingTop: '1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#6E675E',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Mentra Collegiate. All rights reserved.
          </div>
          <div>
            A journey, not just a profile.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2rem !important;
          }
          .footer-statement-col {
            grid-column: 1 / -1;
            padding-left: 0 !important;
            border-left: none !important;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 1.5rem;
          }
        }
        @media (max-width: 600px) {
          .footer-grid-container {
            grid-template-columns: 1fr !important;
            gap: 1.75rem !important;
          }
        }
      `}</style>
    </footer>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Users,
  GraduationCap,
  FolderGit2,
  ShieldCheck,
  Check,
  ArrowRight,
  BookOpen,
  Award
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div style={{ width: '100%' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          padding: '5.5rem 0 4.5rem 0',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--color-warm-ivory)',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '820px' }}>
            <div className="label-academic" style={{ marginBottom: '1.25rem' }}>
              <Compass size={14} />
              <span>A Trusted Educational College Community</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)',
                fontWeight: 600,
                lineHeight: 1.15,
                color: 'var(--color-primary-dark)',
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em',
              }}
            >
              More than just college.
            </h1>

            <p
              style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                marginBottom: '2.5rem',
                maxWidth: '680px',
              }}
            >
              Mentra connects learning, people, projects, communities, and opportunities into one journey.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <Link to="/signup" className="btn btn-primary" style={{ padding: '0.8rem 1.75rem', fontSize: '1rem' }}>
                <span>Join Mentra</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#ecosystem" className="btn btn-secondary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }}>
                Explore the community
              </a>
            </div>

            {/* Department tags strip */}
            <div
              style={{
                marginTop: '3.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem', fontWeight: 600 }}>
                Collegiate Cohorts:
              </span>
              <span className="badge-dept">B.Tech Engineering</span>
              <span className="badge-dept">B.Des Design Systems</span>
              <span className="badge-dept">BBA Enterprise</span>
              <span className="badge-dept">BCA Applied Computing</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MENTRA ECOSYSTEM */}
      <section id="ecosystem" className="section" style={{ backgroundColor: 'var(--color-warm-ivory-light)' }}>
        <div className="container">
          <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
            <span className="label-academic terracotta">The Mentra Ecosystem</span>
            <h2 style={{ marginTop: '0.4rem', marginBottom: '0.85rem' }}>
              An interconnected collegiate landscape.
            </h2>
            <p>
              Traditional academia fragments courses, faculty access, student portfolios, and career pathways.
              Mentra unifies them into an intentional, dignified ecosystem.
            </p>
          </div>

          <div className="grid-3">
            <div className="card-academic">
              <div style={{ color: 'var(--color-terracotta)', marginBottom: '1rem' }}>
                <BookOpen size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Contextual Learning</h3>
              <p style={{ fontSize: '0.925rem' }}>
                Bridging syllabus fundamentals with active projects. Learning ceases to be isolated exam preparation and becomes cumulative craft.
              </p>
            </div>

            <div className="card-academic">
              <div style={{ color: 'var(--color-warm-gold)', marginBottom: '1rem' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Verified Faculty & Mentors</h3>
              <p style={{ fontSize: '0.925rem' }}>
                Direct access to professors and recognized advisors without arbitrary barriers. Structured guidance grounded in academic integrity.
              </p>
            </div>

            <div className="card-academic">
              <div style={{ color: 'var(--color-primary-dark)', marginBottom: '1rem' }}>
                <FolderGit2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Collaborative Projects</h3>
              <p style={{ fontSize: '0.925rem' }}>
                Interdisciplinary teams uniting designers, engineers, and strategists on substantive initiatives that exist beyond the classroom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STUDENT JOURNEY SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
            <span className="label-academic gold">The Arc of Growth</span>
            <h2 style={{ marginTop: '0.4rem', marginBottom: '0.85rem' }}>
              The Mentra Student Journey
            </h2>
            <p>
              Education is not a series of disconnected tests. It is an intentional progression from nascent curiosity to accomplished leadership.
            </p>
          </div>

          {/* 6-Stage Journey Flow */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              position: 'relative',
            }}
          >
            {[
              {
                step: '01',
                title: 'Learn',
                desc: 'Acquiring theoretical rigor, research disciplines, and technical foundations.',
              },
              {
                step: '02',
                title: 'Connect',
                desc: 'Engaging peer cohorts, cross-department colleagues, and faculty mentors.',
              },
              {
                step: '03',
                title: 'Build',
                desc: 'Translating concepts into tangible prototypes, codebases, and case studies.',
              },
              {
                step: '04',
                title: 'Share',
                desc: 'Publishing milestones, peer reviews, and departmental symposium presentations.',
              },
              {
                step: '05',
                title: 'Discover',
                desc: 'Identifying specialized niches, emerging research inquiries, and campus needs.',
              },
              {
                step: '06',
                title: 'Grow',
                desc: 'Evolving into verified senior mentors, project captains, and collegiate leaders.',
              },
            ].map((phase) => (
              <div
                key={phase.title}
                style={{
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem 1.25rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-terracotta)',
                    letterSpacing: '0.05em',
                    marginBottom: '0.4rem',
                  }}
                >
                  PHASE {phase.step}
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  {phase.title}
                </h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  {phase.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMMUNITY SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-dark-surface)', color: 'var(--text-on-dark)' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '3.5rem' }}>
            <div>
              <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)' }}>
                Departmental Cohorts
              </span>
              <h2 style={{ color: 'var(--text-on-dark)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                Cross-disciplinary fellowship without institutional silos.
              </h2>
              <p style={{ color: 'var(--text-on-dark-secondary)', marginBottom: '1.75rem', lineHeight: '1.7' }}>
                True breakthroughs happen at the intersection of disciplines. At Mentra, computer scientists collaborate with product designers, and management scholars partner with software architects.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'rgba(197, 164, 109, 0.15)', color: 'var(--color-warm-gold)', padding: '0.35rem', borderRadius: '4px' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-on-dark)', fontSize: '0.95rem' }}>B.Tech & BCA:</strong>
                    <span style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.9rem', marginLeft: '0.35rem' }}>
                      Systems architecture, high-performance computing, distributed databases, and robotics.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'rgba(197, 164, 109, 0.15)', color: 'var(--color-warm-gold)', padding: '0.35rem', borderRadius: '4px' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-on-dark)', fontSize: '0.95rem' }}>B.Des:</strong>
                    <span style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.9rem', marginLeft: '0.35rem' }}>
                      Human-computer interaction, cognitive ergonomics, spatial systems, and typographic craft.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'rgba(197, 164, 109, 0.15)', color: 'var(--color-warm-gold)', padding: '0.35rem', borderRadius: '4px' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-on-dark)', fontSize: '0.95rem' }}>BBA:</strong>
                    <span style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.9rem', marginLeft: '0.35rem' }}>
                      Financial viability, venture ethics, supply resilience, and institutional strategy.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-primary-dark)',
                border: '1px solid var(--border-on-dark)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem',
              }}
            >
              <span className="label-academic subtle" style={{ color: 'var(--text-on-dark-secondary)' }}>
                Academic Cohort Statistics
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.5rem' }}>
                <div>
                  <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-warm-gold)' }}>
                    4 Core
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-on-dark-secondary)' }}>
                    Departments interconnected across collegiate tracks
                  </div>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border-on-dark)' }} />
                <div>
                  <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-warm-ivory)' }}>
                    100%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-on-dark-secondary)' }}>
                    Student-led, mentor-reviewed project registry
                  </div>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border-on-dark)' }} />
                <div>
                  <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-terracotta)' }}>
                    0 Social Noise
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-on-dark-secondary)' }}>
                    No vanity metrics, algorithmic feeds, or distractions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MENTORSHIP SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div style={{ maxWidth: '640px', marginBottom: '3rem' }}>
            <span className="label-academic terracotta">Verified Mentorship</span>
            <h2 style={{ marginTop: '0.4rem', marginBottom: '0.85rem' }}>
              Scholarly guidance with accountability.
            </h2>
            <p>
              Mentra takes mentorship seriously. Mentor credentials are not self-assigned or vanity badges; they are officially reviewed by campus academic authorities.
            </p>
          </div>

          <div className="grid-3">
            <div className="card-academic">
              <div style={{ color: 'var(--color-terracotta)', marginBottom: '0.75rem' }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Verified Status</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Mentors are vetted by collegiate committees. Students receive advice from qualified faculty and senior researchers who uphold academic ethics.
              </p>
            </div>

            <div className="card-academic">
              <div style={{ color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>
                <GraduationCap size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Project Review</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Mentors provide constructive critique on student projects, technical architectural choices, and methodology rather than superficial praise.
              </p>
            </div>

            <div className="card-academic">
              <div style={{ color: 'var(--color-warm-gold)', marginBottom: '0.75rem' }}>
                <Compass size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Journey Stewardship</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Mentors assist students in navigating milestone checkpoints, advising on career research, academic publishing, and graduate pursuits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PROJECTS SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory-light)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ maxWidth: '580px' }}>
              <span className="label-academic charcoal">Student Projects</span>
              <h2 style={{ marginTop: '0.4rem', marginBottom: '0.5rem' }}>
                Substantive work, recorded for posterity.
              </h2>
              <p>
                From distributed systems to human-centered design frameworks, explore what students are building inside the Mentra community.
              </p>
            </div>
            <Link to="/projects" className="btn btn-secondary btn-sm">
              <span>View All Projects</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid-3">
            <div className="card-academic">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge-dept terracotta">B.Tech</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Research Initiative</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Campus Microgrid Load Predictor
              </h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Predictive telemetry system utilizing edge sensor arrays to optimize power distribution across academic halls during peak seminar hours.
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Engineering &bull; 3 Contributors
              </div>
            </div>

            <div className="card-academic">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge-dept">B.Des</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Spatial Design</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Accessible Academic Archival Interface
              </h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                A typographic and navigational system engineered for neurodiverse university scholars reading long-form historic manuscripts.
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Design Systems &bull; 2 Contributors
              </div>
            </div>

            <div className="card-academic">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge-dept gold">BBA & BCA</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enterprise Prototype</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Cooperative Campus Textbook Exchange
              </h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                A zero-fee circular distribution ledger allowing students to bequeath course literature and academic tools directly to incoming junior cohorts.
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Management &bull; 4 Contributors
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. OPPORTUNITIES SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '3.5rem' }}>
            <div>
              <span className="label-academic gold">Opportunities</span>
              <h2 style={{ marginTop: '0.4rem', marginBottom: '1rem' }}>
                Merit-based doors opened through tangible work.
              </h2>
              <p style={{ marginBottom: '1.5rem', lineHeight: '1.7' }}>
                Opportunities at Mentra arise organically from the projects you author and the journey milestones you document.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)' }} />
                  <span><strong>Departmental Research Grants:</strong> Faculty-supported project funding.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)' }} />
                  <span><strong>Peer Apprenticeships:</strong> Junior scholars shadowing senior capstones.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-terracotta)' }} />
                  <span><strong>Symposium Invitations:</strong> Presenting findings to academic visiting committees.</span>
                </li>
              </ul>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem',
              }}
            >
              <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>
                The Fellowship Ethos
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                "We believe student achievement should be demonstrated by rigorous research, sustained contribution, and shared knowledge — not performative algorithms."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--color-soft-beige)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={18} style={{ color: 'var(--color-terracotta)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Collegiate Academic Charter
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mentra Academic Advisory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRUST SECTION */}
      <section className="section" style={{ backgroundColor: 'var(--color-dark-surface-2)', color: 'var(--text-on-dark)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem auto' }}>
            <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)' }}>
              Institutional Trust
            </span>
            <h2 style={{ color: 'var(--text-on-dark)', marginTop: '0.4rem', marginBottom: '0.75rem' }}>
              Engineered for academic integrity.
            </h2>
            <p style={{ color: 'var(--text-on-dark-secondary)' }}>
              Mentra refuses the practices of consumer social media. Our architecture is designed for serious collegiate focus.
            </p>
          </div>

          <div className="grid-3">
            <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
              <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                Zero Vanity Metrics
              </h4>
              <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
                No like counters, popularity feeds, or dopamine-driven algorithms. Recognition is earned through peer review and mentor verification.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
              <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                Institutional Verification
              </h4>
              <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
                Mentors cannot self-verify. Mentor credentials undergo institutional review by academic administrators before badges are conferred.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
              <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                Privacy & Rigor
              </h4>
              <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
                Your academic journey is treated as your intellectual portfolio, safeguarded by row-level security and campus-first ethics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. HOW MENTRA WORKS */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
            <span className="label-academic terracotta">Getting Started</span>
            <h2 style={{ marginTop: '0.4rem', marginBottom: '0.75rem' }}>
              How Mentra works.
            </h2>
            <p>
              Joining the collegiate community takes three simple, purposeful steps.
            </p>
          </div>

          <div className="grid-3">
            <div style={{ borderLeft: '2px solid var(--color-terracotta)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-terracotta)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Step One
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.45rem' }}>Register with your Cohort</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Create your student or mentor profile with your college department (B.Tech, B.Des, BBA, or BCA).
              </p>
            </div>

            <div style={{ borderLeft: '2px solid var(--color-warm-gold)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warm-gold)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Step Two
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.45rem' }}>Inaugurate Projects</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Publish your research hypothesis, technical builds, or design explorations to the campus registry.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid var(--color-primary-dark)', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Step Three
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.45rem' }}>Document Your Journey</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Log milestones through the 6 stages (Learn → Connect → Build → Share → Discover → Grow).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section
        style={{
          backgroundColor: 'var(--color-primary-dark)',
          color: 'var(--color-warm-ivory)',
          padding: '5rem 0',
          textAlign: 'center',
          borderTop: '1px solid var(--border-on-dark)',
        }}
      >
        <div className="container container-narrow">
          <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)', marginBottom: '1rem' }}>
            Academic Invitation
          </span>
          <h2
            style={{
              color: 'var(--color-warm-ivory)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: '1rem',
            }}
          >
            Begin your journey at Mentra today.
          </h2>
          <p
            style={{
              color: 'var(--text-on-dark-secondary)',
              fontSize: '1.1rem',
              marginBottom: '2.5rem',
              maxWidth: '540px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Step into a collegiate fellowship of students, mentors, and collaborative innovation.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-terracotta" style={{ padding: '0.8rem 1.85rem', fontSize: '1rem' }}>
              <span>Join Mentra</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-dark-outline" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }}>
              Member Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

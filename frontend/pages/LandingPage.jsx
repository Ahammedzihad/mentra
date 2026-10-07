import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Users,
  FolderGit2,
  ShieldCheck,
  Check,
  ArrowRight,
  BookOpen,
  Award
} from 'lucide-react';

import heroIllustration from '../assets/extracted/hero_illustration_hd.jpg';
import discoverIllustration from '../assets/extracted/discover_illustration_hd.jpg';
import buildIllustration from '../assets/extracted/build_illustration_hd.jpg';
import growIllustration from '../assets/extracted/grow_illustration_hd.jpg';
import projectGreenSpaces from '../assets/extracted/project_green_spaces_hd.jpg';
import projectStoriesStone from '../assets/extracted/project_stories_stone_hd.jpg';
import collabIllustration from '../assets/extracted/collaboration_illustration_hd.jpg';
import mentorIllustration from '../assets/extracted/mentorship_illustration_hd.jpg';
import personalAiIllustration from '../assets/extracted/personal_ai_illustration_hd.jpg';
import ctaCampusIllustration from '../assets/extracted/cta_campus_illustration_hd.jpg';

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
          <div
            className="hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              gap: '3.5rem',
              alignItems: 'center',
            }}
          >
            {/* Left Content */}
            <div>
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

            {/* Right Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={heroIllustration}
                alt="Student looking toward collegiate bell tower under terracotta sun"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  height: 'auto',
                  display: 'block',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. MENTRA ECOSYSTEM / THREE-STAGE INTRO */}
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

          <div
            className="three-cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
            }}
          >
            {/* Card 1: Contextual Learning */}
            <div
              className="card-academic"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={discoverIllustration}
                alt="Contextual Learning - Discover ideas"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ color: 'var(--color-terracotta)', marginBottom: '0.75rem' }}>
                  <BookOpen size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Contextual Learning</h3>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                  Bridging syllabus fundamentals with active projects. Learning ceases to be isolated exam preparation and becomes cumulative craft.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <Link
                    to="/discover"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>FIND YOUR SPARK</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Verified Faculty & Mentors */}
            <div
              className="card-academic"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={buildIllustration}
                alt="Verified Faculty & Mentors - Build projects"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ color: 'var(--color-warm-gold)', marginBottom: '0.75rem' }}>
                  <Users size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Verified Faculty & Mentors</h3>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                  Direct access to professors and recognized advisors without arbitrary barriers. Structured guidance grounded in academic integrity.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <Link
                    to="/projects"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>BRING IDEAS TO LIFE</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3: Collaborative Projects */}
            <div
              className="card-academic"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={growIllustration}
                alt="Collaborative Projects - Grow learning"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>
                  <FolderGit2 size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Collaborative Projects</h3>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                  Interdisciplinary teams uniting designers, engineers, and strategists on substantive initiatives that exist beyond the classroom.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <Link
                    to="/journey"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>BE A STRONGER YOU</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
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

      {/* 4. STUDENT PROJECTS SHOWCASE */}
      <section
        className="section"
        style={{
          backgroundColor: 'var(--color-warm-ivory-light)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1.5rem',
              marginBottom: '3rem',
            }}
          >
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

          <div
            className="projects-cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.75rem',
            }}
          >
            {/* Project 1: Campus Green Spaces Mapping */}
            <div
              className="card-academic"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={projectGreenSpaces}
                alt="Campus Green Spaces Mapping project thumbnail"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge-dept terracotta">B.Tech</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sustainability</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  Campus Green Spaces Mapping
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem', flex: 1 }}>
                  A student-led project to map and better understand underutilized green spaces on campus, optimizing communal eco-learning habitats.
                </p>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <Link
                    to="/projects"
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>View project</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Project 2: Stories in Stone */}
            <div
              className="card-academic"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={projectStoriesStone}
                alt="Stories in Stone project thumbnail"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge-dept">B.Des</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Arts & Culture</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                  Stories in Stone
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem', flex: 1 }}>
                  A visual storytelling project exploring the historic narratives and typographic nuances embedded within classical campus architecture.
                </p>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <Link
                    to="/projects"
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>View project</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Project 3: Cooperative Campus Textbook Exchange */}
            <div
              className="card-academic"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge-dept gold">BBA & BCA</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enterprise Prototype</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Cooperative Campus Textbook Exchange
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem', flex: 1 }}>
                A zero-fee circular distribution ledger allowing students to bequeath course literature and academic tools directly to incoming junior cohorts.
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Management &bull; 4 Contributors</span>
                <Link
                  to="/projects"
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--color-terracotta)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>View project</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COLLABORATION & MENTORSHIP SIDE-BY-SIDE */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div
            className="collab-mentor-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            {/* Card 1: Collaboration */}
            <div
              className="split-feature-card"
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                alignItems: 'stretch',
              }}
            >
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-terracotta)',
                    marginBottom: '0.5rem',
                  }}
                >
                  COLLABORATION
                </div>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.85rem', lineHeight: 1.25 }}
                >
                  Ideas grow stronger together.
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
                  Find collaborators, contribute your skills, and work on projects that matter &mdash; with peers who share your drive to create positive collegiate change.
                </p>
                <div>
                  <Link
                    to="/discover"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>EXPLORE COLLABORATION</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
              <div style={{ display: 'flex', height: '100%' }}>
                <img
                  src={collabIllustration}
                  alt="Students collaborating at a work table"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

            {/* Card 2: Mentorship */}
            <div
              className="split-feature-card"
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                alignItems: 'stretch',
              }}
            >
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-terracotta)',
                    marginBottom: '0.5rem',
                  }}
                >
                  VERIFIED MENTORSHIP
                </div>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.85rem', lineHeight: 1.25 }}
                >
                  Learn from real experience.
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
                  Connect with mentors who offer guidance, fresh perspectives, and practical advice for your academic and career journey.
                </p>
                <div>
                  <Link
                    to="/mentors"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: 'var(--color-terracotta)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>BROWSE MENTORS</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
              <div style={{ display: 'flex', height: '100%' }}>
                <img
                  src={mentorIllustration}
                  alt="Mentor conversing with student"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMMUNITY & DEPARTMENTAL COHORTS */}
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

      {/* 7. PERSONAL AI */}
      <section className="section" style={{ backgroundColor: 'var(--color-warm-ivory)' }}>
        <div className="container">
          <div
            className="personal-ai-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              gap: '3.5rem',
              alignItems: 'center',
            }}
          >
            {/* Left Content */}
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-terracotta)',
                  marginBottom: '1rem',
                }}
              >
                PERSONAL AI
              </div>

              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                  fontWeight: 600,
                  color: 'var(--color-primary-dark)',
                  lineHeight: 1.2,
                  marginBottom: '1.25rem',
                  letterSpacing: '-0.02em',
                }}
              >
                A thoughtful assistant<br />for your journey.
              </h2>

              <p
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  marginBottom: '2.25rem',
                  maxWidth: '480px',
                }}
              >
                Get help exploring project ideas, clarifying your goals and reflecting on what you're learning. Personal AI is designed to support your thinking &mdash; not replace it.
              </p>

              <div>
                <Link
                  to="/ai"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <span>TRY PERSONAL AI</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Right Desk Note Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={personalAiIllustration}
                alt="Workspace desk notepad with reflection points, fountain pen and houseplant"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  height: 'auto',
                  display: 'block',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
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

      {/* 9. FINAL CTA (WITH CAMPUS ILLUSTRATION) */}
      <section
        style={{
          padding: '4.5rem 0 5.5rem 0',
          backgroundColor: 'var(--color-warm-ivory)',
        }}
      >
        <div className="container">
          <div
            className="final-cta-card"
            style={{
              backgroundColor: 'var(--color-primary-dark)',
              border: '1px solid var(--border-on-dark)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1.15fr',
              alignItems: 'center',
            }}
          >
            {/* Left Campus Tower Sunset Illustration */}
            <div style={{ height: '100%', minHeight: '340px' }}>
              <img
                src={ctaCampusIllustration}
                alt="Collegiate campus bell tower at sunset"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '100%', minHeight: '340px', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Right Content */}
            <div style={{ padding: '3.5rem 3rem' }}>
              <span
                className="label-academic gold"
                style={{
                  color: 'var(--color-warm-gold)',
                  marginBottom: '0.65rem',
                  display: 'inline-block',
                }}
              >
                ACADEMIC INVITATION
              </span>

              <h2
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.5rem)',
                  fontWeight: 600,
                  color: 'var(--color-warm-ivory)',
                  lineHeight: 1.25,
                  marginBottom: '1rem',
                  letterSpacing: '-0.015em',
                }}
              >
                Begin your journey at Mentra today.
              </h2>

              <p
                style={{
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  color: 'var(--text-on-dark-secondary)',
                  marginBottom: '2rem',
                  maxWidth: '480px',
                }}
              >
                Step into a collegiate fellowship of students, mentors, and collaborative innovation. Document your milestones and build meaningful work.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  alignItems: 'center',
                }}
              >
                <Link
                  to="/signup"
                  className="btn btn-terracotta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.8rem 1.85rem',
                    fontSize: '0.95rem',
                  }}
                >
                  <span>Join Mentra</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/login"
                  className="btn btn-dark-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.8rem 1.65rem',
                    fontSize: '0.95rem',
                  }}
                >
                  Member Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Breakpoints Style Tag */}
      <style>{`
        @media (max-width: 992px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .three-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .projects-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .collab-mentor-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .personal-ai-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .final-cta-card {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .split-feature-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

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
      </section >

  {/* 2. MENTRA ECOSYSTEM / THREE-STAGE INTRO */ }
  < section id = "ecosystem" className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory-light)' }}>
    <div className="container">
      <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
        <span className="label-academic terracotta">The Mentra Ecosystem</span>
        <h2 style={{ marginTop: '0.4rem', marginBottom: '0.85rem' }}>
          From learning to meaningful work.
        </h2>
        <p>
          Mentra brings learning, people, and projects closer together, helping students connect what they learn with what they create.
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
      </section >

  {/* 3. STUDENT JOURNEY SECTION */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory)' }}>
    <div className="container">
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
        <span className="label-academic gold">The Arc of Growth</span>
        <h2 style={{ marginTop: '0.4rem', marginBottom: '0.85rem' }}>
          From curiosity to contribution.
        </h2>
        <p>
          College is more than a series of exams. It is a journey of learning, connecting, building, sharing, discovering, and growing.
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
            desc: 'Build your academic foundations, explore new ideas, and develop essential skills.',
          },
          {
            step: '02',
            title: 'Connect',
            desc: 'Meet peers, exchange perspectives, and discover opportunities to work together.',
          },
          {
            step: '03',
            title: 'Build',
            desc: 'Turn ideas into projects, prototypes, research, and practical work.',
          },
          {
            step: '04',
            title: 'Share',
            desc: 'Document your progress, share your work, and learn from constructive feedback.',
          },
          {
            step: '05',
            title: 'Discover',
            desc: 'Explore new interests, identify meaningful problems, and find your next direction.',
          },
          {
            step: '06',
            title: 'Grow',
            desc: 'Strengthen your skills, reflect on your progress, and take on new challenges.',
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
      </section >

  {/* 4. STUDENT PROJECTS SHOWCASE */ }
  < section
className = "section"
style = {{
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
      </section >

  {/* 5. COLLABORATION & MENTORSHIP SIDE-BY-SIDE */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory)' }}>
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
      </section >

  {/* 6. COMMUNITY & DEPARTMENTAL COHORTS */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-dark-surface)', color: 'var(--text-on-dark)' }}>
    <div className="container">
      <div className="grid-2" style={{ alignItems: 'center', gap: '3.5rem' }}>
        <div>
          <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)' }}>
            Departmental Cohorts
          </span>
          <h2 style={{ color: 'var(--text-on-dark)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            Different disciplines. Shared ambition.
          </h2>
          <p style={{ color: 'var(--text-on-dark-secondary)', marginBottom: '1.75rem', lineHeight: '1.7' }}>
            Meaningful projects can bring together different perspectives, skills, and ways of thinking.
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
      </section >

  {/* 7. PERSONAL AI */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory)' }}>
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
      </section >

  {/* 6. PROJECTS SECTION */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory-light)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
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
      </section >

  {/* 7. OPPORTUNITIES SECTION */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-warm-ivory)' }}>
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
      </section >

  {/* 8. TRUST SECTION */ }
  < section className = "section" style = {{ backgroundColor: 'var(--color-dark-surface-2)', color: 'var(--text-on-dark)' }}>
    <div className="container">
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem auto' }}>
        <span className="label-academic gold" style={{ color: 'var(--color-warm-gold)' }}>
          Institutional Trust
        </span>
        <h2 style={{ color: 'var(--text-on-dark)', marginTop: '0.4rem', marginBottom: '0.75rem' }}>
          Built for meaningful work, not vanity metrics.
        </h2>
        <p style={{ color: 'var(--text-on-dark-secondary)' }}>
          Mentra is designed to emphasize learning, substantive contributions, and constructive collaboration rather than popularity contests.
        </p>
      </div>

      <div className="grid-3">
        <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
          <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
            Zero Vanity Metrics
          </h4>
          <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
            Focus on meaningful work and contribution rather than likes, popularity, or social comparison.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
          <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
            Institutional Verification
          </h4>
          <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
            Mentor credibility and academic recognition should be grounded in genuine qualifications and appropriate review.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--color-dark-surface)', border: '1px solid var(--border-on-dark)', padding: '1.75rem', borderRadius: 'var(--radius-sm)' }}>
          <h4 className="font-serif" style={{ color: 'var(--color-warm-ivory)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
            Privacy & Rigor
          </h4>
          <p style={{ color: 'var(--text-on-dark-secondary)', fontSize: '0.875rem' }}>
            Student work deserves thoughtful handling, responsible access, and respect for academic integrity.
          </p>
        </div>
      </div>
    </div>
      </section >

  {/* 9. FINAL CTA (WITH CAMPUS ILLUSTRATION) */ }
  < section
style = {{
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

{/* 10. FINAL CTA */ }
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

{/* Responsive Breakpoints Style Tag */ }
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
    </div >
  );
};

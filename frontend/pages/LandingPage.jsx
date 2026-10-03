import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
    <div style={{ width: '100%', backgroundColor: '#FAF7F2' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          padding: '4.5rem 0 4rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.08fr 1fr',
              gap: '3.5rem',
              alignItems: 'center',
            }}
            className="hero-grid"
          >
            {/* Left Content */}
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A84B2B',
                  marginBottom: '1.25rem',
                }}
              >
                A MORE CONNECTED COLLEGIATE EXPERIENCE
              </div>

              <h1
                className="font-serif"
                style={{
                  fontSize: 'clamp(2.5rem, 5vw, 3.85rem)',
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: '#171513',
                  marginBottom: '1.35rem',
                  letterSpacing: '-0.025em',
                }}
              >
                Make your college<br />journey count.
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: '#5A534C',
                  marginBottom: '2.25rem',
                  maxWidth: '520px',
                }}
              >
                Connect with students, explore meaningful projects, and document your learning and growth — all in one place.
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
                  to="/projects"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#A84B2B',
                    border: '1px solid #A84B2B',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Explore projects</span>
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    color: '#171513',
                    backgroundColor: '#FAF7F2',
                    border: '1px solid #DED4C4',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Start your journey
                </Link>
              </div>

              {/* Tag strip */}
              <div
                style={{
                  marginTop: '2.75rem',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  fontWeight: 500,
                  color: '#847C73',
                  textTransform: 'uppercase',
                }}
              >
                &mdash; IDEAS &nbsp; PEOPLE &nbsp; PROJECTS &nbsp; GROWTH
              </div>
            </div>

            {/* Right Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={heroIllustration}
                alt="Student looking toward collegiate bell tower under terracotta sun with handwritten notes"
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE-STAGE INTRO */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem auto' }}>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                color: '#171513',
                marginBottom: '0.85rem',
                letterSpacing: '-0.015em',
              }}
            >
              From curiosity to contribution
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: '#5A534C',
              }}
            >
              Mentra Collegiate helps you turn your interests into real projects, meaningful connections and lasting growth throughout your academic journey.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
            }}
            className="three-cards-grid"
          >
            {/* Card 1: Discover */}
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EBE4D8',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={discoverIllustration}
                alt="Discover ideas illustration"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.35rem', fontWeight: 600, color: '#171513', marginBottom: '0.5rem' }}
                >
                  Discover
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#5A534C', lineHeight: 1.55, marginBottom: '1.5rem', flex: 1 }}>
                  Explore ideas, projects and people across disciplines.
                </p>
                <div>
                  <Link
                    to="/discover"
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#A84B2B',
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

            {/* Card 2: Build */}
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EBE4D8',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={buildIllustration}
                alt="Build ideas illustration"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.35rem', fontWeight: 600, color: '#171513', marginBottom: '0.5rem' }}
                >
                  Build
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#5A534C', lineHeight: 1.55, marginBottom: '1.5rem', flex: 1 }}>
                  Turn your ideas into projects with support from peers and mentors.
                </p>
                <div>
                  <Link
                    to="/projects"
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#A84B2B',
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

            {/* Card 3: Grow */}
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EBE4D8',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <img
                src={growIllustration}
                alt="Grow learning illustration"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.35rem', fontWeight: 600, color: '#171513', marginBottom: '0.5rem' }}
                >
                  Grow
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#5A534C', lineHeight: 1.55, marginBottom: '1.5rem', flex: 1 }}>
                  Document your learning, reflect on your progress and take what you've built further.
                </p>
                <div>
                  <Link
                    to="/journey"
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#A84B2B',
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

      {/* 3. STUDENT PROJECTS SHOWCASE */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.05fr 2fr',
              gap: '3.5rem',
              alignItems: 'start',
            }}
            className="projects-showcase-grid"
          >
            {/* Left Header Column */}
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A84B2B',
                  marginBottom: '1rem',
                }}
              >
                STUDENT PROJECTS
              </div>

              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                  fontWeight: 600,
                  color: '#171513',
                  lineHeight: 1.2,
                  marginBottom: '1.15rem',
                  letterSpacing: '-0.02em',
                }}
              >
                See what students<br />are building.
              </h2>

              <p
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.65,
                  color: '#5A534C',
                  marginBottom: '2rem',
                  maxWidth: '360px',
                }}
              >
                Explore a diverse range of student projects, from research and creative work to real-world solutions. Get inspired, find collaborators and see what's possible.
              </p>

              <div>
                <Link
                  to="/projects"
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: '#A84B2B',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>BROWSE ALL PROJECTS</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Cards Column */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.75rem',
              }}
              className="projects-cards-grid"
            >
              {/* Project Card 1: Sustainability */}
              <div
                style={{
                  backgroundColor: '#FAF7F2',
                  border: '1px solid #EBE4D8',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <img
                  src={projectGreenSpaces}
                  alt="Campus Green Spaces Mapping project thumbnail"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: '#A84B2B',
                      textTransform: 'uppercase',
                      marginBottom: '0.45rem',
                    }}
                  >
                    SUSTAINABILITY
                  </div>
                  <h3
                    className="font-serif"
                    style={{ fontSize: '1.15rem', fontWeight: 600, color: '#171513', marginBottom: '0.5rem' }}
                  >
                    Campus Green Spaces Mapping
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#5A534C', lineHeight: 1.55, marginBottom: '1.25rem', flex: 1 }}>
                    A student-led project to map and better understand underutilized green spaces on campus.
                  </p>
                  <div>
                    <Link
                      to="/projects"
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 500,
                        color: '#A84B2B',
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

              {/* Project Card 2: Arts & Culture */}
              <div
                style={{
                  backgroundColor: '#FAF7F2',
                  border: '1px solid #EBE4D8',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <img
                  src={projectStoriesStone}
                  alt="Stories in Stone project thumbnail"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: '#A84B2B',
                      textTransform: 'uppercase',
                      marginBottom: '0.45rem',
                    }}
                  >
                    ARTS &amp; CULTURE
                  </div>
                  <h3
                    className="font-serif"
                    style={{ fontSize: '1.15rem', fontWeight: 600, color: '#171513', marginBottom: '0.5rem' }}
                  >
                    Stories in Stone
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#5A534C', lineHeight: 1.55, marginBottom: '1.25rem', flex: 1 }}>
                    A visual storytelling project exploring the histories and hidden narratives behind campus architecture.
                  </p>
                  <div>
                    <Link
                      to="/projects"
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 500,
                        color: '#A84B2B',
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
          </div>
        </div>
      </section>

      {/* 4. THE MENTRA JOURNEY */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '3.75rem',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A84B2B',
                  marginBottom: '0.5rem',
                }}
              >
                THE MENTRA JOURNEY
              </div>
              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
                  fontWeight: 600,
                  color: '#171513',
                  letterSpacing: '-0.015em',
                }}
              >
                A simple path, a bigger tomorrow.
              </h2>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#5A534C',
                lineHeight: 1.6,
                maxWidth: '380px',
              }}
            >
              Move from exploration to real-world impact with a structured journey designed for your growth.
            </p>
          </div>

          {/* 6-Step Timeline */}
          <div style={{ position: 'relative' }}>
            {/* Horizontal connecting line behind circles */}
            <div
              style={{
                position: 'absolute',
                top: '18px',
                left: '20px',
                right: '20px',
                height: '1px',
                backgroundColor: '#DED4C4',
                zIndex: 1,
              }}
              className="timeline-guide-line"
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '1.25rem',
                position: 'relative',
                zIndex: 2,
              }}
              className="timeline-steps-grid"
            >
              {/* Step 1 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#C9BAA7',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  1
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Learn
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Explore interests and new perspectives.
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#C25E3E',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  2
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Connect
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Meet peers, mentors and collaborators.
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#8B9474',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  3
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Build
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Turn ideas into meaningful projects.
                </div>
              </div>

              {/* Step 4 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#C99752',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  4
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Share
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Showcase your work and get feedback.
                </div>
              </div>

              {/* Step 5 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#52796F',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  5
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Discover
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Find new opportunities and paths.
                </div>
              </div>

              {/* Step 6 */}
              <div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#A47E65',
                    color: '#FAF7F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  6
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171513', marginBottom: '0.35rem' }}>
                  Grow
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5A534C', lineHeight: 1.5 }}>
                  Reflect, build on your experience and take the next step.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COLLABORATION & MENTORSHIP SIDE-BY-SIDE */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
            className="collab-mentor-grid"
          >
            {/* Card 1: Collaboration */}
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EBE4D8',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                alignItems: 'stretch',
              }}
              className="split-feature-card"
            >
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#A84B2B',
                    marginBottom: '0.5rem',
                  }}
                >
                  COLLABORATION
                </div>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.4rem', fontWeight: 600, color: '#171513', marginBottom: '0.85rem', lineHeight: 1.25 }}
                >
                  Ideas grow stronger together.
                </h3>
                <p style={{ fontSize: '0.835rem', color: '#5A534C', lineHeight: 1.6, marginBottom: '1.75rem', flex: 1 }}>
                  Find collaborators, contribute your skills and work on projects that matter &mdash; with people who share your drive to create positive change.
                </p>
                <div>
                  <Link
                    to="/discover"
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#A84B2B',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

            {/* Card 2: Mentorship */}
            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EBE4D8',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                alignItems: 'stretch',
              }}
              className="split-feature-card"
            >
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#A84B2B',
                    marginBottom: '0.5rem',
                  }}
                >
                  MENTORSHIP
                </div>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.4rem', fontWeight: 600, color: '#171513', marginBottom: '0.85rem', lineHeight: 1.25 }}
                >
                  Learn from real experience.
                </h3>
                <p style={{ fontSize: '0.835rem', color: '#5A534C', lineHeight: 1.6, marginBottom: '1.75rem', flex: 1 }}>
                  Connect with mentors who offer guidance, fresh perspectives and practical advice for your academic and career journey.
                </p>
                <div>
                  <Link
                    to="/mentors"
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#A84B2B',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OUR PRINCIPLES (DARK SECTION) */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#1F1E1B',
          color: '#FAF7F2',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '4rem',
              flexWrap: 'wrap',
              gap: '2rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9E978C',
                  marginBottom: '0.65rem',
                }}
              >
                OUR PRINCIPLES
              </div>
              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
                  fontWeight: 500,
                  color: '#FAF7F2',
                  lineHeight: 1.2,
                  maxWidth: '480px',
                  letterSpacing: '-0.015em',
                }}
              >
                Built for meaningful work, not vanity metrics.
              </h2>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#B8B2A7',
                lineHeight: 1.65,
                maxWidth: '440px',
                marginTop: '1rem',
              }}
            >
              Mentra Collegiate is designed to support thoughtful exploration, genuine collaboration and long-term growth &mdash; not followers, likes or superficial popularity.
            </p>
          </div>

          {/* 4 Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2.5rem',
            }}
            className="principles-columns-grid"
          >
            {/* Principle 1 */}
            <div>
              <div style={{ color: '#D4A373', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAF7F2', marginBottom: '0.65rem' }}>
                Meaningful work
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#9E978C', lineHeight: 1.6 }}>
                We celebrate original ideas, thoughtful projects and real learning over surface-level achievements.
              </p>
            </div>

            {/* Principle 2 */}
            <div>
              <div style={{ color: '#D4A373', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAF7F2', marginBottom: '0.65rem' }}>
                Privacy respect
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#9E978C', lineHeight: 1.6 }}>
                Your data and content are treated with care and used only to support your experience on Mentra.
              </p>
            </div>

            {/* Principle 3 */}
            <div>
              <div style={{ color: '#D4A373', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAF7F2', marginBottom: '0.65rem' }}>
                Credible feedback
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#9E978C', lineHeight: 1.6 }}>
                Get thoughtful input from peers and mentors to strengthen your ideas and growth.
              </p>
            </div>

            {/* Principle 4 */}
            <div>
              <div style={{ color: '#D4A373', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAF7F2', marginBottom: '0.65rem' }}>
                Academic collaboration
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#9E978C', lineHeight: 1.6 }}>
                A space built for constructive discussion, knowledge sharing and real academic exploration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PERSONAL AI */}
      <section
        style={{
          padding: '5rem 0',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(222, 212, 196, 0.6)',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center',
            }}
            className="personal-ai-grid"
          >
            {/* Left Content */}
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A84B2B',
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
                  color: '#171513',
                  lineHeight: 1.2,
                  marginBottom: '1.25rem',
                  letterSpacing: '-0.02em',
                }}
              >
                A thoughtful assistant<br />for your journey.
              </h2>

              <p
                style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.65,
                  color: '#5A534C',
                  marginBottom: '2.25rem',
                  maxWidth: '460px',
                }}
              >
                Get help exploring project ideas, clarifying your goals and reflecting on what you're learning. Personal AI is designed to support your thinking &mdash; not replace it.
              </p>

              <div>
                <Link
                  to="/ai"
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: '#A84B2B',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>TRY PERSONAL AI</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Desk Note Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={personalAiIllustration}
                alt="Workspace desk notepad with reflection points, fountain pen and houseplant"
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section
        style={{
          padding: '4rem 0 5rem 0',
          backgroundColor: '#FAF7F2',
        }}
      >
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              backgroundColor: '#F5EFEB',
              border: '1px solid #EBE4D8',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1.15fr',
              alignItems: 'center',
            }}
            className="final-cta-card"
          >
            {/* Left Campus Tower Sunset Illustration */}
            <div style={{ height: '100%' }}>
              <img
                src={ctaCampusIllustration}
                alt="Collegiate campus bell tower at sunset"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Right Content */}
            <div style={{ padding: '3.5rem 3rem' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A84B2B',
                  marginBottom: '0.65rem',
                }}
              >
                A BRIGHTER TOMORROW
              </div>

              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.35rem)',
                  fontWeight: 600,
                  color: '#171513',
                  lineHeight: 1.25,
                  marginBottom: '1rem',
                  letterSpacing: '-0.015em',
                }}
              >
                Your next step starts here.
              </h2>

              <p
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: '#5A534C',
                  marginBottom: '2rem',
                  maxWidth: '460px',
                }}
              >
                Explore projects, meet inspiring people and make your college journey more meaningful with Mentra Collegiate.
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
                  to="/projects"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#A84B2B',
                    border: '1px solid #A84B2B',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Explore projects</span>
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#171513',
                    backgroundColor: '#FAF7F2',
                    border: '1px solid #DED4C4',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Join now
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
          .projects-showcase-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .collab-mentor-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .principles-columns-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2rem !important;
          }
          .personal-ai-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .final-cta-card {
            grid-template-columns: 1fr !important;
          }
          .timeline-guide-line {
            display: none !important;
          }
          .timeline-steps-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1.75rem !important;
          }
        }
        @media (max-width: 600px) {
          .projects-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .split-feature-card {
            grid-template-columns: 1fr !important;
          }
          .principles-columns-grid {
            grid-template-columns: 1fr !important;
            gap: 1.75rem !important;
          }
          .timeline-steps-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CANONICAL_PROGRAMS,
  PROGRAM_SPECIALIZATIONS,
  isValidSpecialization,
} from '../../frontend/lib/academicPrograms.js';
import {
  fetchDiscoverData,
  filterPeople,
  filterProjects,
} from './discoverService.js';
import {
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Users,
  FolderGit2,
  Compass,
} from 'lucide-react';

const KNOWN_YEAR_ORDER = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];

/**
 * Extracts distinct non-empty Year options from loaded People and Project owner profiles,
 * preserving known collegiate progression ordering.
 *
 * @param {Array<Object>} people
 * @param {Array<Object>} projects
 * @returns {Array<string>}
 */
function extractYearOptions(people = [], projects = []) {
  const years = new Set();
  for (const person of people) {
    if (person && typeof person.year === 'string') {
      const trimmed = person.year.trim();
      if (trimmed) years.add(trimmed);
    }
  }
  for (const project of projects) {
    const owner = Array.isArray(project?.profiles)
      ? project.profiles[0]
      : (project?.profiles || project?.profile || {});
    if (owner && typeof owner.year === 'string') {
      const trimmed = owner.year.trim();
      if (trimmed) years.add(trimmed);
    }
  }
  return Array.from(years).sort((a, b) => {
    const idxA = KNOWN_YEAR_ORDER.indexOf(a);
    const idxB = KNOWN_YEAR_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Mentra Phase 5 Step 3, Subcategory 2 — Discover Page Shell & Controls
 *
 * Provides collegiate discovery search and multi-criteria filtering across authenticated
 * directory records and project owner profiles:
 * - Plain-text search over people full_name and project titles/tags
 * - Tag filter derived from RLS-authorized projects (availableTags)
 * - Canonical Program & Specialization selection with dependent reset
 * - Distinct Year selection derived from loaded collegiate profile records
 * - Accessible matching People and Project count summary
 */
export function DiscoverPage() {
  // Unfiltered datasets returned by the RLS-authorized service
  const [rawPeople, setRawPeople] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // Page lifecycle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filter controls
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [program, setProgram] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [year, setYear] = useState('');

  // Stale request / unmount guard
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchDiscoverData();
      if (currentRequestId === requestIdRef.current) {
        setRawPeople(data.people || []);
        setRawProjects(data.projects || []);
        setAvailableTags(data.availableTags || []);
        setLoading(false);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Unable to retrieve collegiate discovery records.');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      requestIdRef.current++;
    };
  }, [loadData]);

  // Derived Year options from loaded data (distinct non-empty values)
  const yearOptions = useMemo(() => {
    return extractYearOptions(rawPeople, rawProjects);
  }, [rawPeople, rawProjects]);

  // Derived Specialization options based on selected Program
  const specializationOptions = useMemo(() => {
    if (program) {
      return PROGRAM_SPECIALIZATIONS[program] || [];
    }
    // Without program selected: show all unique canonical specializations
    return Array.from(new Set(Object.values(PROGRAM_SPECIALIZATIONS).flat()));
  }, [program]);

  // Program change handler: clears Specialization only if invalid for new Program
  const handleProgramChange = (e) => {
    const newProgram = e.target.value;
    setProgram(newProgram);

    if (newProgram && specialization) {
      if (!isValidSpecialization(newProgram, specialization)) {
        setSpecialization('');
      }
    }
  };

  // Reset all active filters
  const handleClearFilters = () => {
    setSearch('');
    setTag('');
    setProgram('');
    setSpecialization('');
    setYear('');
  };

  const hasActiveFilters = Boolean(search || tag || program || specialization || year);

  // Filter existing rows in-memory using committed production helpers
  const matchingPeople = useMemo(() => {
    return filterPeople(rawPeople, {
      search,
      program,
      specialization,
      year,
    });
  }, [rawPeople, search, program, specialization, year]);

  const matchingProjects = useMemo(() => {
    return filterProjects(rawProjects, {
      search,
      tag,
      program,
      specialization,
      year,
    });
  }, [rawProjects, search, tag, program, specialization, year]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header Shell */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Compass size={20} style={{ color: 'var(--color-primary-dark)' }} />
          <span className="label-academic">Collegiate Directory</span>
        </div>
        <h1 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
          Discover
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', lineHeight: '1.6' }}>
          Explore campus talent and academic projects. Search across peer profiles, project titles, and tags,
          or filter by canonical program, specialization, and year level.
        </p>
      </div>

      {/* Error state with retry */}
      {error && !loading && (
        <div
          role="alert"
          className="notice-box error"
          style={{
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span id="discover-error-message">{error}</span>
          </div>
          <button
            type="button"
            id="discover-retry-btn"
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Search and Filters Panel */}
      <div className="card-academic" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--color-primary-dark)' }} />
            <h2 className="font-serif" style={{ fontSize: '1.2rem', margin: 0 }}>
              Search & Filters
            </h2>
          </div>
          <button
            type="button"
            id="discover-clear-filters-btn"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: hasActiveFilters ? 1 : 0.6,
              cursor: hasActiveFilters ? 'pointer' : 'default',
            }}
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="discover-search-input"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
          >
            Search
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="discover-search-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people by name, or projects by title or tag..."
              aria-label="Search people by name, projects by title or tag"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                fontSize: '0.925rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface, #fff)',
                color: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Tag Filter */}
          <div>
            <label
              htmlFor="discover-tag-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
            >
              Tag
            </label>
            <select
              id="discover-tag-select"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              aria-label="Filter by Tag"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface, #fff)',
                color: 'inherit',
              }}
            >
              <option value="">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Program Filter */}
          <div>
            <label
              htmlFor="discover-program-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
            >
              Program
            </label>
            <select
              id="discover-program-select"
              value={program}
              onChange={handleProgramChange}
              aria-label="Filter by Academic Program"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface, #fff)',
                color: 'inherit',
              }}
            >
              <option value="">All Programs</option>
              {CANONICAL_PROGRAMS.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization Filter */}
          <div>
            <label
              htmlFor="discover-specialization-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
            >
              Specialization
            </label>
            <select
              id="discover-specialization-select"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              aria-label="Filter by Academic Specialization"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface, #fff)',
                color: 'inherit',
              }}
            >
              <option value="">All Specializations</option>
              {specializationOptions.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label
              htmlFor="discover-year-select"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
            >
              Year
            </label>
            <select
              id="discover-year-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Filter by Academic Year"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface, #fff)',
                color: 'inherit',
              }}
            >
              <option value="">All Years</option>
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div
          role="status"
          id="discover-loading-indicator"
          className="card-academic"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--color-primary-dark)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Loading collegiate discovery directory...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Accessible Matching Counts Summary (Pre-Card Subcategory) */}
      {!loading && !error && (
        <div
          id="discover-results-summary"
          role="status"
          aria-live="polite"
          className="card-academic"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 className="font-serif" style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>
              Directory Matches
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              {hasActiveFilters
                ? 'Filtered results matching your active search and criteria.'
                : 'Current collegiate directory records available in your college network.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--color-primary-dark)' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Matching People:</span>
              <strong id="discover-people-count" style={{ fontSize: '1.15rem' }}>
                {matchingPeople.length}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderGit2 size={18} style={{ color: 'var(--color-terracotta)' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Matching Projects:</span>
              <strong id="discover-projects-count" style={{ fontSize: '1.15rem' }}>
                {matchingProjects.length}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;

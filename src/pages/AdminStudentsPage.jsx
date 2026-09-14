import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import {
  GraduationCap,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';

const COURSE_CATEGORIES = [
  { id: 'All', label: 'All Students' },
  { id: 'B.Tech', label: 'B.Tech' },
  { id: 'B.Des', label: 'B.Des' },
  { id: 'BBA', label: 'BBA' },
  { id: 'BCA', label: 'BCA' },
  { id: 'MCA', label: 'MCA' },
  { id: 'MBA', label: 'MBA' },
  { id: 'Other', label: 'Other' },
];

const YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];
const STANDARD_BATCHES = ['2022-2026', '2023-2027', '2024-2028', '2025-2029', '2026-2030'];

const normalizeCourse = (courseStr) => {
  if (!courseStr) return '';
  return courseStr.trim().toLowerCase().replace(/[\s.]/g, '');
};

const getStudentCourseCategory = (student) => {
  const raw = (student.course || student.department || '').trim();
  const norm = normalizeCourse(raw);

  if (norm === 'btech' || norm.includes('engineering')) return 'B.Tech';
  if (norm === 'bdes' || norm.includes('design')) return 'B.Des';
  if (norm === 'bba' || norm.includes('business')) return 'BBA';
  if (norm === 'bca') return 'BCA';
  if (norm === 'mca') return 'MCA';
  if (norm === 'mba') return 'MBA';
  return 'Other';
};

const getInitials = (name) => {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AdminStudentsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const initialCourse = searchParams.get('course') || 'All';
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');

  const fetchStudents = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query profiles with role = 'student'
      // Safe collegiate fields only; email is excluded to protect student PII
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, full_name, department, course, year, batch, role, is_verified, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching student roster:', err);
      setError('Unable to load student roster. Please verify connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Sync course selection with searchParams if set externally (e.g. from AdminLayout)
  useEffect(() => {
    const courseParam = searchParams.get('course');
    if (courseParam) {
      const validCategory = COURSE_CATEGORIES.some((c) => c.id.toLowerCase() === courseParam.toLowerCase());
      if (validCategory) {
        const matched = COURSE_CATEGORIES.find((c) => c.id.toLowerCase() === courseParam.toLowerCase());
        setSelectedCourse(matched ? matched.id : 'All');
      }
    } else {
      setSelectedCourse('All');
    }
  }, [searchParams]);

  // Handle course category pill clicks
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    if (courseId === 'All') {
      searchParams.delete('course');
    } else {
      searchParams.set('course', courseId);
    }
    setSearchParams(searchParams);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCourse('All');
    setSelectedDept('All');
    setSelectedYear('All');
    setSelectedBatch('All');
    searchParams.delete('course');
    setSearchParams(searchParams);
  };

  // Extract unique departments for dropdown
  const departments = useMemo(() => {
    return ['All', ...new Set(
      students
        .map((s) => s.department)
        .filter((d) => Boolean(d && d.trim()))
    )].sort();
  }, [students]);

  // Extract batch options (dynamic + standard)
  const batchOptions = useMemo(() => {
    const recordedBatches = students
      .map((s) => s.batch)
      .filter((b) => Boolean(b && b.trim()));
    const combined = Array.from(new Set([...recordedBatches, ...STANDARD_BATCHES])).sort();
    return ['All', ...combined];
  }, [students]);

  // Calculate live count per course category
  const courseCounts = useMemo(() => {
    const counts = {
      All: students.length,
      'B.Tech': 0,
      'B.Des': 0,
      BBA: 0,
      BCA: 0,
      MCA: 0,
      MBA: 0,
      Other: 0,
    };

    students.forEach((s) => {
      const cat = getStudentCourseCategory(s);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts.Other += 1;
      }
    });

    return counts;
  }, [students]);

  // Combined filtering: Course, Search, Department, Year, and Batch work together
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const name = (student.full_name || '').toLowerCase();
      const dept = (student.department || '').toLowerCase();
      const rawCourse = (student.course || student.department || '');
      const studentCat = getStudentCourseCategory(student);
      const year = (student.year || '').toLowerCase();
      const batch = (student.batch || '').trim();
      const id = (student.id || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      // 1. Course Filter (Clicking a course shows ONLY students belonging to that course)
      let matchesCourse = true;
      if (selectedCourse !== 'All') {
        if (selectedCourse === 'Other') {
          matchesCourse = studentCat === 'Other';
        } else {
          matchesCourse = studentCat.toLowerCase() === selectedCourse.toLowerCase();
        }
      }

      // 2. Search Query Filter (Matches name, ID, department, course, year, or batch)
      const matchesSearch =
        !query ||
        name.includes(query) ||
        dept.includes(query) ||
        rawCourse.toLowerCase().includes(query) ||
        studentCat.toLowerCase().includes(query) ||
        year.includes(query) ||
        batch.toLowerCase().includes(query) ||
        id.includes(query);

      // 3. Department Filter
      const matchesDept =
        selectedDept === 'All' ||
        (student.department && student.department.toLowerCase() === selectedDept.toLowerCase());

      // 4. Year Filter
      const matchesYear =
        selectedYear === 'All' ||
        (student.year && student.year.toLowerCase() === selectedYear.toLowerCase());

      // 5. Batch Filter
      const matchesBatch =
        selectedBatch === 'All' ||
        (student.batch && student.batch.trim() === selectedBatch);

      // All filters must work together
      return matchesCourse && matchesSearch && matchesDept && matchesYear && matchesBatch;
    });
  }, [students, selectedCourse, searchQuery, selectedDept, selectedYear, selectedBatch]);

  const hasActiveFilters =
    searchQuery ||
    selectedCourse !== 'All' ||
    selectedDept !== 'All' ||
    selectedYear !== 'All' ||
    selectedBatch !== 'All';

  return (
    <AdminLayout activeTab="students">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="label-academic terracotta">Student Body Directory</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                &bull; {students.length} Total Enrolled
              </span>
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: '2rem',
                color: 'var(--color-primary-dark)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Collegiate Students Directory
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                marginTop: '0.35rem',
                maxWidth: '650px',
              }}
            >
              Review all registered student scholars, filter by academic course, department, year level, and graduating batch cohorts.
            </p>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Course Categories Selection Bar */}
        <div
          style={{
            marginBottom: '1.5rem',
            backgroundColor: 'var(--surface-primary)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Course Category Filter</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-terracotta)', textTransform: 'none', fontWeight: 500 }}>
              {selectedCourse === 'All' ? 'Showing All Enrolled Programs' : `Showing Only ${selectedCourse} Students`}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {COURSE_CATEGORIES.map((cat) => {
              const isSelected = selectedCourse === cat.id;
              const count = courseCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCourseChange(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: isSelected ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--color-primary-dark)' : 'var(--color-warm-ivory)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-primary-dark)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory)';
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'var(--color-terracotta)' : 'var(--surface-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Filter Bar: Search, Department, Year, Batch */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-primary)',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div>
            <label
              htmlFor="student-search-input"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="student-search-input"
                type="text"
                placeholder="Name, ID, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: '2.35rem',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label
              htmlFor="student-dept-select"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Department
            </label>
            <select
              id="student-dept-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field"
              style={{
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
              }}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label
              htmlFor="student-year-select"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Academic Year
            </label>
            <select
              id="student-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field"
              style={{
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y === 'All' ? 'All Academic Years' : y}
                </option>
              ))}
            </select>
          </div>

          {/* Graduating Batch Filter */}
          <div>
            <label
              htmlFor="student-batch-select"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              Graduating Batch
            </label>
            <select
              id="student-batch-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="input-field"
              style={{
                fontSize: '0.85rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
              }}
            >
              {batchOptions.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Batches' : `Cohort ${b}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Active Filters:
            </span>
            {selectedCourse !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-terracotta-subtle)',
                  color: 'var(--color-terracotta)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: 600,
                }}
              >
                Course: {selectedCourse}
                <button
                  type="button"
                  onClick={() => handleCourseChange('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedDept !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Dept: {selectedDept}
                <button
                  type="button"
                  onClick={() => setSelectedDept('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedYear !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Year: {selectedYear}
                <button
                  type="button"
                  onClick={() => setSelectedYear('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedBatch !== 'All' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Batch: {selectedBatch}
                <button
                  type="button"
                  onClick={() => setSelectedBatch('All')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Query: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-terracotta)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.15rem 0.35rem',
              }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--color-terracotta-subtle)',
              border: '1px solid var(--color-terracotta)',
              color: 'var(--color-terracotta)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        {/* Results Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredStudents.length}</strong> of {students.length} collegiate students
            {selectedCourse !== 'All' && (
              <span> enrolled in <strong>{selectedCourse}</strong></span>
            )}
          </div>
        </div>

        {/* Student Table View */}
        {loading ? (
          <div
            className="card"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading collegiate student roster...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <GraduationCap size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              {selectedCourse !== 'All'
                ? `No Students in ${selectedCourse}`
                : 'No Students Match Filter Criteria'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
              {selectedCourse !== 'All'
                ? `There are currently no student records registered under the ${selectedCourse} degree program matching your active filters.`
                : 'No student records matched your current query, department, year, or cohort filters.'}
            </p>
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div
            className="card"
            style={{
              backgroundColor: 'var(--surface-primary)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0,0,0,0.015)',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Profile & Student Scholar
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Course Program
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Department
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Year & Cohort
                    </th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Account Status
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Enrolled Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, idx) => {
                    const enrolledDate = student.created_at
                      ? new Date(student.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A';

                    const resolvedCourse = getStudentCourseCategory(student);
                    const courseDisplay = student.course || resolvedCourse;
                    const initials = getInitials(student.full_name);

                    return (
                      <tr
                        key={student.id}
                        style={{
                          borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Profile Photo & Student Scholar */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-dark)',
                                color: 'var(--color-warm-ivory)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: '0.925rem' }}>
                                {student.full_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                                ID: {student.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Course Category */}
                        <td style={{ padding: '1rem' }}>
                          <span
                            className="badge-dept terracotta"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              fontWeight: 600,
                            }}
                          >
                            {courseDisplay}
                          </span>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{student.department || 'General Studies'}</span>
                          </div>
                        </td>

                        {/* Year & Batch */}
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {student.year || 'Undergraduate'}
                          </div>
                          {student.batch ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-terracotta)', marginTop: '0.1rem', fontWeight: 500 }}>
                              Cohort {student.batch}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              Cohort unassigned
                            </div>
                          )}
                        </td>

                        {/* Account & Verification Status */}
                        <td style={{ padding: '1rem' }}>
                          {student.is_verified ? (
                            <span
                              className="badge-dept gold"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <ShieldCheck size={12} />
                              <span>Verified Scholar</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface-secondary)',
                                color: 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <CheckCircle2 size={12} style={{ color: '#2E7D32' }} />
                              <span>Active Student</span>
                            </span>
                          )}
                        </td>

                        {/* Enrolled Date */}
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} />
                            <span>{enrolledDate}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: 'rgba(0,0,0,0.01)',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                Displaying <strong>{filteredStudents.length}</strong> matching scholars
                {selectedCourse !== 'All' ? ` in ${selectedCourse}` : ''}
              </span>
              <span>All student records protected under institutional PII governance</span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

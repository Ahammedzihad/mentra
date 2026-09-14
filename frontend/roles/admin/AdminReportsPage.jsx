import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle2,
  Building2,
  GraduationCap,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLogTab, setActiveLogTab] = useState('all');

  // Aggregated platform stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalMentors: 0,
    verifiedMentors: 0,
    pendingMentors: 0,
    totalProjects: 0,
    courseDistribution: {},
    deptDistribution: {},
  });

  // Recent audit items derived from live database
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchReportData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch profiles (excluding email to protect PII)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, department, course, year, is_verified, created_at');

      if (pErr) throw pErr;

      // 2. Fetch projects count and info
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, title, department, created_at');

      if (projErr) throw projErr;

      const allProfiles = profiles || [];
      const allProjects = projects || [];

      const students = allProfiles.filter((p) => p.role === 'student');
      const mentors = allProfiles.filter((p) => p.role === 'mentor');
      const verifiedM = mentors.filter((m) => m.is_verified === true);
      const pendingM = mentors.filter((m) => !m.is_verified);

      // Course breakdown
      const courses = {};
      students.forEach((s) => {
        const c = s.course || 'Unassigned';
        courses[c] = (courses[c] || 0) + 1;
      });

      // Department breakdown
      const depts = {};
      allProfiles.forEach((p) => {
        const d = p.department || 'General Academic';
        depts[d] = (depts[d] || 0) + 1;
      });

      setStats({
        totalStudents: students.length,
        totalMentors: mentors.length,
        verifiedMentors: verifiedM.length,
        pendingMentors: pendingM.length,
        totalProjects: allProjects.length,
        courseDistribution: courses,
        deptDistribution: depts,
      });

      // Construct live institutional audit logs
      const generatedLogs = [];

      // Pending mentor verifications require action
      pendingM.forEach((m) => {
        generatedLogs.push({
          id: `verify-req-${m.id}`,
          timestamp: m.created_at || new Date().toISOString(),
          category: 'verification',
          status: 'pending_action',
          severity: 'warning',
          title: `Faculty Credential Verification Pending`,
          description: `${m.full_name || 'Faculty Member'} (${m.department || 'General Academic'}) requested mentor authorization. Institutional identity check required.`,
          link: '/admin/mentors',
          linkLabel: 'Review Application',
        });
      });

      // Verified mentors
      verifiedM.forEach((m) => {
        generatedLogs.push({
          id: `verify-ok-${m.id}`,
          timestamp: m.created_at || new Date().toISOString(),
          category: 'verification',
          status: 'resolved',
          severity: 'success',
          title: `Faculty Mentor Verified`,
          description: `${m.full_name} granted verified mentorship status in ${m.department || 'the institution'}.`,
        });
      });

      // Project submissions
      allProjects.slice(0, 10).forEach((proj) => {
        generatedLogs.push({
          id: `proj-${proj.id}`,
          timestamp: proj.created_at || new Date().toISOString(),
          category: 'project',
          status: 'logged',
          severity: 'info',
          title: `Project Registered: ${proj.title}`,
          description: `New academic submission added to ${proj.department || 'Collegiate Registry'}.`,
          link: '/admin/projects',
          linkLabel: 'Inspect Project',
        });
      });

      // Sort logs by timestamp descending
      generatedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAuditLogs(generatedLogs);
    } catch (err) {
      console.error('Error fetching institutional reports:', err);
      setError(err.message || 'Unable to load report telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export CSV summary
  const handleExportCSV = () => {
    const csvRows = [
      ['Institutional Analytics & Accreditation Report - Mentra'],
      ['Generated Date', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Registered Students', stats.totalStudents],
      ['Total Faculty Mentors', stats.totalMentors],
      ['Verified Faculty Mentors', stats.verifiedMentors],
      ['Pending Mentor Approvals', stats.pendingMentors],
      ['Total Academic Projects', stats.totalProjects],
      [],
      ['Course Breakdown (Students)', 'Enrollment Count'],
      ...Object.entries(stats.courseDistribution).map(([course, count]) => [course, count]),
      [],
      ['Department Breakdown (Total Scholars)', 'Count'],
      ...Object.entries(stats.deptDistribution).map(([dept, count]) => [dept, count]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((row) => row.map((field) => `"${field}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mentra_institutional_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    if (activeLogTab === 'all') return true;
    if (activeLogTab === 'action_required') return log.status === 'pending_action';
    if (activeLogTab === 'verification') return log.category === 'verification';
    if (activeLogTab === 'project') return log.category === 'project';
    return true;
  });

  return (
    <AdminLayout activeTab="reports">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="label-academic terracotta">Governance & Compliance</span>
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
              Institutional Reports & Moderation
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                marginTop: '0.35rem',
                maxWidth: '650px',
              }}
            >
              Platform telemetry, academic integrity moderation logs, departmental enrollment statistics, and official audit exports for accreditation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Printer size={14} />
              <span>Print Brief</span>
            </button>
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

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
            <AlertTriangle size={20} />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        {/* Section 1: Institutional Health Metrics */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3
            className="font-serif"
            style={{
              fontSize: '1.25rem',
              color: 'var(--color-primary-dark)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Activity size={18} style={{ color: 'var(--color-terracotta)' }} />
            <span>Platform Health & Governance Indices</span>
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-primary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Scholars Enrolled
              </div>
              <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: '0.25rem' }}>
                {stats.totalStudents}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Across {Object.keys(stats.courseDistribution).length} degree programs
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-primary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Faculty Verification Rate
              </div>
              <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: '0.25rem' }}>
                {stats.totalMentors > 0
                  ? `${Math.round((stats.verifiedMentors / stats.totalMentors) * 100)}%`
                  : 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {stats.verifiedMentors} of {stats.totalMentors} mentors credentialed
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-primary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Faculty-to-Student Ratio
              </div>
              <div className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: '0.25rem' }}>
                {stats.verifiedMentors > 0
                  ? `1 : ${Math.round(stats.totalStudents / stats.verifiedMentors)}`
                  : stats.totalStudents > 0
                  ? `1 : ${stats.totalStudents}`
                  : '1 : 0'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Based on active verified faculty
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-primary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Pending Action Items
              </div>
              <div
                className="font-serif"
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  color: stats.pendingMentors > 0 ? 'var(--color-terracotta)' : '#2e7d32',
                  marginTop: '0.25rem',
                }}
              >
                {stats.pendingMentors}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Faculty applications awaiting audit
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Department & Program Breakdown Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Degree Program Breakdown */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-primary)' }}>
            <h4
              className="font-serif"
              style={{
                fontSize: '1.1rem',
                color: 'var(--color-primary-dark)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <GraduationCap size={18} style={{ color: 'var(--color-terracotta)' }} />
              <span>Student Enrollment by Course</span>
            </h4>

            {Object.keys(stats.courseDistribution).length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No student course data recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(stats.courseDistribution).map(([course, count]) => {
                  const pct = stats.totalStudents > 0 ? Math.round((count / stats.totalStudents) * 100) : 0;
                  return (
                    <div key={course}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{course}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--surface-secondary)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: 'var(--color-terracotta)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Distribution */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-primary)' }}>
            <h4
              className="font-serif"
              style={{
                fontSize: '1.1rem',
                color: 'var(--color-primary-dark)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Building2 size={18} style={{ color: '#8C6A30' }} />
              <span>Affiliation by Academic Department</span>
            </h4>

            {Object.keys(stats.deptDistribution).length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No departmental data recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(stats.deptDistribution).map(([dept, count]) => {
                  const total = stats.totalStudents + stats.totalMentors;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{dept}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--surface-secondary)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: '#8C6A30',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Audit Trail & Moderation Queue */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h3
              className="font-serif"
              style={{
                fontSize: '1.25rem',
                color: 'var(--color-primary-dark)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ShieldCheck size={18} style={{ color: 'var(--color-terracotta)' }} />
              <span>Institutional Audit & Moderation Queue</span>
            </h3>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--surface-primary)', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveLogTab('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: activeLogTab === 'all' ? 600 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeLogTab === 'all' ? 'var(--color-primary-dark)' : 'transparent',
                  color: activeLogTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                All Entries ({auditLogs.length})
              </button>
              <button
                onClick={() => setActiveLogTab('action_required')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: activeLogTab === 'action_required' ? 600 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeLogTab === 'action_required' ? 'var(--color-terracotta)' : 'transparent',
                  color: activeLogTab === 'action_required' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Action Required ({stats.pendingMentors})
              </button>
              <button
                onClick={() => setActiveLogTab('verification')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: activeLogTab === 'verification' ? 600 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeLogTab === 'verification' ? 'var(--color-primary-dark)' : 'transparent',
                  color: activeLogTab === 'verification' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Faculty Verification
              </button>
              <button
                onClick={() => setActiveLogTab('project')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: activeLogTab === 'project' ? 600 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeLogTab === 'project' ? 'var(--color-primary-dark)' : 'transparent',
                  color: activeLogTab === 'project' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Submissions
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface-primary)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: '#2e7d32', margin: '0 auto 0.75rem auto' }} />
              <h4 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--color-primary-dark)', marginBottom: '0.35rem' }}>
                All Institutional Logs Clear
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                No flagged events or outstanding actions in this category.
              </p>
            </div>
          ) : (
            <div
              className="card"
              style={{
                backgroundColor: 'var(--surface-primary)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '1.15rem 1.25rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor:
                            log.severity === 'warning'
                              ? 'var(--color-terracotta-subtle)'
                              : log.severity === 'success'
                              ? '#E8F5E9'
                              : 'var(--surface-secondary)',
                          color:
                            log.severity === 'warning'
                              ? 'var(--color-terracotta)'
                              : log.severity === 'success'
                              ? '#2E7D32'
                              : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '0.1rem',
                        }}
                      >
                        {log.severity === 'warning' ? (
                          <AlertTriangle size={17} />
                        ) : log.severity === 'success' ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <Clock size={17} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary-dark)' }}>
                            {log.title}
                          </span>
                          <span
                            className={`badge-dept ${log.severity === 'warning' ? 'terracotta' : log.severity === 'success' ? 'gold' : ''}`}
                            style={{ fontSize: '0.65rem', padding: '0.08rem 0.35rem' }}
                          >
                            {log.status === 'pending_action' ? 'Action Required' : log.status === 'resolved' ? 'Approved' : 'Logged'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {dateStr}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
                          {log.description}
                        </p>
                      </div>

                      {log.link && (
                        <div style={{ flexShrink: 0 }}>
                          <Link to={log.link} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                            {log.linkLabel || 'Inspect'}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

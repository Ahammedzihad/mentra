import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  CANONICAL_PROGRAMS,
  isValidProgram,
  isValidSpecialization,
  getSpecializationsForProgram,
} from '../../frontend/lib/academicPrograms';

const CANONICAL_YEARS = Object.freeze([
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
]);

/**
 * EditProfileModal component for Phase 5 Step 2.
 * Allows authenticated scholars to update their academic identity (name, program,
 * specialization, year, and bio) while strictly isolating role and verification status.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is visible
 * @param {() => void} props.onClose - Dismiss callback (cleans up and closes without mutation)
 * @param {(updatedProfile: Object) => void} [props.onProfileUpdated] - Success callback with saved profile
 */
export const EditProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { profile, updateProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [program, setProgram] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const initializedForOpenRef = React.useRef(false);

  // Initialize form state from existing profile when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!initializedForOpenRef.current && profile) {
        setFullName(profile.full_name || '');
        setProgram(profile.program || profile.department || '');
        setSpecialization(profile.specialization || '');
        setYear(profile.year || '');
        setBio(profile.bio || '');
        setError(null);
        setSuccess(false);
        initializedForOpenRef.current = true;
      }
    } else {
      initializedForOpenRef.current = false;
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, profile]);

  // Handle ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  // Available specializations dynamically mapped to chosen canonical program
  const availableSpecializations = program ? getSpecializationsForProgram(program) : [];

  // Changing program resets specialization immediately
  const handleProgramChange = (e) => {
    const nextProgram = e.target.value;
    setProgram(nextProgram);
    setSpecialization('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Please provide your full legal or academic name.');
      return;
    }

    if (!program) {
      setError('Please select your academic program.');
      return;
    }

    if (!isValidProgram(program)) {
      setError('Please select a valid canonical academic program.');
      return;
    }

    const trimmedSpec = specialization.trim();
    if (trimmedSpec && !isValidSpecialization(program, trimmedSpec)) {
      setError('The selected specialization is not valid for your chosen program.');
      return;
    }

    const trimmedYear = year ? year.trim() : '';
    if (trimmedYear && !CANONICAL_YEARS.includes(trimmedYear)) {
      setError('Please select a valid academic year level.');
      return;
    }

    setLoading(true);

    try {
      const result = await updateProfile({
        fullName: trimmedName,
        program,
        specialization: trimmedSpec || null,
        year: year ? year.trim() : null,
        bio: bio ? bio.trim() : null,
      });

      setSuccess(true);
      setTimeout(() => {
        if (onProfileUpdated) {
          onProfileUpdated(result.data);
        }
        setSuccess(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error updating academic profile:', err);
      setError(err?.message || 'Failed to update academic profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div className="modal-dialog" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <div>
            <span className="label-academic terracotta">Collegiate Identity</span>
            <h3 id="edit-profile-title" style={{ marginTop: '0.2rem' }}>
              Edit Academic Profile
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="notice-box error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="notice-box success" role="status" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>Academic profile updated successfully!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-profile-fullname">
              Full Legal or Academic Name <span className="req">*</span>
            </label>
            <input
              id="edit-profile-fullname"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              placeholder="e.g. Dr. Eleanor Vance or Marcus Sterling"
              required
              autoFocus
            />
          </div>

          {/* Academic Program */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-profile-program">
              Academic Program <span className="req">*</span>
            </label>
            <select
              id="edit-profile-program"
              className="form-input"
              value={program}
              onChange={handleProgramChange}
              disabled={loading}
              required
            >
              <option value="">Select Academic Program</option>
              {/* Preserve existing non-canonical value gracefully if present */}
              {program && !CANONICAL_PROGRAMS.includes(program) && (
                <option value={program} disabled>
                  {program} (Legacy / Non-canonical)
                </option>
              )}
              {CANONICAL_PROGRAMS.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Canonical degree programs ratified by academic registry.
            </span>
          </div>

          {/* Degree Specialization (Dependent) */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-profile-specialization">
              Degree Specialization
            </label>
            <select
              id="edit-profile-specialization"
              className="form-input"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              disabled={!program || loading}
            >
              <option value="">Select Specialization (Optional)</option>
              {/* Preserve existing non-canonical value gracefully if present */}
              {specialization && !availableSpecializations.includes(specialization) && (
                <option value={specialization} disabled>
                  {specialization} (Legacy / Unmatched)
                </option>
              )}
              {availableSpecializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              {!program
                ? 'Select an academic program first to view available specializations.'
                : 'Specialization is optional. You may leave this blank.'}
            </span>
          </div>

          {/* Academic Year Level */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-profile-year">
              Academic Year Level
            </label>
            <select
              id="edit-profile-year"
              className="form-input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Academic Year (Optional)</option>
              {year && !CANONICAL_YEARS.includes(year) && (
                <option value={year} disabled>
                  {year} (Legacy value)
                </option>
              )}
              {CANONICAL_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Biography / Research Interests */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="edit-profile-bio">
              Academic Biography & Research Interests
            </label>
            <textarea
              id="edit-profile-bio"
              className="form-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
              placeholder="Brief academic overview, research interests, collegiate affiliations..."
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Optional biography visible across collegiate collaborations and mentorship.
            </span>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Save size={15} />
              <span>{loading ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

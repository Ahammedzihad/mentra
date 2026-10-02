import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle2, Plus, Award } from 'lucide-react';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  CANONICAL_PROGRAMS,
  isValidProgram,
  isValidSpecialization,
  getSpecializationsForProgram,
} from '../../frontend/lib/academicPrograms';
import {
  validateSkillEntry,
  validateAchievementEntry,
  MAX_SKILLS_COUNT,
  MAX_SKILL_LENGTH,
  MAX_ACHIEVEMENTS_COUNT,
  MAX_ACHIEVEMENT_LENGTH,
} from '../../frontend/lib/profileSelfReported';

const CANONICAL_YEARS = Object.freeze([
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
]);

/**
 * EditProfileModal component for Phase 5.
 * Allows authenticated scholars to update their academic identity (name, program,
 * specialization, year, bio, and self-reported skills and achievements) while
 * strictly isolating role and verification status.
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
  const [skills, setSkills] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const [newSkill, setNewSkill] = useState('');
  const [newAchievement, setNewAchievement] = useState('');
  const [skillError, setSkillError] = useState(null);
  const [achievementError, setAchievementError] = useState(null);

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
        setSkills(Array.isArray(profile.skills) ? [...profile.skills] : []);
        setAchievements(Array.isArray(profile.achievements) ? [...profile.achievements] : []);
        setNewSkill('');
        setNewAchievement('');
        setSkillError(null);
        setAchievementError(null);
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

  const handleAddSkill = (candidate) => {
    const res = validateSkillEntry(candidate, skills);
    if (!res.valid) {
      if (res.error) setSkillError(res.error);
      return false;
    }
    setSkills((prev) => [...prev, res.cleaned]);
    setNewSkill('');
    setSkillError(null);
    return true;
  };

  const handleRemoveSkill = (indexToRemove) => {
    if (loading) return;
    setSkills((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setSkillError(null);
  };

  const handleAddAchievement = (candidate) => {
    const res = validateAchievementEntry(candidate, achievements);
    if (!res.valid) {
      if (res.error) setAchievementError(res.error);
      return false;
    }
    setAchievements((prev) => [...prev, res.cleaned]);
    setNewAchievement('');
    setAchievementError(null);
    return true;
  };

  const handleRemoveAchievement = (indexToRemove) => {
    if (loading) return;
    setAchievements((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setAchievementError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSkillError(null);
    setAchievementError(null);

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

    // Check pending un-added skill input
    let workingSkills = [...skills];
    if (newSkill.trim()) {
      const resSkill = validateSkillEntry(newSkill, skills);
      if (!resSkill.valid) {
        setSkillError(resSkill.error);
        return;
      }
      workingSkills.push(resSkill.cleaned);
    }

    // Check pending un-added achievement input
    let workingAchievements = [...achievements];
    if (newAchievement.trim()) {
      const resAch = validateAchievementEntry(newAchievement, achievements);
      if (!resAch.valid) {
        setAchievementError(resAch.error);
        return;
      }
      workingAchievements.push(resAch.cleaned);
    }

    setLoading(true);

    try {
      const result = await updateProfile({
        fullName: trimmedName,
        program,
        specialization: trimmedSpec || null,
        year: year ? year.trim() : null,
        bio: bio ? bio.trim() : null,
        skills: workingSkills,
        achievements: workingAchievements,
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
      <div className="modal-dialog" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
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

          {/* Skills (Self-Reported) */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <label
                htmlFor="edit-profile-skill-input"
                className="form-label"
                style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Skills</span>
                <span className="badge-dept" style={{ fontSize: '0.7rem' }}>
                  Self-Reported
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  (Optional)
                </span>
              </label>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: skills.length >= MAX_SKILLS_COUNT ? 'var(--color-terracotta, #b85d38)' : 'var(--text-muted)',
                  fontWeight: skills.length >= MAX_SKILLS_COUNT ? 600 : 400,
                }}
              >
                {skills.length} / {MAX_SKILLS_COUNT} skills
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '0.5rem', lineHeight: 1.4 }}>
              Self-reported technical and academic proficiencies (up to 15 entries, max 50 characters each). Not verified.
            </p>

            {/* Current Skills Chips */}
            {skills.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  marginBottom: '0.6rem',
                }}
                aria-label="Current self-reported skills"
              >
                {skills.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--color-soft-beige-light, #f4efe9)',
                      border: '1px solid var(--border-subtle, #e5ded5)',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: 'var(--color-primary-dark, #2b231d)',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      id={`remove-skill-${idx}`}
                      onClick={() => handleRemoveSkill(idx)}
                      disabled={loading}
                      aria-label={`Remove skill ${skill}`}
                      title={`Remove skill ${skill}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-muted, #7a6e65)',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Skill Input Row */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="edit-profile-skill-input"
                type="text"
                className="form-input"
                placeholder="e.g. React, Python, C++, Node.js"
                value={newSkill}
                onChange={(e) => {
                  setNewSkill(e.target.value);
                  setSkillError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(newSkill);
                  }
                }}
                disabled={loading || skills.length >= MAX_SKILLS_COUNT}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                id="btn-add-skill"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddSkill(newSkill)}
                disabled={loading || skills.length >= MAX_SKILLS_COUNT || !newSkill.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={14} />
                <span>Add Skill</span>
              </button>
            </div>

            {skillError && (
              <div
                className="notice-box error"
                role="alert"
                style={{ marginTop: '0.5rem', marginBottom: 0, padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{skillError}</span>
              </div>
            )}
          </div>

          {/* Achievements (Self-Reported) */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <label
                htmlFor="edit-profile-achievement-input"
                className="form-label"
                style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Achievements</span>
                <span className="badge-dept" style={{ fontSize: '0.7rem' }}>
                  Self-Reported
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  (Optional)
                </span>
              </label>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: achievements.length >= MAX_ACHIEVEMENTS_COUNT ? 'var(--color-terracotta, #b85d38)' : 'var(--text-muted)',
                  fontWeight: achievements.length >= MAX_ACHIEVEMENTS_COUNT ? 600 : 400,
                }}
              >
                {achievements.length} / {MAX_ACHIEVEMENTS_COUNT} achievements
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '0.5rem', lineHeight: 1.4 }}>
              Self-reported academic honors, hackathon victories, publications, or leadership roles (up to 10 entries, max 200 characters each). Not verified.
            </p>

            {/* Current Achievements List */}
            {achievements.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  marginBottom: '0.6rem',
                }}
                aria-label="Current self-reported achievements"
              >
                {achievements.map((ach, idx) => (
                  <div
                    key={`${ach}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      backgroundColor: 'var(--color-warm-ivory-light, #fbf9f6)',
                      border: '1px solid var(--border-subtle, #e5ded5)',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.825rem',
                      color: 'var(--color-primary-dark, #2b231d)',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', flex: 1 }}>
                      <Award size={15} style={{ color: 'var(--color-terracotta, #b85d38)', flexShrink: 0, marginTop: '0.15rem' }} />
                      <span>{ach}</span>
                    </div>
                    <button
                      type="button"
                      id={`remove-achievement-${idx}`}
                      onClick={() => handleRemoveAchievement(idx)}
                      disabled={loading}
                      aria-label={`Remove achievement ${ach}`}
                      title={`Remove achievement ${ach}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        padding: '0.15rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-muted, #7a6e65)',
                        flexShrink: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Achievement Input Row */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="edit-profile-achievement-input"
                type="text"
                className="form-input"
                placeholder="e.g. 1st Place - National Collegiate Hackathon 2026"
                value={newAchievement}
                onChange={(e) => {
                  setNewAchievement(e.target.value);
                  setAchievementError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAchievement(newAchievement);
                  }
                }}
                disabled={loading || achievements.length >= MAX_ACHIEVEMENTS_COUNT}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                id="btn-add-achievement"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddAchievement(newAchievement)}
                disabled={loading || achievements.length >= MAX_ACHIEVEMENTS_COUNT || !newAchievement.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={14} />
                <span>Add Achievement</span>
              </button>
            </div>

            {achievementError && (
              <div
                className="notice-box error"
                role="alert"
                style={{ marginTop: '0.5rem', marginBottom: 0, padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{achievementError}</span>
              </div>
            )}
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

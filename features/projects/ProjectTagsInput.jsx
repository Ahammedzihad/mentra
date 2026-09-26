import React, { useState } from 'react';
import { X, AlertCircle, Tag } from 'lucide-react';

/**
 * Validates and normalizes a candidate tag against Mentra Phase 4 Step 2 requirements:
 * 1. Trim leading and trailing whitespace
 * 2. Convert to lowercase
 * 3. Ignore empty/blank tags
 * 4. Reject tags exceeding 24 characters
 * 5. Enforce allowed characters: letters, numbers, spaces, hyphens (/^[a-z0-9 -]+$/)
 * 6. Reject normalized duplicates
 * 7. Enforce maximum of 6 tags
 */
export const validateAndNormalizeTag = (rawTag, currentTags = []) => {
  if (!rawTag) return { valid: false, ignored: true };
  const trimmed = rawTag.trim();
  if (!trimmed) return { valid: false, ignored: true };

  const normalized = trimmed.toLowerCase();

  if (normalized.length > 24) {
    return {
      valid: false,
      error: 'Tag cannot exceed 24 characters.',
    };
  }

  // Allowed: letters, numbers, spaces, hyphens
  if (!/^[a-z0-9 -]+$/.test(normalized)) {
    return {
      valid: false,
      error: 'Tags may only contain letters, numbers, spaces, and hyphens.',
    };
  }

  if (currentTags.includes(normalized)) {
    return {
      valid: false,
      error: 'This tag has already been added.',
    };
  }

  if (currentTags.length >= 6) {
    return {
      valid: false,
      error: 'Maximum 6 tags allowed per project.',
    };
  }

  return {
    valid: true,
    tag: normalized,
  };
};

export const ProjectTagsInput = ({
  tags = [],
  onChange,
  disabled = false,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [inputError, setInputError] = useState(null);

  const addTag = (candidate) => {
    const result = validateAndNormalizeTag(candidate, tags);

    if (result.ignored) {
      setInputVal('');
      return false;
    }

    if (!result.valid) {
      setInputError(result.error);
      return false;
    }

    setInputError(null);
    setInputVal('');
    if (onChange) {
      onChange([...tags, result.tag]);
    }
    return true;
  };

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Handle comma as a delimiter if typed or pasted
    if (value.includes(',')) {
      const parts = value.split(',');
      let workingTags = [...tags];
      let encounteredError = null;

      for (let i = 0; i < parts.length - 1; i++) {
        const res = validateAndNormalizeTag(parts[i], workingTags);
        if (res.ignored) continue;
        if (!res.valid) {
          encounteredError = res.error;
          break;
        }
        workingTags.push(res.tag);
      }

      if (workingTags.length !== tags.length && onChange) {
        onChange(workingTags);
      }

      const remainder = parts[parts.length - 1];
      setInputVal(remainder);

      if (encounteredError) {
        setInputError(encounteredError);
      } else {
        setInputError(null);
      }
      return;
    }

    setInputVal(value);
    if (inputError) {
      setInputError(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    if (disabled) return;
    const nextTags = tags.filter((_, idx) => idx !== indexToRemove);
    if (onChange) {
      onChange(nextTags);
    }
    setInputError(null);
  };

  const isAtLimit = tags.length >= 6;

  return (
    <div className="form-group" style={{ marginTop: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.4rem',
        }}
      >
        <label
          htmlFor="project-tags-input"
          className="form-label"
          style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Tag size={13} style={{ color: 'var(--text-muted)' }} />
          <span>Project Tags</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'var(--text-muted)',
              marginLeft: '0.25rem',
            }}
          >
            (Optional)
          </span>
        </label>
        <span
          style={{
            fontSize: '0.75rem',
            color: isAtLimit ? 'var(--color-terracotta)' : 'var(--text-muted)',
            fontWeight: isAtLimit ? 600 : 400,
          }}
        >
          {tags.length} / 6 tags
        </span>
      </div>

      {/* Render Chips */}
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginBottom: '0.55rem',
          }}
          aria-label="Current project tags"
        >
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--color-soft-beige-light)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.2rem 0.55rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--color-primary-dark)',
                maxWidth: '100%',
                wordBreak: 'break-word',
              }}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                disabled={disabled}
                aria-label={`Remove tag ${tag}`}
                title={`Remove tag ${tag}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  marginLeft: '0.1rem',
                  lineHeight: 1,
                  borderRadius: '2px',
                }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tag Input Field */}
      <input
        id="project-tags-input"
        type="text"
        className="form-input"
        placeholder={
          isAtLimit
            ? 'Maximum of 6 tags reached'
            : 'Type a tag and press Enter or comma...'
        }
        value={inputVal}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || isAtLimit}
        style={{
          width: '100%',
          backgroundColor: isAtLimit ? 'var(--color-warm-ivory-light)' : 'var(--color-white)',
          cursor: isAtLimit ? 'not-allowed' : 'text',
        }}
      />

      {/* Inline Validation Error */}
      {inputError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginTop: '0.4rem',
            color: '#8C2F20',
            fontSize: '0.78rem',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{inputError}</span>
        </div>
      )}
    </div>
  );
};

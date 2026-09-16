import React from 'react';
import { VISIBILITY_OPTIONS } from './projectVisibilityOptions';

export const ProjectVisibilitySelector = ({
  value = 'college',
  onChange,
  disabled = false,
}) => {
  return (
    <div className="form-group" style={{ marginTop: '1.25rem' }}>
      <label className="form-label">
        Project Visibility <span className="req">*</span>
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.65rem',
          marginTop: '0.35rem',
        }}
      >
        {VISIBILITY_OPTIONS.map((opt) => {
          const IconComponent = opt.icon;
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange && onChange(opt.id)}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: isSelected
                  ? '1.5px solid var(--color-primary-dark)'
                  : '1px solid var(--border-subtle)',
                backgroundColor: isSelected
                  ? 'var(--color-warm-ivory-light)'
                  : 'var(--color-white)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: disabled ? 0.7 : 1,
                transition:
                  'border-color var(--transition-fast), background-color var(--transition-fast)',
              }}
            >
              <div
                style={{
                  color: isSelected
                    ? 'var(--color-primary-dark)'
                    : 'var(--text-muted)',
                  marginTop: '0.1rem',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected
                      ? 'var(--color-primary-dark)'
                      : 'var(--text-primary)',
                    marginBottom: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-dark)',
                      }}
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.735rem',
                    lineHeight: '1.35',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

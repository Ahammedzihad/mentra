import React from 'react';
import { AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const ConfigNotice = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFF8EC',
        borderBottom: '1px solid #EADBBA',
        color: '#7C5819',
        padding: '0.65rem 1rem',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.65rem',
        textAlign: 'center',
      }}
    >
      <AlertCircle size={16} style={{ flexShrink: 0, color: '#B86F52' }} />
      <span>
        <strong>Supabase Setup Required:</strong> To enable live authentication and queries, configure{' '}
        <code style={{ background: '#F1E6CD', padding: '0.15rem 0.35rem', borderRadius: '3px' }}>
          VITE_SUPABASE_URL
        </code>{' '}
        and{' '}
        <code style={{ background: '#F1E6CD', padding: '0.15rem 0.35rem', borderRadius: '3px' }}>
          VITE_SUPABASE_ANON_KEY
        </code>{' '}
        in your project <code style={{ background: '#F1E6CD', padding: '0.15rem 0.35rem', borderRadius: '3px' }}>.env</code> file.
      </span>
    </div>
  );
};

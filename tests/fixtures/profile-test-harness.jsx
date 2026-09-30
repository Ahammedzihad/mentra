import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from '../../frontend/context/AuthContext';
import { supabase } from '../../frontend/lib/supabase';
import { EditProfileModal } from '../../features/profile/EditProfileModal';

function HarnessContent({ isOpen, setIsOpen, closeCalls, setCloseCalls, setUpdatedCalls }) {
  const auth = useAuth();
  const { profile, loading } = auth;

  useEffect(() => {
    window.__profileAuth = auth;
  }, [auth]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Profile Test Harness Active (Production AuthProvider)</h2>
      <button id="open-modal-btn" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <div id="test-auth-loading">{loading ? 'loading' : 'ready'}</div>
      <div id="test-state-profile">{JSON.stringify(profile)}</div>
      <div id="test-close-count">{closeCalls}</div>
      <EditProfileModal
        isOpen={isOpen}
        onClose={() => {
          setCloseCalls((c) => c + 1);
          setIsOpen(false);
        }}
        onProfileUpdated={(data) => {
          setUpdatedCalls((prev) => [...prev, data]);
        }}
      />
    </div>
  );
}

function HarnessRoot() {
  const [isOpen, setIsOpen] = useState(true);
  const [closeCalls, setCloseCalls] = useState(0);
  const [updatedCalls, setUpdatedCalls] = useState([]);

  useEffect(() => {
    window.__supabase = supabase;
    window.__profileHarness = {
      setIsOpen,
      getHistory: () => ({
        closeCalls,
        updatedCalls,
      }),
      resetHistory: () => {
        setCloseCalls(0);
        setUpdatedCalls([]);
      },
    };
  }, [closeCalls, updatedCalls]);

  return (
    <AuthProvider>
      <HarnessContent
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        closeCalls={closeCalls}
        setCloseCalls={setCloseCalls}
        setUpdatedCalls={setUpdatedCalls}
      />
    </AuthProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<HarnessRoot />);
}


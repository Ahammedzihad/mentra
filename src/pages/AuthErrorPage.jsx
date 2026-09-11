import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, Clock, ArrowRight, LogIn } from 'lucide-react';

export const AuthErrorPage = () => {
  const location = useLocation();
  const [errorDetails, setErrorDetails] = useState({
    code: 'access_denied',
    message: 'An authentication error occurred during email verification.',
    isExpired: false,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashStr = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const hashParams = new URLSearchParams(hashStr);

    const code = searchParams.get('error_code') || hashParams.get('error_code') || searchParams.get('error') || hashParams.get('error') || 'access_denied';
    const desc = searchParams.get('error_description') || hashParams.get('error_description');
    const isExpired = code === 'otp_expired' || (desc && desc.toLowerCase().includes('expired'));

    setErrorDetails({
      code,
      message: desc
        ? decodeURIComponent(desc.replace(/\+/g, ' '))
        : (isExpired
            ? 'Your email verification link has expired or has already been used.'
            : 'Access was denied during email verification.'),
      isExpired: Boolean(isExpired),
    });
  }, [location]);

  return (
    <div
      style={{
        padding: '4rem 1.5rem 6rem 1.5rem',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-warm-ivory)',
      }}
    >
      <div className="container container-narrow">
        <div
          className="card-academic"
          style={{
            maxWidth: '540px',
            margin: '0 auto',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-white)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-terracotta-subtle)',
              border: '1px solid rgba(197, 85, 60, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: 'var(--color-terracotta)',
            }}
          >
            {errorDetails.isExpired ? <Clock size={26} /> : <AlertCircle size={26} />}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <span className="badge-dept terracotta">
              {errorDetails.isExpired ? 'Verification Protocol' : 'Authentication Notice'}
            </span>
          </div>

          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(1.6rem, 3.5vw, 2.1rem)',
              color: 'var(--color-primary-dark)',
              marginTop: '0.35rem',
              marginBottom: '1rem',
              lineHeight: 1.3,
            }}
          >
            {errorDetails.isExpired
              ? 'Verification Link Expired'
              : 'Authentication Verification Notice'}
          </h1>

          <p
            style={{
              fontSize: '0.925rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              marginBottom: '1.75rem',
            }}
          >
            {errorDetails.isExpired
              ? 'This email confirmation link is no longer valid because it has expired or was already confirmed. If your account was previously verified, you can sign in directly with your password.'
              : errorDetails.message}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.5rem',
            }}
          >
            <Link
              to="/login"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogIn size={15} />
              <span>Sign In to Mentra</span>
            </Link>
            <Link
              to="/signup"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>Register New Account</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

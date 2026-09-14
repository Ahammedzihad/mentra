import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy route redirect:
 * Consolidates mentor verification directly into the dedicated AdminMentorsPage (?status=pending).
 */
export const AdminMentorVerificationPage = () => {
  return <Navigate to="/admin/mentors?status=pending" replace />;
};

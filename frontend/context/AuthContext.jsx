import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isValidProgram, isValidSpecialization } from '../lib/academicPrograms';
import { normalizeSkillsList, normalizeAchievementsList } from '../lib/profileSelfReported';

const AuthContext = createContext(null);

const CANONICAL_YEARS = Object.freeze([
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
]);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Fetch the user's profile from the existing `profiles` table
  const fetchProfile = useCallback(async (userId, fallbackEmail = '') => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, course, program, specialization, year, batch, bio, skills, achievements, role, is_verified, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from profiles table:', error.message);
        return null;
      }

      if (data) {
        const sanitized = {
          ...data,
          skills: Array.isArray(data.skills) ? data.skills : [],
          achievements: Array.isArray(data.achievements) ? data.achievements : [],
        };
        setProfile(sanitized);
        return sanitized;
      } else {
        // If row doesn't exist yet, we can check auth user metadata as fallback
        const { data: userData } = await supabase.auth.getUser();
        const meta = userData?.user?.user_metadata || {};
        const fallbackRole = meta.role === 'mentor' ? 'mentor' : meta.role === 'admin' ? 'admin' : 'student';
        const isStudent = fallbackRole === 'student';

        // 1. Program resolution:
        // Every program value written by this fallback must be either a canonical program or null.
        // Choose program only from metadata values that independently pass canonical program validation.
        // Preference order: meta.program -> meta.course -> meta.department -> null.
        // Never copy arbitrary or non-canonical text into program.
        const rawProgram = typeof meta.program === 'string' ? meta.program.trim() : null;
        const rawCourse = typeof meta.course === 'string' ? meta.course.trim() : null;
        const rawDept = typeof meta.department === 'string' ? meta.department.trim() : null;

        const candidateProgram =
          (rawProgram && isValidProgram(rawProgram) ? rawProgram : null) ||
          (rawCourse && isValidProgram(rawCourse) ? rawCourse : null) ||
          (rawDept && isValidProgram(rawDept) ? rawDept : null) ||
          null;

        // 2. Specialization resolution:
        // If program is canonical and specialization is valid for that program, keep it; otherwise null.
        const rawSpec = typeof meta.specialization === 'string' ? meta.specialization.trim() : null;
        const fallbackSpecialization =
          candidateProgram && rawSpec && isValidSpecialization(candidateProgram, rawSpec)
            ? rawSpec
            : null;

        // 3. Role-specific department and course legacy compatibility:
        // - For students with a valid canonical program: synchronize department and course with that program.
        // - For students with missing/invalid program: keep safe legacy fallback ('B.Tech') while program is null.
        // - For mentors/admins: preserve original metadata department (e.g. faculty dept) and course; do NOT overwrite with program.
        let fallbackDepartment = null;
        let fallbackCourse = null;

        if (isStudent) {
          if (candidateProgram) {
            fallbackDepartment = candidateProgram;
            fallbackCourse = candidateProgram;
          } else {
            fallbackDepartment = rawDept || 'B.Tech';
            fallbackCourse = rawCourse || fallbackDepartment;
          }
        } else {
          // Mentors and admins: preserve existing department (e.g. faculty dept) and course metadata
          fallbackDepartment = rawDept || null;
          fallbackCourse = rawCourse || null;
        }

        const fallbackProfile = {
          id: userId,
          full_name: (typeof meta.full_name === 'string' && meta.full_name.trim()) || 'Community Member',
          role: fallbackRole,
          department: fallbackDepartment,
          course: fallbackCourse,
          program: candidateProgram,
          specialization: fallbackSpecialization,
          year: (typeof meta.year === 'string' && meta.year.trim()) || null,
          batch: (typeof meta.batch === 'string' && meta.batch.trim()) || null,
          bio: (typeof meta.bio === 'string' && meta.bio.trim()) || null,
          is_verified: false,
        };

        // If user is authenticated, attempt to persist this profile to profiles table
        try {
          const { data: inserted, error: insErr } = await supabase
            .from('profiles')
            .upsert([fallbackProfile], { onConflict: 'id' })
            .select('id, full_name, department, course, program, specialization, year, batch, bio, skills, achievements, role, is_verified, created_at')
            .maybeSingle();

          if (!insErr && inserted) {
            const sanitizedInserted = {
              ...inserted,
              skills: Array.isArray(inserted.skills) ? inserted.skills : [],
              achievements: Array.isArray(inserted.achievements) ? inserted.achievements : [],
            };
            setProfile(sanitizedInserted);
            return sanitizedInserted;
          }
        } catch {
          // Fallback to local profile object if RLS prevents upsert
        }

        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  // Initialize auth session
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error getting auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign Up: 1. Create auth user, 2. Create row in profiles table
  const signUp = async ({ fullName, email, password, role, department, program, specialization }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    const trimmedEmail = email.trim();
    const resolvedProgram = program || department || 'B.Tech';

    // Dynamically set email verification redirect based on current origin:
    // Local development (Vite): http://localhost:5173/login
    // Production (Vercel): https://mentra-eta.vercel.app/login
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://mentra-eta.vercel.app';
    const emailRedirectTo = `${origin}/login`;

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
          role,
          department: resolvedProgram,
          course: resolvedProgram,
          program: resolvedProgram,
          specialization: specialization || null,
        },
      },
    });

    if (error) {
      const errLower = error.message?.toLowerCase() || '';
      if (
        errLower.includes('already registered') ||
        errLower.includes('already in use') ||
        errLower.includes('user already exists') ||
        error.code === 'user_already_exists' ||
        error.status === 422
      ) {
        throw new Error('⚠️ This email is already registered. Please use a different Gmail account or sign in with this email.');
      }
      throw error;
    }

    const createdUser = data?.user;

    // Supabase GoTrue returns empty identities array if user already exists (enumeration protection)
    if (createdUser && Array.isArray(createdUser.identities) && createdUser.identities.length === 0) {
      // Do not create another profile, overwrite existing profile, or alter user's data
      throw new Error('⚠️ This email is already registered. Please use a different Gmail account or sign in with this email.');
    }

    if (createdUser) {
      // PostgreSQL trigger 'on_auth_user_created' automatically creates the profile row
      // in public.profiles with the signup metadata (full_name, role, department, is_verified=false).
      // If a session exists immediately (e.g. email confirmation disabled), hydrate state:
      if (data.session) {
        setUser(createdUser);
        await fetchProfile(createdUser.id, trimmedEmail);
      }
    }

    return { user: createdUser, session: data.session, role };
  };

  // Sign In
  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    setUser(data.user);
    const loadedProfile = await fetchProfile(data.user.id, data.user.email);
    return { user: data.user, profile: loadedProfile };
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email);
    }
  };

  /**
   * Updates the signed-in user's profile with an enforced editable-field allowlist.
   *
   * Security & Integrity Invariants:
   * 1. Target ID is strictly derived from user.id (authenticated session); never accepts target ID from caller.
   * 2. Rejects operation immediately if no authenticated user is present.
   * 3. Strict editable-field allowlist: only full_name, program, specialization, year, and bio are accepted.
   *    Protected or arbitrary fields (role, is_verified, id, email, created_at, etc.) are stripped.
   * 4. Academic validation: enforces non-empty full name, canonical program, and valid specialization pair.
   * 5. Legacy compatibility: synchronizes department and course from validated program.
   * 6. Updates AuthContext local state from the returned database row, preserving role and verification status.
   *
   * @param {Object} updates
   * @param {string} [updates.fullName]
   * @param {string} [updates.full_name]
   * @param {string} [updates.program]
   * @param {string|null} [updates.specialization]
   * @param {string|null} [updates.year]
   * @param {string|null} [updates.bio]
   * @returns {Promise<{ data: Object, error: null }>}
   */
  const updateProfile = async (updates = {}) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    if (!user?.id) {
      throw new Error('Unauthorized: Authentication required to update profile.');
    }

    // 1. Full name validation (required, non-empty after trimming)
    const rawFullName = updates.fullName !== undefined ? updates.fullName : updates.full_name;
    const resolvedFullName = rawFullName !== undefined ? rawFullName : profile?.full_name;
    const trimmedFullName = typeof resolvedFullName === 'string' ? resolvedFullName.trim() : '';

    if (!trimmedFullName) {
      throw new Error('Please provide your full legal or academic name.');
    }

    // 2. Program validation (required, must be one of the canonical programs)
    const rawProgram = updates.program !== undefined ? updates.program : profile?.program;
    if (!rawProgram || !isValidProgram(rawProgram)) {
      throw new Error('Please select a valid canonical academic program.');
    }

    // 3. Specialization validation (optional; if non-empty, must be valid for program)
    const rawSpec = updates.specialization !== undefined ? updates.specialization : profile?.specialization;
    const trimmedSpec = typeof rawSpec === 'string' ? rawSpec.trim() : null;
    const normalizedSpec = trimmedSpec || null;

    if (normalizedSpec && !isValidSpecialization(rawProgram, normalizedSpec)) {
      throw new Error('The selected specialization is not valid for your chosen program.');
    }

    // 4. Academic year handling (optional; if non-empty, trimmed string; blank saved as null)
    const rawYear = updates.year !== undefined ? updates.year : profile?.year;
    const trimmedYear = typeof rawYear === 'string' ? rawYear.trim() : null;
    const normalizedYear = trimmedYear || null;

    if (updates.year !== undefined && normalizedYear && !CANONICAL_YEARS.includes(normalizedYear)) {
      throw new Error('Please select a valid academic year level.');
    }

    // 5. Bio handling (optional; if non-empty, trimmed string; blank saved as null)
    const rawBio = updates.bio !== undefined ? updates.bio : profile?.bio;
    const trimmedBio = typeof rawBio === 'string' ? rawBio.trim() : null;
    const normalizedBio = trimmedBio || null;

    // 6. Self-reported skills handling (optional; up to 15 entries, max 50 chars each)
    const rawSkills = updates.skills !== undefined ? updates.skills : (profile?.skills || []);
    const normalizedSkills = normalizeSkillsList(rawSkills);

    // 7. Self-reported achievements handling (optional; up to 10 entries, max 200 chars each)
    const rawAchievements = updates.achievements !== undefined ? updates.achievements : (profile?.achievements || []);
    const normalizedAchievements = normalizeAchievementsList(rawAchievements);

    // 8. Construct strictly allowlisted database payload
    // Role-aware legacy compatibility synchronization:
    // - For students: synchronize legacy department and course fields with program
    // - For mentors and admins: preserve existing faculty/institutional department
    const isStudent = profile?.role === 'student' || (!profile?.role && user?.user_metadata?.role !== 'mentor');

    const payload = {
      full_name: trimmedFullName,
      program: rawProgram,
      specialization: normalizedSpec,
      year: normalizedYear,
      bio: normalizedBio,
      skills: normalizedSkills,
      achievements: normalizedAchievements,
    };

    if (isStudent) {
      payload.department = rawProgram;
      payload.course = rawProgram;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select('id, full_name, department, course, program, specialization, year, batch, bio, skills, achievements, role, is_verified, created_at')
      .maybeSingle();

    if (error) {
      console.error('Error updating profile in Supabase:', error.message);
      throw error;
    }

    if (!data) {
      throw new Error('Profile update failed: No matching profile record found.');
    }

    // Reflect saved database row into local AuthContext state
    const sanitizedData = {
      ...data,
      skills: Array.isArray(data.skills) ? data.skills : normalizedSkills,
      achievements: Array.isArray(data.achievements) ? data.achievements : normalizedAchievements,
    };
    setProfile(sanitizedData);
    return { data: sanitizedData, error: null };
  };

  // Reset Password for Email: Sends recovery email with dynamic origin redirect
  const resetPasswordForEmail = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://mentra-eta.vercel.app';
    const redirectTo = `${origin}/reset-password`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) throw error;
    return data;
  };

  // Update Password: Calls supabase.auth.updateUser for authenticated/recovery session
  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    setIsPasswordRecovery(false);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
        resetPasswordForEmail,
        updatePassword,
        isPasswordRecovery,
        setIsPasswordRecovery,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

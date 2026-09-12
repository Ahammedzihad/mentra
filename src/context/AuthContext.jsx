import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

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
        .select('id, full_name, department, role, is_verified, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from profiles table:', error.message);
        return null;
      }

      if (data) {
        setProfile(data);
        return data;
      } else {
        // If row doesn't exist yet, we can check auth user metadata as fallback
        const { data: userData } = await supabase.auth.getUser();
        const meta = userData?.user?.user_metadata || {};
        const fallbackRole = meta.role === 'mentor' ? 'mentor' : meta.role === 'admin' ? 'admin' : 'student';
        const fallbackProfile = {
          id: userId,
          full_name: meta.full_name || 'Community Member',
          role: fallbackRole,
          department: meta.department || 'B.Tech',
          is_verified: false,
        };

        // If user is authenticated, attempt to persist this profile to profiles table
        try {
          const { data: inserted, error: insErr } = await supabase
            .from('profiles')
            .upsert([fallbackProfile], { onConflict: 'id' })
            .select('id, full_name, department, role, is_verified, created_at')
            .maybeSingle();

          if (!insErr && inserted) {
            setProfile(inserted);
            return inserted;
          }
        } catch (e) {
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
  const signUp = async ({ fullName, email, password, role, department }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in .env yet.');
    }

    const trimmedEmail = email.trim();

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
          department,
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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile from the existing `profiles` table
  const fetchProfile = useCallback(async (userId, fallbackEmail = '') => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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
        const fallbackProfile = {
          id: userId,
          full_name: meta.full_name || 'Community Member',
          email: fallbackEmail || userData?.user?.email || '',
          role: meta.role || 'student',
          department: meta.department || 'B.Tech',
          is_verified: false,
        };

        // If user is authenticated, attempt to persist this profile to profiles table
        try {
          const { data: inserted, error: insErr } = await supabase
            .from('profiles')
            .upsert([fallbackProfile])
            .select()
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
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
      // Insert corresponding row into profiles table for new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: createdUser.id,
            full_name: fullName.trim(),
            email: trimmedEmail,
            role,
            department,
            is_verified: false, // Mentors cannot self-verify; controlled by academic admin
          },
        ]);

      if (profileError) {
        if (profileError.code === '23505' || profileError.message?.toLowerCase().includes('duplicate key')) {
          throw new Error('⚠️ This email is already registered. Please use a different Gmail account or sign in with this email.');
        }
        console.warn('Could not insert profile immediately (RLS or confirmation may apply):', profileError.message);
      }

      // Update local state if session exists
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

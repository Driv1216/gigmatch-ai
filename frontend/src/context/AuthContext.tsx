/* eslint-disable react-refresh/only-export-components */
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchUserProfile, type UserProfile, type UserRole } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function loadProfile(nextUser: User | null) {
    setProfileError(null);

    if (!nextUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await fetchUserProfile(nextUser.id);
    setProfile(nextProfile);

    if (!nextProfile) {
      setProfileError("Your account exists, but no role profile was found.");
    }

    return nextProfile;
  }

  async function refreshProfile() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setUser(null);
      setProfile(null);
      setProfileError(null);
      return null;
    }

    setUser(data.user);
    return loadProfile(data.user);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      setUser(data.user);

      try {
        await loadProfile(data.user);
      } catch (profileLoadError) {
        setProfile(null);
        setProfileError(profileLoadError instanceof Error ? profileLoadError.message : "Unable to load profile.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      loadProfile(nextUser).catch((profileLoadError) => {
        setProfile(null);
        setProfileError(profileLoadError instanceof Error ? profileLoadError.message : "Unable to load profile.");
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    profileError,
    refreshProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

/* eslint-disable react-refresh/only-export-components */
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchUserProfile, type UserProfile, type UserRole } from "../lib/auth";
import { supabase } from "../lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  profileStatus: ProfileStatus;
  profileError: string | null;
  refreshProfile: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
};

export type ProfileStatus = "loading" | "ready" | "missing" | "error";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequest = useRef(0);

  async function loadProfile(nextUser: User | null) {
    const requestId = ++profileRequest.current;
    setProfileError(null);

    if (!nextUser) {
      setProfile(null);
      setProfileStatus("missing");
      return null;
    }

    setProfileStatus("loading");

    try {
      const nextProfile = await fetchUserProfile(nextUser.id);

      if (requestId !== profileRequest.current) {
        return null;
      }

      setProfile(nextProfile);
      setProfileStatus(nextProfile ? "ready" : "missing");
      return nextProfile;
    } catch (profileLoadError) {
      if (requestId === profileRequest.current) {
        setProfile(null);
        setProfileStatus("error");
        setProfileError(profileLoadError instanceof Error ? profileLoadError.message : "Unable to load profile.");
      }
      throw profileLoadError;
    }
  }

  async function refreshProfile() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setUser(null);
      setProfile(null);
      setProfileStatus("missing");
      setProfileError(null);
      return null;
    }

    setUser(data.user);
    return loadProfile(data.user);
  }

  async function logout() {
    profileRequest.current += 1;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileStatus("missing");
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
        setProfileStatus("missing");
        setProfileError(null);
        setLoading(false);
        return;
      }

      setUser(data.user);

      try {
        await loadProfile(data.user);
      } catch {
        // loadProfile owns the fail-closed profile error state.
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
      setLoading(false);

      loadProfile(nextUser).catch(() => {
        // loadProfile owns the fail-closed profile error state.
      });
    });

    return () => {
      isMounted = false;
      profileRequest.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    profileStatus,
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

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  appRole: "admin" | "manager" | "observer";
  isRoleDelegate: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (authUser: User) => {
    const [{ data: roles }, { data: profile }, { data: delegates }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", authUser.id),
      supabase.from("profiles").select("full_name").eq("id", authUser.id).single(),
      supabase.from("role_management_delegates").select("id").eq("user_id", authUser.id),
    ]);

    const appRole = (roles && roles.length > 0 ? roles[0].role : "manager") as "admin" | "manager" | "observer";

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      fullName: profile?.full_name || authUser.user_metadata?.full_name || "",
      appRole,
      isRoleDelegate: (delegates && delegates.length > 0) || false,
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock on auth state change
        setTimeout(() => loadUserProfile(session.user), 0);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.appRole === "admin";

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

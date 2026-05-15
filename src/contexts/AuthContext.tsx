import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "ong" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  profile: any;
  ongId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  profile: null,
  ongId: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ongId, setOngId] = useState<string | null>(null);

  const resetUserData = () => {
    setRole(null);
    setProfile(null);
    setOngId(null);
  };

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes, ongRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("usuarios_ong").select("id_ong").eq("id_usuario", userId).eq("status", true).limit(1),
    ]);

    const roles = rolesRes.data?.map((r) => r.role) || [];
    if (roles.includes("admin")) setRole("admin");
    else if (roles.includes("ong")) setRole("ong");
    else setRole("user");

    setProfile(profileRes.data ?? null);
    setOngId(ongRes.data?.[0]?.id_ong ?? null);
  };

  const applySession = async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      await fetchUserData(nextSession.user.id);
    } else {
      resetUserData();
    }

    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      applySession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetUserData();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, ongId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

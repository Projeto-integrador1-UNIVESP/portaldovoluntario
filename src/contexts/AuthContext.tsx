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

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes, ongRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("usuarios_ong").select("id_ong").eq("id_usuario", userId).eq("status", true).limit(1),
    ]);

    if (rolesRes.data && rolesRes.data.length > 0) {
      const roles = rolesRes.data.map((r) => r.role);
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("ong")) setRole("ong");
      else setRole("user");
    } else {
      setRole("user");
    }

    if (profileRes.data) setProfile(profileRes.data);
    if (ongRes.data && ongRes.data.length > 0) setOngId(ongRes.data[0].id_ong);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
          setOngId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setOngId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, ongId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

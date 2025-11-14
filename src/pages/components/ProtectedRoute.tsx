import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../assets/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUser();

    const { data: listener }: { data?: { subscription?: { unsubscribe?: () => void } } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      // unsubscribe if present (safe for different supabase versions)
      try {
        listener?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // while we verify auth, don't render anything (avoids flicker)
  if (loading) return null;

  // if not authenticated, always redirect to login (preserves attempted location in state)
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}

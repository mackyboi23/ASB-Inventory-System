import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../assets/lib/supabaseClient';
import { Navigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

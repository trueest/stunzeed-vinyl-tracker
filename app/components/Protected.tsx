'use client';

import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function Protected({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error checking session', error);
      }

      if (!ignore) {
        if (!data.session) {
          router.push('/login');
        } else {
          setAuthorized(true);
        }
        setChecking(false);
      }
    }

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push('/login');
        } else {
          setAuthorized(true);
        }
      }
    );

    return () => {
      ignore = true;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return <div className="p-4">Checking authentication…</div>;
  }

  if (!authorized) {
    return null; // redirect
  }

  return <>{children}</>;
}
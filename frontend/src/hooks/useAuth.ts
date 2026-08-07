// Reactive view of admin auth state, backed by the Supabase session.
//
// `loading` matters: Supabase restores a persisted session asynchronously, so
// on a hard refresh there is a tick where a legitimately signed-in admin looks
// signed out. Guards must wait for it rather than redirecting to login.

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { logout } from "../lib/api";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    // Fires on sign-in, sign-out, and token refresh — including refreshes
    // triggered in another tab.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    isAuthed: session !== null,
    loading,
    email: session?.user.email ?? null,
    logout,
  };
}

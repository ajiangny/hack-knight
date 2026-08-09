// Admin login — Google sign-in via Supabase Auth. Supabase handles the OAuth
// round trip and persists the session; the backend decides whether the
// resulting account is actually an admin (ADMIN_EMAILS), so a successful
// Google sign-in is not the same as access.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, ForbiddenError, logout } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

interface AdminIdentity {
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAuthed, loading, email } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // A session alone does not mean access. Ask the backend who we are: 200
  // means allowlisted (go to the dashboard), 403 means signed in with the
  // wrong Google account.
  useEffect(() => {
    if (loading || !isAuthed) return;
    let cancelled = false;

    apiGet<AdminIdentity>("/auth/me")
      .then(() => {
        if (!cancelled) navigate("/admin", { replace: true });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err instanceof ForbiddenError) setUnauthorized(true);
        else setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthed, loading, navigate]);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    // On success the browser leaves for Google, so this only runs on failure.
    if (oauthError) {
      setError(oauthError.message);
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await logout();
    setUnauthorized(false);
    setError(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-container">
      <div className="bg-surface rounded-3xl p-8 sm:p-10 w-full max-w-md">
        <h1 className="section-title text-center mb-8">Admin Login</h1>

        {unauthorized ? (
          <div className="flex flex-col gap-5">
            <p className="font-mono text-sm text-red-400" role="alert">
              {email} is not authorized for the HackKnight admin dashboard.
              Sign out and try the Code For All account.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-primary w-full"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="font-body text-sm text-text-secondary text-center">
              Sign in with the Code For All Google account.
            </p>

            {error && (
              <p className="font-mono text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSignIn}
              disabled={submitting || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Redirecting…" : "Sign in with Google"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

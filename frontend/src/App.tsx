import { useEffect, useState, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Navbar from "./components/site/Navbar";
import Footer from "./components/site/Footer";
import CustomCursor from "./components/site/CustomCursor";
import Home from "./pages/Home";
import Schedule from "./pages/SchedulePage";
import Sponsors from "./pages/SponsorsPage";
import RegisterPage from "./pages/RegisterPage";
import AdminLogin from "./pages/AdminLogin";
import AdminPage from "./pages/AdminPage";
import { useAuth } from "./hooks/useAuth";
import { apiGet } from "./lib/api";

// Redirects to the login page when there is no *authorized* admin session.
// A Supabase session only proves a Google sign-in — any Google account has
// one after OAuth, and the OAuth redirect lands here directly, skipping the
// login page. So this guard asks the backend (GET /auth/me, which enforces
// ADMIN_EMAILS) before rendering the dashboard; a session alone is not access.
//
// On 403 the user goes to the login page, whose own /auth/me check shows the
// "not authorized" message and sign-out button. On 401 apiGet signs out,
// flipping isAuthed. Renders nothing while Supabase restores a persisted
// session or while the check is in flight — deciding early would bounce a
// legitimate admin to login on every refresh.
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, loading, session } = useAuth();
  const userId = session?.user.id;
  // The result is stored with the user it belongs to, so switching accounts
  // invalidates it by derivation instead of a synchronous reset in the effect.
  const [check, setCheck] = useState<{ userId: string; ok: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (loading || !userId) return;
    let cancelled = false;

    apiGet("/auth/me")
      .then(() => !cancelled && setCheck({ userId, ok: true }))
      .catch(() => !cancelled && setCheck({ userId, ok: false }));

    return () => {
      cancelled = true;
    };
  }, [loading, userId]);

  const authorized = check && check.userId === userId ? check.ok : null;

  if (loading) return null;
  if (!isAuthed || authorized === false) return <Navigate to="/admin/login" replace />;
  if (authorized === null) return null;
  return children;
}

function useScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Small timeout ensures DOM elements render before browser tries to seek them
      setTimeout(() => {
        // getElementById, not querySelector: the hash can be arbitrary data
        // (e.g. Supabase's OAuth redirect lands with #access_token=...),
        // which querySelector would reject as an invalid selector and throw.
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 10);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
}

// Wrapper to animate routes crossing in and out
const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

function AppContent() {
  const location = useLocation();
  useScrollToHash();

  // Admin pages render standalone — no public Navbar/Footer.
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      <CustomCursor />
      {!isAdmin && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes key={location.pathname} location={location}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/schedule" element={<PageTransition><Schedule /></PageTransition>} />
          <Route path="/sponsors" element={<PageTransition><Sponsors /></PageTransition>} />
          {/* RegisterPage renders ComingSoon itself when registration is closed. */}
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AnimatePresence>
      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

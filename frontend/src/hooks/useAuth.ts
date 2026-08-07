// Reactive view of admin auth state.
//
// The token lives in localStorage, which React cannot observe, so the route
// guard used to read it imperatively and never re-render. Clearing the token —
// by logging out, or by a 401 from any admin write — left the dashboard on
// screen with nothing behind it. `lib/api` publishes token changes; this hook
// subscribes so the guard re-decides immediately.

import { useSyncExternalStore } from "react";
import { isAuthenticated, logout, subscribeToAuth } from "../lib/api";

export function useAuth() {
  const isAuthed = useSyncExternalStore(subscribeToAuth, isAuthenticated);
  return { isAuthed, logout };
}

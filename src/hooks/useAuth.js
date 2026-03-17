// Auth disabled — all features available without login
export function useAuth() {
  return { session: null, user: null, isAuthenticated: true, loading: false }
}

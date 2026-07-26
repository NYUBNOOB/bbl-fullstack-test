import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { User } from '@auth0/auth0-react';

/**
 * Unified auth shape — every consumer (API client, Header, ProtectedRoute)
 * reads from this context, never from useAuth0() directly. That's what
 * lets the same UI code run both against a real Auth0 tenant and against
 * a dev-mode JWT signed with the same secret the backend's mocked
 * AuthGuard trusts.
 */
export interface AuthState {
  isRealAuth: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  login: (returnTo?: string) => Promise<void>;
  logout: (returnTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const isAuth0Configured = Boolean(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

// ──────────────────────────────────────────────────────────────────────────
// Dev-mode: sign our own HS256 JWT using the backend's dev secret.
// Only meaningful locally — never in real deployment.
// ──────────────────────────────────────────────────────────────────────────
const DEV_JWT_SECRET = 'bbl-dev-secret-do-not-use-in-prod';
const DEV_USER = {
  sub: 'auth0|user_a',
  email: 'alice@example.com',
  name: 'Alice (Local Dev)',
};

function base64UrlEncode(bytes: Uint8Array | string): string {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  return btoa(String.fromCharCode(...data))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function signDevToken(): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: DEV_USER.sub,
      email: DEV_USER.email,
      name: DEV_USER.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 60,
    })
  );

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(DEV_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${base64UrlEncode(new Uint8Array(sig))}`;
}

/** Dev-mode provider (no Auth0). Always authenticated as Alice. */
export function DevAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(() => {
    let cachedToken: string | null = null;
    let cachedUntil = 0;

    return {
      isRealAuth: false,
      isAuthenticated: true,
      isLoading: false,
      user: {
        sub: DEV_USER.sub,
        email: DEV_USER.email,
        name: DEV_USER.name,
      } as User,
      getToken: async () => {
        const now = Date.now();
        if (cachedToken && cachedUntil - now > 60_000) return cachedToken;
        cachedToken = await signDevToken();
        cachedUntil = now + 25 * 60_000;
        return cachedToken;
      },
      login: async () => {
        /* no-op in dev */
      },
      logout: async () => {
        /* no-op in dev */
      },
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Real Auth0 provider. Must be rendered inside <Auth0Provider>. */
export function RealAuthProvider({ children }: { children: ReactNode }) {
  const auth0 = useAuth0();

  const value = useMemo<AuthState>(() => ({
    isRealAuth: true,
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    user: auth0.isAuthenticated ? (auth0.user ?? null) : null,
    getToken: () =>
      auth0.isAuthenticated
        ? auth0.getAccessTokenSilently().catch(() => null)
        : Promise.resolve(null),
    login: async (returnTo?: string) => {
      await auth0.loginWithRedirect({
        appState: { returnTo: returnTo ?? '/' },
      });
    },
    logout: async (returnTo?: string) => {
      await auth0.logout({
        logoutParams: { returnTo: returnTo ?? window.location.origin },
      });
    },
  }), [
    auth0.isAuthenticated,
    auth0.isLoading,
    auth0.user,
    auth0.getAccessTokenSilently,
    auth0.loginWithRedirect,
    auth0.logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside DevAuthProvider or RealAuthProvider');
  }
  return ctx;
}

export function useToken(): () => Promise<string | null> {
  const { getToken } = useAuth();
  return useCallback(() => getToken(), [getToken]);
}

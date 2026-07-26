import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Auth0Provider } from '@auth0/auth0-react';

import { theme } from './theme';
import { isAuth0Configured, DevAuthProvider, RealAuthProvider } from './stores/auth/authContext';
import AuthSync from './api/AuthSync';

import Router from './router';

const authDomain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const authClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const authAudience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

/**
 * Root application component.
 *
 * Wiring order (inner → outer):
 *   ThemeProvider     → MUI v9 global theming + typography
 *   CssBaseline       → MUI's CSS reset, respects theme typography
 *   AuthSync          → wires current auth token into the shared apiClient
 *   Auth Provider     → DevAuthProvider (no Auth0) or RealAuthProvider (real Auth0)
 *   BrowserRouter     → routes: /, /collections, /bookmarks
 */
export default function App() {
  const shell = (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthSync />
      <Router />
    </ThemeProvider>
  );

  // Wrap with real Auth0 when configured; otherwise wrap with DevAuthProvider.
  // DevAuthProvider doesn't need an Auth0Provider around it because it never
  // calls useAuth0().
  const withAuth = isAuth0Configured ? (
    <Auth0Provider
      domain={authDomain!}
      clientId={authClientId!}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: authAudience,
        scope: 'openid profile email',
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <RealAuthProvider>
        <BrowserRouter>{shell}</BrowserRouter>
      </RealAuthProvider>
    </Auth0Provider>
  ) : (
    <DevAuthProvider>
      <BrowserRouter>{shell}</BrowserRouter>
    </DevAuthProvider>
  );

  return withAuth;
}

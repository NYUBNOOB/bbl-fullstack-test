import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import { Alert, AlertTitle, Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? '/', { replace: true });
  };

  if (!domain || !clientId || !audience) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <AlertTitle>Auth0 is not configured</AlertTitle>
          Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE in{' '}
          <code>frontend/.env</code>, then restart the dev server.
        </Alert>
      </Box>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

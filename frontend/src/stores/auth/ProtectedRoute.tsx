import { useEffect, useRef, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  const redirecting = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || redirecting.current) return;
    redirecting.current = true;

    void loginWithRedirect({
      appState: { returnTo: location.pathname + location.search },
    });
  }, [isLoading, isAuthenticated, loginWithRedirect, location]);

  if (isLoading || !isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          {isLoading ? 'Checking your session…' : 'Redirecting to sign in…'}
        </Typography>
      </Box>
    );
  }

  return <>{children ?? <Outlet />}</>;
}

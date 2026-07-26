import { useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from './authContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Gate for authenticated routes.
 *
 * Reads from the unified AuthContext, so behaviour is identical whether
 * Auth0 is wired up or we're in local-dev bypass.
 *
 * SECURITY NOTE:
 *   Token verification happens in Auth0Provider. This wrapper only READS
 *   the authentication state; it never trusts client-side flags.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();

  if (isLoading) {
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
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Trigger login redirect. The returnTo param preserves the path
    // so the user lands back here after logging in.
    void login(location.pathname + location.search);
    return null;
  }

  return <>{children}</>;
}

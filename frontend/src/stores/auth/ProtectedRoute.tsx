import { useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from './authContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

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
    void login(location.pathname + location.search);
    return null;
  }

  return <>{children}</>;
}

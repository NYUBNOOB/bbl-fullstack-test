import { Outlet } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import Header from './Header';

export default function AppLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 3, flex: 1 }}>
        <Outlet />
      </Container>
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          mt: 'auto',
          textAlign: 'center',
          color: 'text.secondary',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        BBL Bookmark Manager
      </Box>
    </Box>
  );
}

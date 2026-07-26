import { NavLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'primary.contrastText' : 'inherit',
  backgroundColor: isActive ? 'primary.dark' : 'transparent',
  textDecoration: 'none',
  padding: '6px 16px',
  borderRadius: 1,
  fontWeight: isActive ? 600 : 400,
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
  },
});

export default function Header() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const navigate = useNavigate();
  const authConfigured = Boolean(
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
  );

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ mr: 4, cursor: 'pointer', fontWeight: 700 }}
          onClick={() => navigate('/')}
          children="BBL Bookmarks"
        />

        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          <NavLink to="/collections" style={navLinkStyle} children="Collections" />
          <NavLink to="/bookmarks" style={navLinkStyle} children="Bookmarks" />
        </Box>

        {authConfigured && isAuthenticated && user && (
          <Typography variant="body2" sx={{ mr: 2 }} children={user.email} />
        )}

        {authConfigured && !isAuthenticated && (
          <Button color="inherit" onClick={() => loginWithRedirect()} children="Log in" />
        )}

        {authConfigured && isAuthenticated && (
          <Button
            color="inherit"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            children="Log out"
          />
        )}

        {!authConfigured && (
          <Typography variant="caption" sx={{ ml: 2, opacity: 0.7 }} children="(Auth disabled — local dev)" />
        )}
      </Toolbar>
    </AppBar>
  );
}

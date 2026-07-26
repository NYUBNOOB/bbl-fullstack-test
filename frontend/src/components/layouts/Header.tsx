import { NavLink } from "react-router-dom"
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material"
import { useAuth } from "../../stores/auth/authContext"
import { isAuth0Configured } from "../../stores/auth/authContext"

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "white" : "rgba(255, 255, 255, 0.85)",
  backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
  textDecoration: "none",
  padding: "6px 16px",
  borderRadius: "4px",
  fontWeight: isActive ? 600 : 400,
  transition: "background-color 0.2s",
})

/**
 * App header with navigation.
 *
 * Uses NavLink for "active" styling on the currently-viewed route.
 * Reads from the unified AuthContext so it works in both real Auth0
 * mode and local-dev bypass.
 */
export default function Header() {
  const { isAuthenticated, login, logout, user } = useAuth()

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ mr: 4, cursor: "pointer", fontWeight: 700 }}>
          <NavLink to="/" style={({ isActive }) => navLinkStyle({ isActive })}>
            BBL Bookmarks
          </NavLink>
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexGrow: 1 }}>
          <NavLink to="/collections" style={({ isActive }) => navLinkStyle({ isActive })}>
            Collections
          </NavLink>
          <NavLink to="/bookmarks" style={({ isActive }) => navLinkStyle({ isActive })}>
            Bookmarks
          </NavLink>
        </Box>

        {isAuthenticated && user && (
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.email}
          </Typography>
        )}

        {!isAuthenticated && (
          <Button color="inherit" onClick={() => void login(window.location.pathname)}>
            Log in
          </Button>
        )}

        {isAuthenticated && (
          <Button color="inherit" onClick={() => void logout(window.location.origin)}>
            Log out
          </Button>
        )}

        {!isAuth0Configured && (
          <Typography variant="caption" sx={{ ml: 2, opacity: 0.7 }}>
            (Auth disabled — local dev)
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  )
}

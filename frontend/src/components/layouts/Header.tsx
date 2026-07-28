import { NavLink, useNavigate } from "react-router-dom"
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material"
import { useAuth0 } from "@auth0/auth0-react"
import { Activity } from "react"

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "white" : "rgba(255, 255, 255, 0.85)",
  backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
  textDecoration: "none",
  padding: "6px 16px",
  borderRadius: "4px",
  fontWeight: isActive ? 600 : 400,
  transition: "background-color 0.2s",
})

export default function Header() {
  const navigate = useNavigate()
  const { logout, isLoading, user } = useAuth0()

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="div" sx={{ mr: 4, cursor: "pointer", fontWeight: 700 }} onClick={() => { navigate("/") }}>
          BBL Bookmarks
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexGrow: 1 }}>
          <NavLink to="/collections" style={({ isActive }) => navLinkStyle({ isActive })}>
            Collections
          </NavLink>
          <NavLink to="/bookmarks" style={({ isActive }) => navLinkStyle({ isActive })}>
            Bookmarks
          </NavLink>
        </Box>

        <Activity mode={isLoading || user ? "visible" : "hidden"}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
        </Activity>

        <Activity mode={isLoading || !user ? "hidden" : "visible"}>
          <Button color="inherit" onClick={() => logout()} children="Sign Out" />
        </Activity>
      </Toolbar>
    </AppBar>
  )
}

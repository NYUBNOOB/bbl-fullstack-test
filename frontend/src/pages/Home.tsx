import { Typography, Button, Stack, Paper, Box } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { Activity } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const { loginWithRedirect, user } = useAuth0()

  return (
    <Box>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }} children="Welcome to BBL Bookmark Manager" />
      <Typography variant="body1" color="text.secondary">
        A private-by-default bookmark manager. Your collections and bookmarks
        stay your own — nobody else can see, edit, or even know they exist.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Activity mode={!user ? "visible" : "hidden"}>
          <Button
            size="large"
            variant="contained"
            children="Sign In"
            onClick={() => loginWithRedirect()}
          />
        </Activity>
        <Activity mode={user ? "visible" : "hidden"}>
          <Button
            variant="contained"
            size="large"
            children="Go to Collections"
            onClick={() => navigate("/collections")}
          />
          <Button
            variant="outlined"
            size="large"
            children="Go to Bookmarks"
            onClick={() => navigate("/bookmarks")}
          />
        </Activity>
      </Stack>

      <Paper elevation={0} sx={{ mt: 4, p: 3, bgcolor: 'action.hover' }}>
        <Typography variant="h6" gutterBottom children="🛡️ Security Model" />
        <Typography variant="body2">
          Every API request proves ownership via an Auth0 token. Even if the
          API layer has a bug, the database's compound foreign keys prevent
          cross-owner reads — User A truly cannot touch User B's data.
        </Typography>
      </Paper>
    </Box>
  );
}

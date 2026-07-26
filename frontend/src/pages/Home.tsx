import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button, Stack, Paper, Box } from '@mui/material';

export default function Home() {
  return (
    <Box>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }} children="Welcome to BBL Bookmark Manager" />
      <Typography variant="body1" color="text.secondary">
        A private-by-default bookmark manager. Your collections and bookmarks
        stay your own — nobody else can see, edit, or even know they exist.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          component={RouterLink}
          to="/collections"
          variant="contained"
          size="large"
          children="Go to Collections"
        />
        <Button
          component={RouterLink}
          to="/bookmarks"
          variant="outlined"
          size="large"
          children="Go to Bookmarks"
        />
      </Stack>

      <Paper elevation={0} sx={{ mt: 6, p: 3, bgcolor: 'action.hover' }}>
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

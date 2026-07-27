import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from './theme';

import Router from './router';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './stores/auth';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )

}

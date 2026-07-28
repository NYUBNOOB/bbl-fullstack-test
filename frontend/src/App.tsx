import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from './theme';

import Router from './router';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './stores/auth';
import { AxiosAuthSetup } from './components/auth/axiosAuthSetup';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AxiosAuthSetup>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router />
          </ThemeProvider>
        </AxiosAuthSetup>
      </AuthProvider>
    </BrowserRouter>
  )

}

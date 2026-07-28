import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenProvider, setUnauthorizedHandler } from "@/libs/axiosConfig";

interface AxiosAuthSetupProps {
  children: ReactNode;
}

export function AxiosAuthSetup({ children }: AxiosAuthSetupProps) {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();

  useEffect(() => {
    setTokenProvider(async () => {
      try {
        return await getAccessTokenSilently();
      } catch (error) {
        // Expected while signed out; a real failure here (e.g. the requested
        // audience has no registered API, so Auth0 refuses to mint a token)
        // is otherwise invisible, so say it out loud.
        console.warn('Could not obtain an access token', error);
        return null;
      }
    });

    setUnauthorizedHandler(({ hadToken }) => {
      // We DID send a token and the API rejected it anyway. Logging in again
      // mints the very same token and earns the very same 401, so redirecting
      // here would put the user in an endless consent-screen loop. Report it
      // instead — this is a configuration bug, not a missing session.
      if (hadToken) {
        console.error(
          'API rejected our access token (401). This is almost always an ' +
          'audience mismatch: VITE_AUTH0_AUDIENCE, the backend AUTH0_AUDIENCE, ' +
          'and the API Identifier in the Auth0 dashboard must be byte-identical. ' +
          'Not redirecting to login — a new token would be rejected the same way.',
        );
        return;
      }

      // No token went out at all, so there is genuinely no session. This is
      // the one case a login redirect can actually repair.
      void loginWithRedirect({
        appState: {
          returnTo: window.location.pathname + window.location.search,
        },
      });
    });
  }, [getAccessTokenSilently, loginWithRedirect]);

  return <>{children}</>;
}

import { loadAuthConfig, AuthConfigError } from './auth.config';

/**
 * These assertions guard the fail-closed property: a deployment missing its
 * Auth0 settings must refuse to boot, never start in a permissive state.
 */
describe('loadAuthConfig', () => {
  const valid = {
    AUTH0_ISSUER_URL: 'https://tenant.us.auth0.com/',
    AUTH0_AUDIENCE: 'https://bbl-bookmarks/api',
  } as NodeJS.ProcessEnv;

  it('derives the JWKS URI from the issuer', () => {
    const cfg = loadAuthConfig(valid);
    expect(cfg.issuer).toBe('https://tenant.us.auth0.com/');
    expect(cfg.audience).toBe('https://bbl-bookmarks/api');
    expect(cfg.jwksUri).toBe(
      'https://tenant.us.auth0.com/.well-known/jwks.json',
    );
  });

  it('normalises a missing trailing slash on the issuer', () => {
    // Auth0's `iss` claim always ends in "/". A config value written without
    // one must still compare equal, or every token is rejected.
    const cfg = loadAuthConfig({
      ...valid,
      AUTH0_ISSUER_URL: 'https://tenant.us.auth0.com',
    });
    expect(cfg.issuer).toBe('https://tenant.us.auth0.com/');
  });

  it('throws when the issuer is missing', () => {
    expect(() =>
      loadAuthConfig({ AUTH0_AUDIENCE: 'x' } as NodeJS.ProcessEnv),
    ).toThrow(AuthConfigError);
  });

  it('throws when the audience is missing', () => {
    // Without an audience check, a token minted for any other API in the same
    // tenant would be accepted here.
    expect(() =>
      loadAuthConfig({
        AUTH0_ISSUER_URL: 'https://tenant.us.auth0.com/',
      } as NodeJS.ProcessEnv),
    ).toThrow(AuthConfigError);
  });

  it('treats whitespace-only values as missing', () => {
    expect(() =>
      loadAuthConfig({
        AUTH0_ISSUER_URL: '   ',
        AUTH0_AUDIENCE: 'x',
      } as NodeJS.ProcessEnv),
    ).toThrow(AuthConfigError);
  });

  it('rejects a plaintext http issuer', () => {
    // Signing keys fetched over http could be substituted in transit.
    expect(() =>
      loadAuthConfig({
        ...valid,
        AUTH0_ISSUER_URL: 'http://tenant.us.auth0.com/',
      }),
    ).toThrow(AuthConfigError);
  });
});

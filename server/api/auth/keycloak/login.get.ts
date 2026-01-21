export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const settings = await storage.getItem('global') || {};
  const keycloakConfig = settings.keycloak || {};

  if (!keycloakConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keycloak SSO is not enabled'
    });
  }

  if (!keycloakConfig.realm || !keycloakConfig.clientId || !keycloakConfig.authUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keycloak is not properly configured'
    });
  }

  const config = useRuntimeConfig();
  const callbackUrl = keycloakConfig.callbackUrl || `${config.public?.appUrl || 'http://localhost:3000'}/api/auth/keycloak/callback`;
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(keycloakConfig.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', keycloakConfig.clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const sessionData = {
    state,
    codeVerifier,
    callbackUrl,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId
  };

  setCookie(event, 'keycloak_oauth_state', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  return sendRedirect(event, authUrl.toString());
});

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest).toString('base64url');
}

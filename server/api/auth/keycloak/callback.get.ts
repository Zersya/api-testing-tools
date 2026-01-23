import jwt from 'jsonwebtoken';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface KeycloakUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code as string;
  const state = query.state as string;
  const error = query.error as string;
  const errorDescription = query.error_description as string;

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: errorDescription || error
    });
  }

  if (!code || !state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code or state'
    });
  }

  const storage = useStorage('settings');
  const settings = await storage.getItem('global') || {};
  const keycloakConfig = settings.keycloak || {};

  if (!keycloakConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keycloak SSO is not enabled'
    });
  }

  const stateCookie = getCookie(event, 'keycloak_oauth_state');
  if (!stateCookie) {
    throw createError({
      statusCode: 400,
      statusMessage: 'OAuth state expired. Please try logging in again.'
    });
  }

  let sessionData: any;
  try {
    sessionData = JSON.parse(stateCookie);
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid OAuth state'
    });
  }

  if (state !== sessionData.state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'State mismatch - potential CSRF attack'
    });
  }

  deleteCookie(event, 'keycloak_oauth_state');

  const tokenUrl = keycloakConfig.tokenUrl;
  if (!tokenUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Keycloak token URL not configured'
    });
  }

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: sessionData.callbackUrl,
    client_id: sessionData.clientId,
    code_verifier: sessionData.codeVerifier
  };

  if (keycloakConfig.clientSecret) {
    body.client_secret = keycloakConfig.clientSecret;
  }

  let tokenResponse: KeycloakTokenResponse;
  try {
    const tokenFetchResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(body).toString()
    });

    tokenResponse = await tokenFetchResponse.json();

    if (tokenResponse.error) {
      throw createError({
        statusCode: 400,
        statusMessage: tokenResponse.error_description || tokenResponse.error
      });
    }
  } catch (fetchError: any) {
    if (fetchError.statusCode) throw fetchError;
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to exchange authorization code for tokens'
    });
  }

  let userInfo: KeycloakUserInfo | null = null;
  if (keycloakConfig.userInfoUrl && tokenResponse.access_token) {
    try {
      const userInfoResponse = await fetch(keycloakConfig.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`,
          'Accept': 'application/json'
        }
      });

      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      }
    } catch (e) {
      console.warn('Failed to fetch user info from Keycloak');
    }
  }

  const userPayload = {
    sub: userInfo?.sub || 'unknown',
    email: userInfo?.email || '',
    name: userInfo?.name || userInfo?.preferred_username || '',
    username: userInfo?.preferred_username || '',
    givenName: userInfo?.given_name || '',
    familyName: userInfo?.family_name || '',
    picture: userInfo?.picture || '',
    idToken: tokenResponse.id_token || ''
  };

  const jwtPayload = {
    email: userPayload.email,
    name: userPayload.name,
    sub: userPayload.sub,
    authMethod: 'keycloak',
    realm: sessionData.realm
  };

  const jwtSecret = keycloakConfig.clientSecret || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'JWT_SECRET or clientSecret must be configured for Keycloak authentication'
    });
  }

  const token = jwt.sign(jwtPayload, jwtSecret, {
    expiresIn: tokenResponse.expires_in || 3600
  });

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: tokenResponse.expires_in || 3600
  });

  const userInfoCookie = Buffer.from(JSON.stringify(userPayload)).toString('base64');
  setCookie(event, 'user_info', userInfoCookie, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: tokenResponse.expires_in || 3600
  });

  return sendRedirect(event, '/admin');
});

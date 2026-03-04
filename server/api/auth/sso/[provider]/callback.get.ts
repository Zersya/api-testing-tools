import jwt from 'jsonwebtoken';
import type { SsoConfig, SsoProvider, KeycloakProvider, AzureProvider, GenericOIDCProvider } from '../../../../../app/types/sso';
import { DEFAULT_OAUTH_ENDPOINTS, getAzureEndpoints, getKeycloakEndpoints } from '../../../../../app/types/sso';
import { db, schema } from '../../../../db';
import { eq, and, isNull } from 'drizzle-orm';
import { getHeader, getRequestURL } from 'h3';

// Import session store from login handler (shared memory)
// Note: In production, use Redis or a database for session storage
declare global {
  var ssoSessionStore: Map<string, any> | undefined;
}

// Initialize global session store if not exists
if (!global.ssoSessionStore) {
  global.ssoSessionStore = new Map<string, any>();

  // Clean up old sessions every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of global.ssoSessionStore!.entries()) {
      if (now - value.createdAt > 10 * 60 * 1000) { // 10 minutes
        global.ssoSessionStore!.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

const sessionStore = global.ssoSessionStore;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface UserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  login?: string; // GitHub
  avatar_url?: string; // GitHub
}

export default defineEventHandler(async (event) => {
  try {
  const providerType = getRouterParam(event, 'provider');
  const query = getQuery(event);
  const code = query.code as string;
  const state = query.state as string;
  const error = query.error as string;
  const errorDescription = query.error_description as string;

  console.log(`[SSO Callback] Provider: ${providerType}, Code: ${code ? 'present' : 'missing'}, State: ${state ? 'present' : 'missing'}, Error: ${error || 'none'}`);

  if (error) {
    console.error(`[SSO Callback] Error from provider: ${errorDescription || error}`);
    throw createError({
      statusCode: 400,
      statusMessage: errorDescription || error
    });
  }

  if (!code || !state) {
    console.error(`[SSO Callback] Missing code or state`);
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code or state'
    });
  }

  // Get session data from cookie or session store
  let stateCookie = getCookie(event, 'sso_oauth_state');
  const allCookies = getHeader(event, 'cookie') || '';
  console.log(`[SSO Callback] State cookie: ${stateCookie ? 'present' : 'missing'}`);
  console.log(`[SSO Callback] All cookies header: ${allCookies.substring(0, 200)}...`);
  console.log(`[SSO Callback] User-Agent: ${getHeader(event, 'user-agent')?.substring(0, 100)}`);
  console.log(`[SSO Callback] Looking for state: ${state.substring(0, 8)}...`);

  let sessionData: any;

  if (stateCookie) {
    try {
      sessionData = JSON.parse(stateCookie);
      console.log(`[SSO Callback] Using cookie session data`);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid OAuth state'
      });
    }
  } else {
    // Try session store as fallback
    console.log(`[SSO Callback] Cookie missing, checking session store. Store size: ${sessionStore.size}`);
    console.log(`[SSO Callback] Available states: ${Array.from(sessionStore.keys()).map(s => s.substring(0, 8)).join(', ')}`);

    sessionData = sessionStore.get(state);
    if (sessionData) {
      console.log(`[SSO Callback] Found session in store`);
    } else {
      console.error(`[SSO Callback] Session not found in store`);
      throw createError({
        statusCode: 400,
        statusMessage: 'OAuth state expired. Please try logging in again.'
      });
    }
  }

  if (state !== sessionData.state) {
    console.error(`[SSO Callback] State mismatch. Expected: ${sessionData.state}, Got: ${state}`);
    throw createError({
      statusCode: 400,
      statusMessage: 'State mismatch - potential CSRF attack'
    });
  }

  console.log(`[SSO Callback] State validation successful`);

  // Determine if we're in Tauri desktop app
  const userAgent = getHeader(event, 'user-agent') || '';
  const isTauri = userAgent.includes('Tauri') || userAgent.includes('tauri');

  console.log(`[SSO Callback] isTauri: ${isTauri}, User-Agent: ${userAgent.substring(0, 50)}`);
  console.log(`[SSO Callback] Session data callbackUrl: ${sessionData.callbackUrl?.substring(0, 50)}...`);

  // Clear the state cookie and session store
  deleteCookie(event, 'sso_oauth_state');
  sessionStore.delete(state);
  console.log(`[SSO Callback] Session cleared from store`);

  // Get provider configuration from database
  console.log(`[SSO Callback] Fetching SSO config from database...`);
  let setting: any;
  try {
    setting = (await db
      .select()
      .from(schema.settings)
      .where(
        and(
          eq(schema.settings.key, 'sso_config'),
          isNull(schema.settings.workspaceId)
        )
      )
      .limit(1))[0];
    console.log(`[SSO Callback] Database query successful`);
  } catch (dbError: any) {
    console.error(`[SSO Callback] Database query failed:`, dbError.message);
    throw dbError;
  }
  
  // Parse SSO config, handling both string and object formats
  let rawConfig = setting?.value;
  if (typeof rawConfig === 'string') {
    rawConfig = JSON.parse(rawConfig);
  }
  const config: SsoConfig = (rawConfig as SsoConfig) || { providers: [], allowMultipleProviders: true };
  
  if (!config.providers || config.providers.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SSO configuration not found'
    });
  }

  const provider = config.providers.find((p: SsoProvider) => p.id === sessionData.providerId);
  
  if (!provider || !provider.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SSO provider is not enabled'
    });
  }

  // Get token endpoint
  let tokenUrl: string;
  let userInfoUrl: string | undefined;

  switch (provider.type) {
    case 'keycloak': {
      const keycloakProvider = provider as KeycloakProvider;
      const endpoints = getKeycloakEndpoints(keycloakProvider.baseUrl, keycloakProvider.realm);
      tokenUrl = endpoints.tokenUrl;
      userInfoUrl = endpoints.userInfoUrl;
      break;
    }
    case 'azure': {
      const azureProvider = provider as AzureProvider;
      const endpoints = getAzureEndpoints(azureProvider.tenantId);
      tokenUrl = endpoints.tokenUrl;
      userInfoUrl = endpoints.userInfoUrl;
      break;
    }
    case 'google':
    case 'github': {
      const endpoints = DEFAULT_OAUTH_ENDPOINTS[provider.type];
      tokenUrl = endpoints.tokenUrl;
      userInfoUrl = endpoints.userInfoUrl;
      break;
    }
    case 'oidc': {
      const oidcProvider = provider as GenericOIDCProvider;
      tokenUrl = oidcProvider.tokenUrl;
      userInfoUrl = oidcProvider.userInfoUrl;
      break;
    }
    default:
      throw createError({
        statusCode: 400,
        statusMessage: 'Unsupported provider type'
      });
  }

  // Exchange code for tokens
  const tokenBody: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: sessionData.callbackUrl,
    client_id: provider.clientId,
    code_verifier: sessionData.codeVerifier
  };

  if (provider.clientSecret) {
    tokenBody.client_secret = provider.clientSecret;
  }

  let tokenResponse: TokenResponse;
  try {
    console.log(`[SSO Callback] Exchanging code for tokens at: ${tokenUrl.substring(0, 50)}...`);
    const tokenFetchResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenBody).toString()
    });

    console.log(`[SSO Callback] Token response status: ${tokenFetchResponse.status}`);
    tokenResponse = await tokenFetchResponse.json();
    console.log(`[SSO Callback] Token response received:`, tokenResponse.error ? `Error: ${tokenResponse.error}` : 'Success');

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

  // Fetch user info
  let userInfo: UserInfo | null = null;
  if (userInfoUrl && tokenResponse.access_token) {
    try {
      const userInfoResponse = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`,
          'Accept': 'application/json'
        }
      });

      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      }
    } catch {
      console.warn('Failed to fetch user info from provider');
    }
  }

  // Normalize user info based on provider
  const normalizedUserInfo = normalizeUserInfo(userInfo, provider.type);
  console.log(`[SSO Callback] User info normalized:`, { sub: normalizedUserInfo.sub, email: normalizedUserInfo.email });

  // Create JWT - always use the global JWT secret for consistency
  const runtimeConfig = useRuntimeConfig();
  const jwtSecret = runtimeConfig.jwtSecret;

  const jwtPayload = {
    email: normalizedUserInfo.email,
    name: normalizedUserInfo.name,
    sub: normalizedUserInfo.sub,
    authMethod: provider.type,
    providerId: provider.id,
    providerName: provider.name
  };

  console.log(`[SSO Callback] Creating JWT...`);
  let token: string;
  try {
    token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: tokenResponse.expires_in || 3600
    });
    console.log(`[SSO Callback] JWT created successfully`);
  } catch (jwtError: any) {
    console.error(`[SSO Callback] JWT signing failed:`, jwtError.message);
    throw jwtError;
  }

  // Set cookies - use lax for localhost (sameSite: 'none' requires secure: true)
  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: false, // Must be false for localhost
    sameSite: 'lax',
    path: '/',
    maxAge: tokenResponse.expires_in || 3600
  });

  const userInfoCookie = Buffer.from(JSON.stringify(normalizedUserInfo)).toString('base64');
  setCookie(event, 'user_info', userInfoCookie, {
    httpOnly: false,
    secure: false, // Must be false for localhost
    sameSite: 'lax',
    path: '/',
    maxAge: tokenResponse.expires_in || 3600
  });

  // Get redirect URL from session data
  let redirectUrl = sessionData.redirectUrl || '/admin';

  // Check if this is an AJAX/fetch request (client-side handler)
  const acceptHeader = getHeader(event, 'accept') || '';
  const isFetch = acceptHeader.includes('application/json') || getHeader(event, 'x-requested-with') === 'XMLHttpRequest';

  console.log(`[SSO Callback] Authentication successful, redirectUrl: ${redirectUrl}, isFetch: ${isFetch}`);

  if (isFetch) {
    // Return JSON for client-side handler
    return {
      success: true,
      redirectUrl,
      user: normalizedUserInfo
    };
  }

  // Server-side redirect
  return sendRedirect(event, redirectUrl);
  } catch (e: any) {
    console.error('[SSO Callback] UNEXPECTED ERROR:', e);
    console.error('[SSO Callback] Error stack:', e.stack);
    throw createError({
      statusCode: 500,
      statusMessage: `SSO Error: ${e.message || 'Unknown error'}`
    });
  }
});

function normalizeUserInfo(userInfo: UserInfo | null, providerType: string): {
  sub: string;
  email: string;
  name: string;
  username: string;
  givenName: string;
  familyName: string;
  picture: string;
  idToken: string;
} {
  if (!userInfo) {
    return {
      sub: 'unknown',
      email: '',
      name: '',
      username: '',
      givenName: '',
      familyName: '',
      picture: '',
      idToken: ''
    };
  }

  // GitHub uses different field names
  if (providerType === 'github') {
    return {
      sub: userInfo.sub || String(userInfo.login || ''),
      email: userInfo.email || '',
      name: userInfo.name || userInfo.login || '',
      username: userInfo.login || '',
      givenName: '',
      familyName: '',
      picture: userInfo.avatar_url || '',
      idToken: ''
    };
  }

  return {
    sub: userInfo.sub || 'unknown',
    email: userInfo.email || '',
    name: userInfo.name || userInfo.preferred_username || '',
    username: userInfo.preferred_username || '',
    givenName: userInfo.given_name || '',
    familyName: userInfo.family_name || '',
    picture: userInfo.picture || '',
    idToken: ''
  };
}

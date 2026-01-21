interface TokenExchangeBody {
  tokenUrl: string;
  grantType: string;
  code?: string;
  refreshToken?: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TokenExchangeBody>(event);

  if (!body.tokenUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token URL is required'
    });
  }

  if (!body.grantType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Grant type is required'
    });
  }

  if (!body.clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Client ID is required'
    });
  }

  if (!body.redirectUri) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Redirect URI is required'
    });
  }

  const formData: Record<string, string> = {
    grant_type: body.grantType,
    client_id: body.clientId,
    redirect_uri: body.redirectUri
  };

  if (body.clientSecret) {
    formData.client_secret = body.clientSecret;
  }

  if (body.grantType === 'authorization_code') {
    if (!body.code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Authorization code is required for authorization_code grant'
      });
    }
    formData.code = body.code;
    if (body.codeVerifier) {
      formData.code_verifier = body.codeVerifier;
    }
  } else if (body.grantType === 'refresh_token') {
    if (!body.refreshToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Refresh token is required for refresh_token grant'
      });
    }
    formData.refresh_token = body.refreshToken;
  }

  try {
    const response = await fetch(body.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(formData).toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: data.error_description || data.error || 'Token exchange failed'
      });
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
      scope: data.scope
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Token exchange error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to exchange token'
    });
  }
});

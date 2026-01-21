export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const settings = await storage.getItem('global') || {};
  const keycloakConfig = settings.keycloak || {};

  deleteCookie(event, 'auth_token');
  deleteCookie(event, 'user_info');

  if (keycloakConfig.enabled && keycloakConfig.logoutUrl) {
    const query = getQuery(event);
    const redirectTo = query.redirect || '/login';
    const logoutUrl = new URL(keycloakConfig.logoutUrl);
    logoutUrl.searchParams.set('post_logout_redirect_uri', getRequestURL(event).origin + redirectTo);

    return sendRedirect(event, logoutUrl.toString());
  }

  return sendRedirect(event, '/login');
});

export default defineEventHandler(async (event) => {
  deleteCookie(event, 'auth_token');
  deleteCookie(event, 'user_info');
  deleteCookie(event, 'sso_oauth_state');

  return sendRedirect(event, '/login');
});

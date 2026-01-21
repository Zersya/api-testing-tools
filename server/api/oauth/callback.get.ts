export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code as string;
  const state = query.state as string;
  const error = query.error as string;
  const errorDescription = query.error_description as string;

  if (error) {
    return sendRedirect(event, `/?oauth_error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return sendRedirect(event, `/?oauth_error=${encodeURIComponent('No authorization code received')}`);
  }

  return sendRedirect(event, `/?oauth_code=${encodeURIComponent(code)}&oauth_state=${encodeURIComponent(state || '')}`);
});

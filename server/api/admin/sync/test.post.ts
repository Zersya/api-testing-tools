export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { serverUrl, apiKey } = body;

  if (!serverUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Server URL is required'
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: 'Connection successful' };
    }

    return { success: false, message: `Server returned status ${response.status}` };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, message: 'Connection timed out' };
    }
    return { success: false, message: 'Could not connect to server' };
  }
});

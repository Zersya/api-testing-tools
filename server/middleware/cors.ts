export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin') || '';
  
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'tauri://localhost',
    'https://tauri.localhost',
  ];

  const isAllowed = allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );

  if (isAllowed) {
    setHeader(event, 'Access-Control-Allow-Origin', origin);
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    setHeader(event, 'Access-Control-Allow-Credentials', 'true');
  }

  if (getMethod(event) === 'OPTIONS') {
    return { ok: true };
  }
});

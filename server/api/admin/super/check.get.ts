export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  if (!user?.email) {
    return { isSuperAdmin: false };
  }
  
  const { isSuperAdmin } = await import('~~/server/utils/permissions');
  
  return {
    isSuperAdmin: isSuperAdmin(user.email)
  };
});

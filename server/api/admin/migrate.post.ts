import { migrateMocksToNewSchema, getMigrationStatus } from '../../services/migration';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (body.action === 'status') {
    const status = await getMigrationStatus();
    return status;
  }

  if (body.action === 'migrate') {
    const status = await getMigrationStatus();
    if (status.isMigrated) {
      return {
        success: false,
        message: 'Migration already completed. Use rollback first to re-migrate.',
        migrationData: status.migrationData
      };
    }

    const result = await migrateMocksToNewSchema();
    return result;
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid action. Use "status", or "migrate".'
  });
});

import { rollbackMigration, getMigrationStatus } from '../../services/migration';

export default defineEventHandler(async (event) => {
  const status = await getMigrationStatus();

  if (!status.isMigrated) {
    return {
      success: false,
      message: 'No migration to rollback'
    };
  }

  const result = await rollbackMigration();
  return result;
});

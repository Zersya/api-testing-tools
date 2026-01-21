import { getMigrationStatus } from '../../services/migration';

export default defineEventHandler(async (event) => {
  return getMigrationStatus();
});

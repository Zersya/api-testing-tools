/**
 * GET /api/admin/magic-variables
 * Returns the list of supported Postman-style dynamic (magic) variable names and descriptions.
 */

import { getMagicVariableDescriptors } from '../../utils/magic-variables';

export default defineEventHandler(() => {
  return {
    variables: getMagicVariableDescriptors(),
  };
});

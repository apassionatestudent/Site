// => src/constants/activityActions.js
// => Own copy, duplicated from the backend copy since frontend and
// => backend are separate bundlers with no module resolution between
// => them, same duplication policy used everywhere else in this project.

export const ACTIVITY_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  SOFT_DELETE: 'SOFT_DELETE',
  RESTORE: 'RESTORE',
  VOID: 'VOID',
  SUSPEND: 'SUSPEND',
  REACTIVATE: 'REACTIVATE',
  INVITE: 'INVITE',
  RESET_PASSWORD: 'RESET_PASSWORD',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  LOGIN: 'LOGIN',
  DOCUMENT_ADD: 'DOCUMENT_ADD',
  DOCUMENT_REPLACE: 'DOCUMENT_REPLACE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  RELEASE: 'RELEASE',
};
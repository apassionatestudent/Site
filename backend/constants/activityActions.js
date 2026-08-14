// => backend/constants/activityActions.js
// => Own copy, no shared file between admin and student backends per the
// => no-shared-code policy. Same 17 values as the admin backend's copy,
// => kept in sync manually whenever the taxonomy changes.

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
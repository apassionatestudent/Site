// => backend/services/Logs/logsService.js
// => Validation lives here, not in middleware, per project convention.
// => ValidationError -> 400, anything else -> 500, separation happens
// => in the controller via instanceof.
// => NOTE: this defines its own ValidationError class since I don't have
// => confirmation of a shared Utils/ValidationError.js in this codebase.
// => If you already have one, swap this import out for it.

import { pool } from '../../config/db.js';
import { ACTIVITY_ACTIONS } from '../../constants/activityActions.js';
import {
  getStudentLogs,
  getLogsTodayCountByStudentId,
  getDistinctEntityTypesByStudentId,
} from '../../models/Logs/logsModel.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_SEARCH_LENGTH = 100; // => bounds input length before it ever reaches ILIKE

const normalizePage = (rawPage) => {
  const page = Number(rawPage) || 1;
  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError('page must be a positive integer.');
  }
  return page;
};

const normalizePageSize = (rawPageSize) => {
  if (rawPageSize === undefined) return DEFAULT_PAGE_SIZE;
  const pageSize = Number(rawPageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new ValidationError('pageSize must be between 1 and 50.');
  }
  return pageSize;
};

// => Plain slice, no regex - matches project's ReDoS-prevention pattern
// => of bounding length with string methods instead of pattern matching
const normalizeSearch = (rawSearch) => {
  if (!rawSearch) return undefined;
  return String(rawSearch).trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
};

const normalizeAction = (rawAction) => {
  if (!rawAction) return undefined;
  const isValid = Object.values(ACTIVITY_ACTIONS).includes(rawAction);
  if (!isValid) {
    throw new ValidationError('Invalid action filter.');
  }
  return rawAction;
};

// => entity_type is deliberately unconstrained at the DB level per
// => project convention, so this only bounds length, it doesn't
// => validate against a fixed list
const normalizeEntityType = (rawEntityType) => {
  if (!rawEntityType) return undefined;
  return String(rawEntityType).trim().slice(0, 50) || undefined;
};

// => Single entry point the controller calls - runs all three reads in
// => parallel since they're independent of each other
export const getStudentActivityLogs = async (studentId, rawFilters) => {
  const filters = {
    page: normalizePage(rawFilters.page),
    pageSize: normalizePageSize(rawFilters.pageSize),
    search: normalizeSearch(rawFilters.search),
    entityType: normalizeEntityType(rawFilters.entityType),
    action: normalizeAction(rawFilters.action),
  };

  const [{ logs, total }, logsToday, entityTypes] = await Promise.all([
    getStudentLogs(pool, studentId, filters),
    getLogsTodayCountByStudentId(pool, studentId),
    getDistinctEntityTypesByStudentId(pool, studentId),
  ]);

  return { logs, total, logsToday, entityTypes };
};
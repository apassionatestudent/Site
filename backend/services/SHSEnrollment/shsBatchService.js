import { findOpenBatchesByClusterId } from '../../models/SHSEnrollment/shsBatchModel.js';

// => Business logic layer - validates input, calls the model.

export const getBatchesByCluster = async (clusterId) => {
  if (!clusterId) {
    const err = new Error('clusterId is required.');
    err.status = 400;
    throw err;
  }
  return findOpenBatchesByClusterId(clusterId);
};

import { findAllClusters, findCoursesByClusterId } from '../../models/SHSEnrollment/shsClusterModel.js';

// => Business logic layer - validates input, calls the model, and
// => shapes what the controller gets back. No req/res here.

export const getClusters = async () => {
  return findAllClusters();
};

export const getClusterCourses = async (clusterId) => {
  if (!clusterId) {
    // => err.status lets the controller distinguish "bad request" from
    // => "something actually broke" without string-matching messages
    const err = new Error('clusterId is required.');
    err.status = 400;
    throw err;
  }
  return findCoursesByClusterId(clusterId);
};

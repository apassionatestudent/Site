// => Shared fetch wrapper for authenticated dashboard pages. Centralizes
// => 429 handling so every page reacts the same way instead of each
// => component reinventing its own error handling for rate limits.

export class RateLimitError extends Error {
  constructor(retryAfter) {
    super('Rate limit reached');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter; // => seconds until retry is allowed
  }
}

export const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, options);

  if (response.status === 429) {
    // => Backend sends { error, message, retryAfter } - see rateLimiters.js
    const body = await response.json().catch(() => ({}));
    throw new RateLimitError(body.retryAfter || 60);
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};
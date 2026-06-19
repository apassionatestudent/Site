import { useEffect, useState } from 'react';

// => Shown in place of "Failed to fetch" when the backend returns 429.
// => Counts down from `retryAfter` seconds, then calls onRetry()
// => automatically so the user doesn't have to manually refresh.
const RateLimitNotice = ({ retryAfter, onRetry }) => {
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onRetry();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onRetry]);

  return (
    <div className="rate-limit-notice">
      <p>You're requesting this a bit too fast.</p>
      <p>Trying again automatically in <strong>{secondsLeft}s</strong>...</p>
    </div>
  );
};

export default RateLimitNotice;
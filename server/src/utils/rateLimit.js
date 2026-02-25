export function createInMemoryRateLimiter({ windowMs, maxRequests }) {
  const requestLog = new Map();

  return function rateLimit(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = requestLog.get(key) || [];
    const recent = timestamps.filter((ts) => ts > windowStart);

    if (recent.length >= maxRequests) {
      return res.status(429).json({
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${Math.floor(windowMs / 1000)} seconds.`
      });
    }

    recent.push(now);
    requestLog.set(key, recent);
    next();
  };
}

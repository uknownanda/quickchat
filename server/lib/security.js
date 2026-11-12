const defaultKey = (req) => req.ip || req.socket?.remoteAddress || "unknown";

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests. Please try again later.",
  keyGenerator = defaultKey,
  now = Date.now,
} = {}) => {
  if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isInteger(max) || max < 1) {
    throw new TypeError("Rate limiter requires a positive windowMs and integer max");
  }

  const buckets = new Map();
  let lastCleanup = 0;

  return (req, res, next) => {
    const currentTime = now();
    if (currentTime - lastCleanup > windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= currentTime) buckets.delete(key);
      }
      lastCleanup = currentTime;
    }

    const key = String(keyGenerator(req));
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= currentTime) {
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};

export const securityHeaders = (_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isValidEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isValidProfileImage = (value) =>
  typeof value === "string" &&
  value.length <= 7 * 1024 * 1024 &&
  /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value);

export const validateProfileFields = ({ fullName, bio }) => {
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 60) {
    return "Name must contain 1–60 characters.";
  }
  if (bio !== undefined && (typeof bio !== "string" || bio.length > 160)) {
    return "Bio must be 160 characters or fewer.";
  }
  return null;
};

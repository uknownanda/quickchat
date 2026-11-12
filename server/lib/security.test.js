import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, isValidEmail, isValidProfileImage, normalizeEmail, validateProfileFields } from "./security.js";

const response = () => {
  const headers = {};
  return {
    headers, statusCode: 200, body: null,
    set(name, value) { headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
};

test("rate limiter allows requests up to the configured maximum", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, keyGenerator: () => "client", now: () => 100 });
  let calls = 0;
  limiter({}, response(), () => calls++);
  limiter({}, response(), () => calls++);
  assert.equal(calls, 2);
});

test("rate limiter rejects excess requests and provides retry metadata", () => {
  const limiter = createRateLimiter({ windowMs: 10_000, max: 1, keyGenerator: () => "client", now: () => 1000 });
  limiter({}, response(), () => {});
  const res = response();
  limiter({}, res, () => assert.fail("next must not run after the limit"));
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers["Retry-After"], "10");
  assert.equal(res.body.success, false);
});

test("rate limiter resets after its window expires", () => {
  let time = 100;
  const limiter = createRateLimiter({ windowMs: 1000, max: 1, keyGenerator: () => "client", now: () => time });
  limiter({}, response(), () => {});
  time = 1200;
  const res = response();
  limiter({}, res, () => { res.allowed = true; });
  assert.equal(res.allowed, true);
});

test("rate limiter rejects invalid configuration", () => {
  assert.throws(() => createRateLimiter({ max: 0 }), TypeError);
});

test("email normalization and validation", () => {
  assert.equal(normalizeEmail("  PERSON@Example.COM "), "person@example.com");
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("x".repeat(250)), false);
});

test("profile image validator accepts supported data URLs and rejects other content", () => {
  assert.equal(isValidProfileImage("data:image/png;base64,aGVsbG8="), true);
  assert.equal(isValidProfileImage("data:text/html;base64,aGVsbG8="), false);
  assert.equal(isValidProfileImage("https://example.com/avatar.png"), false);
});

test("profile fields enforce name and bio limits", () => {
  assert.equal(validateProfileFields({ fullName: "Nanda", bio: "Hello" }), null);
  assert.match(validateProfileFields({ fullName: " " }), /Name must/);
  assert.match(validateProfileFields({ fullName: "A".repeat(61) }), /Name must/);
  assert.match(validateProfileFields({ fullName: "Nanda", bio: "x".repeat(161) }), /Bio must/);
});

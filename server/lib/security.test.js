import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, isValidChatImage, isValidEmail, isValidObjectId, isValidProfileImage, normalizeEmail, validateProfileFields } from "./security.js";

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


test("chat image validator accepts supported base64 images up to 5 MiB", () => {
  assert.equal(isValidChatImage("data:image/png;base64,aGVsbG8="), true);
  assert.equal(isValidChatImage("data:image/svg+xml;base64,aGVsbG8="), false);
  assert.equal(isValidChatImage("https://example.com/image.png"), false);
  assert.equal(isValidChatImage("data:image/png;base64,not base64!"), false);
  assert.equal(isValidChatImage("data:image/png;base64,aGVsbG8"), false);
  const oversizedPayload = "A".repeat(Math.ceil((5 * 1024 * 1024 + 1) / 3) * 4);
  assert.equal(isValidChatImage("data:image/png;base64," + oversizedPayload), false);
});


test("ObjectId validator accepts only 24-character hexadecimal IDs", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("507F1F77BCF86CD799439011"), true);
  assert.equal(isValidObjectId("not-an-id"), false);
  assert.equal(isValidObjectId("507f1f77bcf86cd79943901"), false);
  assert.equal(isValidObjectId("507f1f77bcf86cd79943901100"), false);
  assert.equal(isValidObjectId(507), false);
});

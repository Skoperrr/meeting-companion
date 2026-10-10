import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACE_READ_SCOPES,
  validateGoogleGrant,
} from "../lib/google-oauth-policy.ts";
const info = {
  aud: "client",
  sub: "user",
  scopes: [...WORKSPACE_READ_SCOPES],
  expiry_date: 2000,
};
test("unified OAuth accepts only a complete current grant for the verified client and Google identity", () => {
  validateGoogleGrant(info, "client", "user", 1000);
  assert.throws(() => validateGoogleGrant(info, "other", "user", 1000));
  assert.throws(() => validateGoogleGrant(info, "client", "other", 1000));
  assert.throws(() =>
    validateGoogleGrant(
      { ...info, scopes: info.scopes.slice(0, 2) },
      "client",
      "user",
      1000,
    ),
  );
  assert.throws(() => validateGoogleGrant(info, "client", "user", 3000));
});

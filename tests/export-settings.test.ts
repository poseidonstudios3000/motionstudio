import assert from "node:assert/strict";
import test from "node:test";
import { friendlyLocalRenderError, LOCAL_RENDER_MEDIA_TIMEOUT_MS } from "../app/export-settings";

test("gives source-frame extraction enough time for large local blobs", () => {
  assert.equal(LOCAL_RENDER_MEDIA_TIMEOUT_MS >= 120_000, true);
});

test("turns Remotion frame extraction timeouts into a useful recovery message", () => {
  const message = friendlyLocalRenderError('A delayRender() "Extracting frame at time 0 from blob:test" was not cleared after 28000ms.');
  assert.match(message, /decode a source frame in time/i);
  assert.match(message, /H\.264\/AAC/i);
});

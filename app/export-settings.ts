export const LOCAL_RENDER_MEDIA_TIMEOUT_MS = 180_000;

export const friendlyLocalRenderError = (message: string) => {
  if (/delayRender|extracting frame|timed out|timeout/i.test(message)) {
    return "The browser could not decode a source frame in time. Keep this tab active, close memory-heavy tabs, and retry. If it repeats, normalize the source to H.264/AAC.";
  }
  if (/decode|codec|media source/i.test(message)) {
    return "The uploaded codec cannot be decoded for export. Normalize it to H.264/AAC and try again.";
  }
  return message;
};

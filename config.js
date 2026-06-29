/* ----------------------------------------------------------------------------
 * Anaesthesia Compendium - site configuration
 *
 * MEDIA_BASE is the public base URL of the Cloudflare R2 bucket that holds the
 * heavy audio/video. The site builds stream URLs as:
 *     MEDIA_BASE + "/audio/" + topic.audio      (the .mp3)
 *     MEDIA_BASE + "/video/" + topic.video      (the .mp4)
 *
 * After the R2 bucket + public domain are set up, replace the placeholder below
 * with the real public URL, e.g. "https://media.anaesthesiacompendium.com"
 * or the r2.dev URL "https://pub-xxxxxxxx.r2.dev".
 * (No trailing slash.)
 * ------------------------------------------------------------------------- */
window.MEDIA_BASE = "https://pub-0c138a05f38b4967a8fd54e51607fdb8.r2.dev";

/* Channel subscribe link (YouTube / Spotify / etc.). Set this to your channel
 * URL and every "Subscribe" button on the site points to it. Leave as "" to
 * hide the subscribe call-to-action buttons until you have a link. */
window.SUBSCRIBE_URL = "";

window.SITE = {
  title: "Anaesthesia Compendium",
  tagline: "Viva-style oral exam revision — watch, listen, read",
  subscribeURL: () => window.SUBSCRIBE_URL || "",
  audioURL: (t) => `${window.MEDIA_BASE}/audio/${t.audio}`,
  videoURL: (t) => `${window.MEDIA_BASE}/video/${t.video}`,
  mediaReady: () => !String(window.MEDIA_BASE).includes("NOT-SET"),
};

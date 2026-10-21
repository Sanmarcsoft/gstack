/**
 * Strip Excalidraw's hosted-service endpoints from the bundled JS.
 *
 * @excalidraw/excalidraw ships its own app config (share links via
 * json.excalidraw.com, collab, AI, library backends, a Firebase project) and
 * fetches fonts from esm.sh when the local asset path does not serve them.
 * The render page only calls exportToSvg / convertToExcalidrawElements and
 * never needs any of them, so every endpoint is rewritten to a host under
 * the page's own non-resolving `.localhost` base and the Firebase config is
 * emptied. Nothing in this bundle can reach a public service, even if a
 * future Excalidraw version starts calling one on load.
 *
 * build.ts runs this and fails the build if any pattern in
 * BLOCKED_HOST_PATTERN survives; the drift test re-checks the committed dist.
 */

export const SINK = "https://gstack-render.localhost/blocked";

/** Hosts that must never appear in the bundle (docs links are allowed). */
export const BLOCKED_HOST_PATTERN =
  /https?:\/\/(?:json|libraries|plus|app|oss-ai|oss-collab)\.excalidraw\.com|[a-z0-9-]+\.cloudfunctions\.net|[a-z0-9-]+\.firebaseio\.com|[a-z0-9-]+\.firebaseapp\.com|[a-z0-9-]+\.appspot\.com|esm\.sh\//;

const URL_KEYS = [
  "VITE_APP_BACKEND_V2_GET_URL",
  "VITE_APP_BACKEND_V2_POST_URL",
  "VITE_APP_LIBRARY_URL",
  "VITE_APP_LIBRARY_BACKEND",
  "VITE_APP_PLUS_LP",
  "VITE_APP_PLUS_APP",
  "VITE_APP_AI_BACKEND",
  "VITE_APP_WS_SERVER_URL",
];

export function scrubPublicBackends(js: string): string {
  let out = js;
  for (const key of URL_KEYS) {
    out = out.replace(new RegExp(`${key}:"[^"]*"`, "g"), `${key}:"${SINK}/${key}"`);
  }
  // Font fallback: text falls back to the page font stack instead of a CDN fetch.
  out = out.replace(/"ASSETS_FALLBACK_URL",`https:\/\/esm\.sh\//g, '"ASSETS_FALLBACK_URL",`' + SINK + "/esm/");
  out = out.replace(/VITE_APP_FIREBASE_CONFIG:'[^']*'/g, "VITE_APP_FIREBASE_CONFIG:'{}'");
  // Any remaining bare reference (e.g. a hard-coded fallback) goes to the sink too.
  out = out.replace(new RegExp(BLOCKED_HOST_PATTERN.source, "g"), SINK);
  return out;
}

export function assertScrubbed(text: string): void {
  const hit = text.match(BLOCKED_HOST_PATTERN);
  if (hit) throw new Error(`diagram-render: public Excalidraw backend survived scrub: ${hit[0]}`);
}

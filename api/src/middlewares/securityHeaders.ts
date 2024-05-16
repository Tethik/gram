import { config } from "@gram/core/dist/config/index.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const helmet = require("helmet");

export function securityHeaders() {
  const allowedImgs: string[] = config.allowedSrc.img;
  const allowedConnects: string[] = config.allowedSrc.connect;
  const allowedAncestors: string[] = config.allowedSrc.frameAncestors;

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
        "connect-src": ["'self'", ...allowedConnects],
        // unsafe-inline is needed on style due to MUI using it... and adding a nonce/hash is complicated.
        "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        "font-src": ["https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", ...allowedImgs],
        "frame-ancestors": ["'self'", ...allowedAncestors],
        "frame-src": ["'self'"],
      },
    },
    // allows loading resources from other domains, e.g. github avatar, without explicit CORS headers set on the other domains' end https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false,
  });
}

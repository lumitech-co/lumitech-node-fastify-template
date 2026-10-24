export const HELMET_HSTS_MAX_AGE_SECONDS = 15552000;

// Swagger UI is the one HTML surface this service serves. It ships its own
// scripts and styles, so the API-wide `default-src 'none'` would blank it.
export const HELMET_DOCS_CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' https: data:",
    "img-src 'self' data: validator.swagger.io",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
].join("; ");

// helmet has no Permissions-Policy option, so the header is set by hand: a
// JSON API has no use for any powerful browser feature.
export const HELMET_PERMISSIONS_POLICY = [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "picture-in-picture=()",
    "usb=()",
    "xr-spatial-tracking=()",
].join(", ");

export const IP_BAN_KEY_PREFIX = "ipban:";

export const IP_BAN_ATTEMPTS_KEY_PREFIX = "ipban:attempts:";

export const IP_BAN_MAX_ATTEMPTS = 1;

export const IP_BAN_ATTEMPTS_WINDOW_SECONDS = 300;

export const IP_BAN_DURATION_SECONDS = 3600;

export const IP_BAN_ALLOWED_PREFIXES = ["/api/", "/.well-known/"];

export const IP_BAN_ALLOWED_PATHS = ["/", "/favicon.ico"];

export const IP_BAN_MESSAGE =
    "Access denied. If you believe this is a mistake, contact support.";

export const ROUTE_NOT_FOUND_MESSAGE = "Route not found";

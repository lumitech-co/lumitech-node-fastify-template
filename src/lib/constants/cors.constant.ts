export const CORS_WILDCARD_ORIGIN = "*";

export const CORS_MAX_AGE_SECONDS = 86400;

export const CORS_ALLOWED_METHODS = [
    "GET",
    "PUT",
    "PATCH",
    "POST",
    "DELETE",
    "OPTIONS",
];

export const CORS_EXPOSED_HEADERS = ["Content-Disposition"];

export const CORS_EMPTY_ORIGINS_ERROR =
    "CORS_ORIGINS environment variable is empty";

export const CORS_WILDCARD_ORIGIN_ERROR =
    'CORS_ORIGINS must not contain "*"; list explicit origins instead';

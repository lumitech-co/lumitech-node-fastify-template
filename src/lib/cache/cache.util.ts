import { createHash } from "node:crypto";
import {
    CreateCacheKeyPayload,
    CreateRouteCacheKeyPayload,
} from "./cache.type.js";
import {
    CACHE_KEY_HASH_LENGTH,
    CACHE_KEY_PREFIX,
    CACHE_UNCACHEABLE_HEADERS,
} from "./cache.constant.js";

const KEY_SEGMENT_SEPARATOR = "|";

export const createCacheKey = ({
    namespace,
    segments,
}: CreateCacheKeyPayload): string => {
    const hash = createHash("sha256")
        .update(segments.join(KEY_SEGMENT_SEPARATOR))
        .digest("hex")
        .slice(0, CACHE_KEY_HASH_LENGTH);

    return `${CACHE_KEY_PREFIX}:${namespace}:${hash}`;
};

/**
 * Serializes the request query deterministically. It reads the *validated*
 * `request.query` rather than the raw query string, so unknown parameters
 * stripped by the route's Zod schema cannot mint a new cache entry each time.
 */
export const serializeQuery = (query: unknown): string => {
    if (!query || typeof query !== "object") {
        return "";
    }

    return Object.entries(query)
        .filter(([, value]) => value !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(KEY_SEGMENT_SEPARATOR);
};

export const pickCacheableHeaders = (
    headers: Record<string, string | number | string[] | undefined>
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(headers)
            .filter(
                ([name, value]) =>
                    value !== undefined &&
                    !Array.isArray(value) &&
                    !CACHE_UNCACHEABLE_HEADERS.includes(name.toLowerCase())
            )
            .map(([name, value]) => [name.toLowerCase(), String(value)])
    );

export const createRouteCacheKey = ({
    request,
    options,
}: CreateRouteCacheKeyPayload): string => {
    const { pathname } = new URL(
        request.url,
        request.headers.host
            ? `http://${request.headers.host}`
            : "http://localhost"
    );

    const headers = (options.varyByHeaders ?? [])
        .map((header) => `${header}=${String(request.headers[header] ?? "")}`)
        .join(KEY_SEGMENT_SEPARATOR);

    const namespace =
        options.namespace ??
        `${request.method}:${request.routeOptions.url ?? pathname}`;

    return createCacheKey({
        namespace,
        segments: [
            request.method,
            pathname,
            serializeQuery(request.query),
            headers,
            options.varyBy?.(request) ?? "",
        ],
    });
};

import { createHash } from "node:crypto";
import {
    CreateCacheKeyPayload,
    CreateRouteCacheKeyPayload,
} from "./cache.type.js";
import {
    CACHE_KEY_HASH_LENGTH,
    CACHE_KEY_PREFIX,
    CACHE_KEY_SEGMENT_SEPARATOR,
} from "./cache.constant.js";

export const createCacheKey = ({
    namespace,
    segments,
}: CreateCacheKeyPayload): string => {
    const hash = createHash("sha256")
        .update(segments.join(CACHE_KEY_SEGMENT_SEPARATOR))
        .digest("hex")
        .slice(0, CACHE_KEY_HASH_LENGTH);

    return `${CACHE_KEY_PREFIX}:${namespace}:${hash}`;
};

export const createRouteCacheKey = ({
    request,
    options,
}: CreateRouteCacheKeyPayload): string => {
    const { searchParams, pathname } = new URL(
        request.url,
        request.headers.host
            ? `http://${request.headers.host}`
            : "http://localhost"
    );

    searchParams.sort();

    const headers = (options.varyByHeaders ?? [])
        .map((header) => `${header}=${String(request.headers[header] ?? "")}`)
        .join(CACHE_KEY_SEGMENT_SEPARATOR);

    const namespace =
        options.namespace ??
        `${request.method}:${request.routeOptions.url ?? pathname}`;

    return createCacheKey({
        namespace,
        segments: [
            request.method,
            pathname,
            searchParams.toString(),
            headers,
            options.varyBy?.(request) ?? "",
        ],
    });
};

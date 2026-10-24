import https from "node:https";
import { isIP } from "node:net";
import type { ZodType } from "zod";
import { Resolver } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import type { IncomingMessage } from "node:http";
import { isBlockedAddress, parseSafeFetchUrl } from "./safeFetch.util.js";
import {
    HTTP_OK,
    IP_LITERAL_NONE,
    IPV4_FAMILY,
    IPV6_FAMILY,
    JSON_MEDIA_TYPE,
    REDIRECT_STATUS_END,
    REDIRECT_STATUS_MIN,
} from "./safeFetch.constant.js";
import type {
    CreateHostResolver,
    ReadBodyPayload,
    ResolvePinnedAddressPayload,
    SafeFetchDeps,
    SafeFetchFailed,
    SafeFetchFailure,
    SafeFetchPayload,
    SafeFetchResult,
} from "./safeFetch.type.js";

const failure = (reason: SafeFetchFailure): SafeFetchFailed => ({
    ok: false,
    reason,
    status: null,
});

/**
 * c-ares rather than `dns.lookup`: getaddrinfo holds a libuv threadpool slot
 * the fetch deadline cannot cancel. An IP literal has nothing to resolve.
 */
export const createResolveHost =
    (createResolver: CreateHostResolver): SafeFetchDeps["resolveHost"] =>
    async ({ hostname, timeoutMs }) => {
        const family = isIP(hostname);

        if (family !== IP_LITERAL_NONE) {
            return [{ address: hostname, family }];
        }

        const resolver = createResolver({ timeout: timeoutMs, tries: 1 });

        const [v4, v6] = await Promise.allSettled([
            resolver.resolve4(hostname),
            resolver.resolve6(hostname),
        ]);

        return [
            ...(v4.status === "fulfilled" ? v4.value : []).map((address) => ({
                address,
                family: IPV4_FAMILY,
            })),
            ...(v6.status === "fulfilled" ? v6.value : []).map((address) => ({
                address,
                family: IPV6_FAMILY,
            })),
        ];
    };

/** The socket connects to the checked address, never to a re-resolved one. */
export const pinnedLookup =
    (pinned: LookupAddress): LookupFunction =>
    (_hostname, options, callback) => {
        if (options.all) {
            callback(null, [pinned]);

            return;
        }

        callback(null, pinned.address, pinned.family);
    };

const resolvePinnedAddress = async ({
    resolveHost,
    hostname,
    timeoutMs,
}: ResolvePinnedAddressPayload): Promise<LookupAddress | SafeFetchFailed> => {
    const addresses = await resolveHost({ hostname, timeoutMs }).catch(
        (): LookupAddress[] => []
    );

    const [first] = addresses;

    if (!first) {
        return failure("dns");
    }

    return addresses.some(({ address }) => isBlockedAddress(address))
        ? failure("blocked_address")
        : first;
};

const isJsonContentType = (header: string | undefined): boolean => {
    const mediaType = header?.split(";")[0]?.trim().toLowerCase() ?? "";

    return (
        mediaType === JSON_MEDIA_TYPE ||
        (mediaType.startsWith("application/") && mediaType.endsWith("+json"))
    );
};

const responseFailure = ({
    response,
    maxBytes,
}: {
    response: IncomingMessage;
    maxBytes: number;
}): SafeFetchFailed | null => {
    const status = response.statusCode ?? 0;

    if (status >= REDIRECT_STATUS_MIN && status < REDIRECT_STATUS_END) {
        return failure("redirect");
    }

    if (status !== HTTP_OK) {
        return { ok: false, reason: "status", status };
    }

    if (!isJsonContentType(response.headers["content-type"])) {
        return failure("content_type");
    }

    return Number(response.headers["content-length"] ?? 0) > maxBytes
        ? failure("too_large")
        : null;
};

const parseBody = <T>({
    body,
    schema,
}: {
    body: Buffer;
    schema: ZodType<T>;
}): SafeFetchResult<T> => {
    try {
        const parsed = schema.safeParse(JSON.parse(body.toString("utf8")));

        return parsed.success
            ? { ok: true, body: parsed.data, cacheControl: null }
            : failure("invalid_body");
    } catch {
        return failure("invalid_json");
    }
};

const readBody = <T>({
    schema,
    request,
    url,
    hostname,
    pinned,
    maxBytes,
    signal,
}: ReadBodyPayload<T>): Promise<SafeFetchResult<T>> =>
    new Promise((resolve) => {
        const req = request({
            hostname,
            port: url.port === "" ? undefined : Number(url.port),
            path: `${url.pathname}${url.search}`,
            method: "GET",
            headers: { accept: JSON_MEDIA_TYPE },
            agent: false,
            lookup: pinnedLookup(pinned),
            signal,
        });

        const fail = (result: SafeFetchFailed) => {
            resolve(result);
            req.destroy();
        };

        req.on("error", () => {
            fail(failure("network"));
        });

        req.on("response", (response) => {
            const refused = responseFailure({ response, maxBytes });

            if (refused) {
                fail(refused);

                return;
            }

            const chunks: Buffer[] = [];
            let size = 0;

            response.on("data", (chunk: Buffer) => {
                size += chunk.length;

                if (size > maxBytes) {
                    fail(failure("too_large"));

                    return;
                }

                chunks.push(chunk);
            });

            response.on("error", () => {
                fail(failure("network"));
            });

            response.on("end", () => {
                const parsed = parseBody({
                    body: Buffer.concat(chunks),
                    schema,
                });

                resolve(
                    parsed.ok
                        ? {
                              ...parsed,
                              cacheControl:
                                  response.headers["cache-control"] ?? null,
                          }
                        : parsed
                );
            });
        });

        req.end();
    });

/**
 * GET and Zod-validate JSON from a user-supplied URL without reaching a private
 * address: DNS resolved once, every answer checked, socket pinned to it.
 * HTTPS only, no redirects, size and time capped.
 */
export const createSafeFetchJson =
    ({ resolveHost, request }: SafeFetchDeps) =>
    async <T>({
        url: rawUrl,
        schema,
        maxBytes,
        timeoutMs,
    }: SafeFetchPayload<T>): Promise<SafeFetchResult<T>> => {
        const url = parseSafeFetchUrl(rawUrl);

        if (!url) {
            return failure("invalid_url");
        }

        const controller = new AbortController();

        const deadline = new Promise<SafeFetchFailed>((resolve) => {
            controller.signal.addEventListener(
                "abort",
                () => {
                    resolve(failure("timeout"));
                },
                { once: true }
            );
        });

        const timer = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        const fetchDocument = async (): Promise<SafeFetchResult<T>> => {
            const hostname = url.hostname.replace(/^\[|\]$/gu, "");

            const pinned = await resolvePinnedAddress({
                resolveHost,
                hostname,
                timeoutMs,
            });

            if ("ok" in pinned) {
                return pinned;
            }

            return readBody({
                schema,
                request,
                url,
                hostname,
                pinned,
                maxBytes,
                signal: controller.signal,
            });
        };

        try {
            return await Promise.race([fetchDocument(), deadline]);
        } finally {
            clearTimeout(timer);
        }
    };

export const safeFetchJson = createSafeFetchJson({
    resolveHost: createResolveHost((options) => new Resolver(options)),
    request: (options) => https.request(options),
});

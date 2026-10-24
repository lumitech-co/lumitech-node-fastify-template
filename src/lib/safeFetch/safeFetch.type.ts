import type https from "node:https";
import type { ZodType } from "zod";
import type { LookupAddress } from "node:dns";
import type { ClientRequest } from "node:http";

export type SafeFetchFailure =
    | "invalid_url"
    | "dns"
    | "blocked_address"
    | "redirect"
    | "status"
    | "content_type"
    | "too_large"
    | "timeout"
    | "network"
    | "invalid_json"
    | "invalid_body";

export type SafeFetchFailed = {
    ok: false;
    reason: SafeFetchFailure;
    status: number | null;
};

export type SafeFetchResult<T> =
    | { ok: true; body: T; cacheControl: string | null }
    | SafeFetchFailed;

export type SafeFetchPayload<T> = {
    url: string;
    schema: ZodType<T>;
    maxBytes: number;
    timeoutMs: number;
};

type ResolveHostPayload = {
    hostname: string;
    timeoutMs: number;
};

export type SafeFetchDeps = {
    resolveHost: (payload: ResolveHostPayload) => Promise<LookupAddress[]>;
    request: (options: https.RequestOptions) => ClientRequest;
};

type HostResolver = {
    resolve4: (hostname: string) => Promise<string[]>;
    resolve6: (hostname: string) => Promise<string[]>;
};

export type CreateHostResolver = (options: {
    timeout: number;
    tries: number;
}) => HostResolver;

export type ReadBodyPayload<T> = {
    schema: ZodType<T>;
    request: SafeFetchDeps["request"];
    url: URL;
    hostname: string;
    pinned: LookupAddress;
    maxBytes: number;
    signal: AbortSignal;
};

export type ResolvePinnedAddressPayload = ResolveHostPayload & {
    resolveHost: SafeFetchDeps["resolveHost"];
};

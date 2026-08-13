import { ZodType } from "zod";
import { FastifyRequest } from "fastify";

export type GetCachePayload<T> = {
    key: string;
    schema?: ZodType<T>;
};

export type SetCachePayload<T> = {
    key: string;
    value: T;
    ttl: number;
};

export type RemoveCachePayload = {
    key: string;
};

export type AcquireLockPayload = {
    lockKey: string;
};

export type SleepPayload = {
    ms: number;
};

export type InvalidateCachePayload = {
    namespace: string;
};

export type WrapCachePayload<T> = {
    key: string;
    ttl: number;
    resolver: () => Promise<T>;
    schema?: ZodType<T>;
};

export type CreateCacheKeyPayload = {
    namespace: string;
    segments: string[];
};

export type CreateRouteCacheKeyPayload = {
    request: FastifyRequest;
    options: RouteCacheOptions;
};

export type RouteCacheOptions = {
    ttl?: number;
    namespace?: string;
    varyByHeaders?: string[];
    varyBy?: (request: FastifyRequest) => string | undefined;
    enabled?: (request: FastifyRequest) => boolean;
};

export type RequestCacheState = {
    key: string;
    ttl: number;
};

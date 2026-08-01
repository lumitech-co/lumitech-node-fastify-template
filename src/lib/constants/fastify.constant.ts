/**
 * Fastify plugin names
 */
export enum FastifyPlugin {
    Prisma = "prisma",
    Env = "env",
    Jwt = "jwt",
    Awilix = "awilix",
    GcpStorage = "gcpStorage",
    AwsS3 = "awsS3",
    Redis = "redis",
    RateLimit = "rateLimit",
    IpBan = "ipBan",
}

/**
 * Number of trusted reverse proxy hops in front of the app (used for
 * Fastify's trustProxy, which trims that many entries off the right of
 * X-Forwarded-For to find the real client IP). Update this if the
 * deployment topology changes, e.g. adding a CDN in front of the load
 * balancer.
 */
export const TRUSTED_PROXY_HOPS = 1;

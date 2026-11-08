import ipaddr from "ipaddr.js";
import type { SafeFetchFailure } from "./safeFetch.type.js";

export const HTTPS_PREFIX = "https://";

// Global unicast. ipaddr.js names every private, loopback, link-local, CGNAT,
// ULA and NAT64 range, so an allow-list on "unicast" blocks ranges it learns
// later too; the IPv4-compatible ::/96 carries no name, hence this CIDR.
export const IPV6_GLOBAL_UNICAST = ipaddr.IPv6.parseCIDR("2000::/3");

export const IPV4_MAPPED_PREFIX = "::ffff:";

export const DOT_SEGMENTS: ReadonlySet<string> = new Set([".", ".."]);

export const ENCODED_DOT = "%2e";

export const HTTP_OK = 200;

export const REDIRECT_STATUS_MIN = 300;

export const REDIRECT_STATUS_END = 400;

export const SERVER_ERROR_STATUS_MIN = 500;

export const TOO_MANY_REQUESTS_STATUS = 429;

export const JSON_MEDIA_TYPE = "application/json";

export const IP_LITERAL_NONE = 0;

export const IPV4_FAMILY = 4;

export const IPV6_FAMILY = 6;

export const TRANSPORT_FAILURES: ReadonlySet<SafeFetchFailure> = new Set([
    "dns",
    "timeout",
    "network",
]);

import ipaddr from "ipaddr.js";
import type { SafeFetchFailed } from "./safeFetch.type.js";
import {
    DOT_SEGMENTS,
    ENCODED_DOT,
    HTTPS_PREFIX,
    IPV4_MAPPED_PREFIX,
    IPV6_GLOBAL_UNICAST,
    SERVER_ERROR_STATUS_MIN,
    TOO_MANY_REQUESTS_STATUS,
    TRANSPORT_FAILURES,
} from "./safeFetch.constant.js";

/**
 * Allow-list, not a deny-list: IPv6 must be global unicast (or IPv4-mapped,
 * then checked as that IPv4), and anything not plain "unicast" is refused.
 */
export const isBlockedAddress = (address: string): boolean => {
    if (!ipaddr.isValid(address)) {
        return true;
    }

    if (ipaddr.IPv6.isValid(address)) {
        const v6 = ipaddr.IPv6.parse(address);

        // ipaddr.js reads "::1.2.3.4" (IPv4-compatible) as IPv4-mapped; the
        // socket does not, so dotted IPv4 inside IPv6 is only trusted as ::ffff:.
        const mapped =
            v6.isIPv4MappedAddress() &&
            (!address.includes(".") ||
                address.toLowerCase().startsWith(IPV4_MAPPED_PREFIX));

        if (!mapped && !v6.match(IPV6_GLOBAL_UNICAST)) {
            return true;
        }
    }

    return ipaddr.process(address).range() !== "unicast";
};

/**
 * Checked on the raw string: the WHATWG parser resolves `..`, reads `\` as `/`
 * and drops userinfo checks, so the parsed URL would hide what is refused.
 */
export const parseSafeFetchUrl = (raw: string): URL | null => {
    if (!raw.startsWith(HTTPS_PREFIX) || /[\\\s]/u.test(raw)) {
        return null;
    }

    const rest = raw.slice(HTTPS_PREFIX.length);
    const authority = rest.split(/[/?#]/u, 1)[0] ?? "";
    const path = rest.slice(authority.length).split(/[?#]/u, 1)[0] ?? "";

    const hasDotSegment = path
        .split("/")
        .some((segment) =>
            DOT_SEGMENTS.has(segment.toLowerCase().replaceAll(ENCODED_DOT, "."))
        );

    if (
        authority === "" ||
        authority.includes("@") ||
        hasDotSegment ||
        !URL.canParse(raw)
    ) {
        return null;
    }

    return new URL(raw);
};

/** The host may answer later (an outage, a rate limit); the rest would recur. */
export const isTransientSafeFetchFailure = ({
    reason,
    status,
}: SafeFetchFailed): boolean =>
    TRANSPORT_FAILURES.has(reason) ||
    (status !== null &&
        (status >= SERVER_ERROR_STATUS_MIN ||
            status === TOO_MANY_REQUESTS_STATUS));

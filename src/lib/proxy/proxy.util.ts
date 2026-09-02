export const resolveTrustProxy = (
    rawValue: string | undefined
): number | boolean => {
    const normalized = rawValue?.trim().toLowerCase();

    if (!normalized) {
        throw new Error(
            "TRUSTED_PROXY_HOPS is required: set it to the number of trusted " +
                "reverse-proxy hops (e.g. 1) or false when the app is exposed " +
                "directly with no proxy."
        );
    }

    if (normalized === "true" || normalized === "false") {
        return normalized === "true";
    }

    const hops = Number(normalized);

    if (!Number.isInteger(hops) || hops < 0) {
        throw new Error(
            "TRUSTED_PROXY_HOPS must be a non-negative integer (hop count) " +
                "or a boolean (true/false)."
        );
    }

    return hops;
};

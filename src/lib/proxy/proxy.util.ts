const MAX_TRUSTED_PROXY_HOPS = 10;

export const resolveTrustProxy = (rawValue: string | undefined): number => {
    const normalized = rawValue?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
        throw new Error(
            "TRUSTED_PROXY_HOPS must be a non-negative integer (number of " +
                "proxy hops); use 0 if the app is not behind a proxy."
        );
    }

    const hops = Number(normalized);

    if (hops > MAX_TRUSTED_PROXY_HOPS) {
        throw new Error(
            `TRUSTED_PROXY_HOPS must not exceed ${MAX_TRUSTED_PROXY_HOPS} ` +
                "proxy hops."
        );
    }

    return hops;
};

import { hashing } from "./hashing.js";
import { randomBytes, randomUUID } from "node:crypto";
import type { OpaqueSecret, OpaqueToken } from "./hashing.type.js";
import {
    OPAQUE_TOKEN_BYTES,
    OPAQUE_TOKEN_SEPARATOR,
} from "./hashing.constant.js";

/**
 * `<id>.<secret>`: look the row up by `id`, compare `hashToken(secret)` with the
 * stored `tokenHash`. Only the hash is persisted; the token is shown once.
 */
export const generateOpaqueToken = (): OpaqueToken => {
    const id = randomUUID();
    const secret = randomBytes(OPAQUE_TOKEN_BYTES).toString("hex");

    return {
        id,
        token: `${id}${OPAQUE_TOKEN_SEPARATOR}${secret}`,
        tokenHash: hashing.hashToken(secret),
    };
};

/** A bare secret looked up by its hash (an API key, an invite link). */
export const generateOpaqueSecret = (): OpaqueSecret => {
    const token = randomBytes(OPAQUE_TOKEN_BYTES).toString("base64url");

    return { token, tokenHash: hashing.hashToken(token) };
};

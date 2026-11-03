import argon2 from "argon2";
import { createHash, timingSafeEqual } from "node:crypto";
import type {
    ComparePasswordPayload,
    CompareSecretPayload,
} from "./hashing.type.js";

const hashPassword = (password: string): Promise<string> =>
    argon2.hash(password, {
        type: argon2.argon2id,
    });

const comparePassword = ({
    password,
    hash,
}: ComparePasswordPayload): Promise<boolean> => argon2.verify(hash, password);

/** For high-entropy random tokens only; a password goes through `hashPassword`. */
const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

/** Constant-time: both sides are hashed first, so lengths never leak or throw. */
const compareSecret = ({ secret, expected }: CompareSecretPayload): boolean =>
    timingSafeEqual(
        createHash("sha256").update(secret).digest(),
        createHash("sha256").update(expected).digest()
    );

export const hashing = {
    hashPassword,
    comparePassword,
    hashToken,
    compareSecret,
};

import argon2 from "argon2";
import type { ComparePasswordPayload } from "./hashing.type.js";

const hashPassword = (password: string): Promise<string> =>
    argon2.hash(password, {
        type: argon2.argon2id,
    });

const comparePassword = ({
    password,
    hash,
}: ComparePasswordPayload): Promise<boolean> => argon2.verify(hash, password);

export const hashing = {
    hashPassword,
    comparePassword,
};

import argon2 from "argon2";
import { ComparePasswordPayload } from "./hashing.type.js";

const hashPassword = (password: string): Promise<string> => {
    return argon2.hash(password, {
        type: argon2.argon2id,
    });
};

const comparePassword = ({
    password,
    hash,
}: ComparePasswordPayload): Promise<boolean> => {
    return argon2.verify(hash, password);
};

export const hashing = {
    hashPassword,
    comparePassword,
};

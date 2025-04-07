import argon2 from "argon2";

const hashPassword = (password: string): Promise<string> => {
    return argon2.hash(password, {
        type: argon2.argon2id,
    });
};

const comparePassword = (password: string, hash: string): Promise<boolean> => {
    return argon2.verify(hash, password);
};

export const hashing = {
    hashPassword,
    comparePassword,
};

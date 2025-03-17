import bcrypt from "bcrypt";

const HASHING_SALT_ROUNDS = 10;

const hashPassword = (password: string): string => {
    return bcrypt.hashSync(password, HASHING_SALT_ROUNDS);
};

const comparePassword = (password: string, hash: string): boolean => {
    return bcrypt.compareSync(password, hash);
};

export const hashing = {
    hashPassword,
    comparePassword,
};

export type ComparePasswordPayload = {
    password: string;
    hash: string;
};

export type CompareSecretPayload = {
    secret: string;
    expected: string;
};

export type OpaqueToken = {
    id: string;
    token: string;
    tokenHash: string;
};

export type OpaqueSecret = {
    token: string;
    tokenHash: string;
};

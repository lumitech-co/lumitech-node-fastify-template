export type EncryptSecretPayload = {
    plain: string;
    appSecret: string;
};

export type DecryptSecretPayload = {
    encrypted: string;
    appSecret: string;
};

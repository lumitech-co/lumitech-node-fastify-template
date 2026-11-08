import type {
    DecryptSecretPayload,
    EncryptSecretPayload,
} from "./secretCipher.type.js";
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "node:crypto";
import {
    SECRET_CIPHER_ALGORITHM,
    SECRET_CIPHER_AUTH_TAG_BYTES,
    SECRET_CIPHER_IV_BYTES,
    SECRET_CIPHER_PARTS,
    SECRET_CIPHER_SEPARATOR,
} from "./secretCipher.constant.js";

/** SHA-256 is a key derivation only for a high-entropy secret, never a password. */
const deriveKey = (appSecret: string): Buffer =>
    createHash("sha256").update(appSecret).digest();

/** AES-256-GCM with a random IV per call: `iv:authTag:ciphertext`, all hex. */
export const encryptSecret = ({
    plain,
    appSecret,
}: EncryptSecretPayload): string => {
    const iv = randomBytes(SECRET_CIPHER_IV_BYTES);

    const cipher = createCipheriv(
        SECRET_CIPHER_ALGORITHM,
        deriveKey(appSecret),
        iv,
        { authTagLength: SECRET_CIPHER_AUTH_TAG_BYTES }
    );

    const encrypted = Buffer.concat([
        cipher.update(plain, "utf8"),
        cipher.final(),
    ]);

    return [iv, cipher.getAuthTag(), encrypted]
        .map((part) => part.toString("hex"))
        .join(SECRET_CIPHER_SEPARATOR);
};

/** `null` for a malformed, tampered or wrong-key value; it never throws. */
export const decryptSecret = ({
    encrypted,
    appSecret,
}: DecryptSecretPayload): string | null => {
    const parts = encrypted.split(SECRET_CIPHER_SEPARATOR);
    const [iv = "", authTag = "", ciphertext = ""] = parts;

    if (parts.length !== SECRET_CIPHER_PARTS) {
        return null;
    }

    try {
        const decipher = createDecipheriv(
            SECRET_CIPHER_ALGORITHM,
            deriveKey(appSecret),
            Buffer.from(iv, "hex"),
            { authTagLength: SECRET_CIPHER_AUTH_TAG_BYTES }
        );

        decipher.setAuthTag(Buffer.from(authTag, "hex"));

        return (
            decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8")
        );
    } catch {
        return null;
    }
};

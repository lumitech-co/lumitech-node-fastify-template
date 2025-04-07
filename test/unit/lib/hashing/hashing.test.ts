import argon2 from "argon2";
import { describe, it, expect, vi } from "vitest";
import { hashing } from "@/lib/hashing/hashing.js";

// Mock argon2 to avoid actual hashing in tests
vi.mock("argon2", () => {
    return {
        default: {
            hash: vi
                .fn()
                .mockImplementation((password) =>
                    Promise.resolve(`hashed_${password}`)
                ),
            verify: vi.fn().mockImplementation((hash, password) => {
                // Simple mock implementation that checks if hash is "hashed_password"
                return Promise.resolve(hash === `hashed_${password}`);
            }),
            argon2id: 2,
        },
    };
});

describe("lib/hashing", () => {
    describe("hashPassword", () => {
        it("should hash a password using argon2id", async () => {
            const password = "securePassword123";
            const result = await hashing.hashPassword(password);

            expect(argon2.hash).toHaveBeenCalledWith(password, {
                type: 2,
            });

            expect(result).toBe(`hashed_${password}`);
        });

        it("should return different hash for different passwords", async () => {
            const password1 = "password1";
            const password2 = "password2";

            const hash1 = await hashing.hashPassword(password1);
            const hash2 = await hashing.hashPassword(password2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe("comparePassword", () => {
        it("should return true when password matches hash", async () => {
            const password = "correctPassword";
            const hash = `hashed_${password}`;

            const result = await hashing.comparePassword(password, hash);

            expect(argon2.verify).toHaveBeenCalledWith(hash, password);
            expect(result).toBe(true);
        });

        it("should return false when password doesn't match hash", async () => {
            const password = "wrongPassword";
            const hash = "hashed_correctPassword";

            const result = await hashing.comparePassword(password, hash);

            expect(argon2.verify).toHaveBeenCalledWith(hash, password);
            expect(result).toBe(false);
        });
    });

    describe("hashPassword & comparePassword", () => {
        it("should be able to verify a password that was previously hashed", async () => {
            // In a real test, we'd use the actual implementation rather than mocks
            const password = "mySecurePassword";

            const hash = await hashing.hashPassword(password);
            const isMatch = await hashing.comparePassword(password, hash);

            expect(isMatch).toBe(true);
        });

        it("should reject incorrect passwords", async () => {
            const correctPassword = "mySecurePassword";
            const wrongPassword = "notMyPassword";

            const hash = await hashing.hashPassword(correctPassword);
            const isMatch = await hashing.comparePassword(wrongPassword, hash);

            expect(isMatch).toBe(false);
        });
    });
});

import { Storage } from "@google-cloud/storage";
import { describe, expect, it, vi } from "vitest";
import { EnvConfig } from "@/types/env.type.js";
import { createGcpBucketService } from "@/lib/gcpBucket/gcpBucket.service.js";
import { GCP_BUCKET_NOT_CONFIGURED } from "@/lib/gcpBucket/gcpBucket.constant.js";

const config = { GCP_BUCKET_NAME: "test-bucket" } as EnvConfig;

const createStorageClientMock = () => {
    const fileMock = {
        delete: vi.fn(),
        getSignedUrl: vi.fn(),
    };

    const bucketMock = {
        file: vi.fn(() => fileMock),
        deleteFiles: vi.fn(),
    };

    const storageClientMock = {
        bucket: vi.fn(() => bucketMock),
    };

    return { storageClientMock, bucketMock, fileMock };
};

describe("gcpBucket.service - createGcpBucketService", () => {
    it("should delete a file by key", async () => {
        const { storageClientMock, bucketMock, fileMock } =
            createStorageClientMock();

        const gcpBucketService = createGcpBucketService(
            storageClientMock as unknown as Storage,
            config
        );

        const deletedKey = await gcpBucketService.deleteFile({
            key: "avatars/user-1.png",
        });

        expect(deletedKey).toBe("avatars/user-1.png");
        expect(bucketMock.file).toHaveBeenCalledWith("avatars/user-1.png");
        expect(fileMock.delete).toHaveBeenCalledOnce();
    });

    it("should throw when the bucket name is not configured", async () => {
        const { storageClientMock, bucketMock } = createStorageClientMock();

        const gcpBucketService = createGcpBucketService(
            storageClientMock as unknown as Storage,
            {} as EnvConfig
        );

        await expect(
            gcpBucketService.deleteFile({ key: "avatars/user-1.png" })
        ).rejects.toThrow(GCP_BUCKET_NOT_CONFIGURED);

        expect(bucketMock.file).not.toHaveBeenCalled();
    });

    it("should delete all files under a folder prefix", async () => {
        const { storageClientMock, bucketMock } = createStorageClientMock();

        const gcpBucketService = createGcpBucketService(
            storageClientMock as unknown as Storage,
            config
        );

        await gcpBucketService.deleteFolder({ prefix: "avatars/user-1/" });

        expect(bucketMock.deleteFiles).toHaveBeenCalledWith({
            prefix: "avatars/user-1/",
        });
    });

    it("should create a v4 upload signed url", async () => {
        const { storageClientMock, bucketMock, fileMock } =
            createStorageClientMock();

        fileMock.getSignedUrl.mockResolvedValue([
            "https://upload.example/signed",
        ]);

        const gcpBucketService = createGcpBucketService(
            storageClientMock as unknown as Storage,
            config
        );

        const beforeCall = Date.now();

        const url = await gcpBucketService.createUploadSignedUrl({
            key: "documents/report.pdf",
            contentType: "application/pdf",
        });

        expect(url).toBe("https://upload.example/signed");
        expect(bucketMock.file).toHaveBeenCalledWith("documents/report.pdf");

        const [options] = fileMock.getSignedUrl.mock.calls[0];

        expect(options).toMatchObject({
            version: "v4",
            action: "write",
            contentType: "application/pdf",
        });
        expect(options.expires).toBeGreaterThan(beforeCall);
    });

    it("should create a v4 read signed url", async () => {
        const { storageClientMock, bucketMock, fileMock } =
            createStorageClientMock();

        fileMock.getSignedUrl.mockResolvedValue([
            "https://read.example/signed",
        ]);

        const gcpBucketService = createGcpBucketService(
            storageClientMock as unknown as Storage,
            config
        );

        const beforeCall = Date.now();

        const url = await gcpBucketService.createReadSignedUrl({
            key: "documents/report.pdf",
        });

        expect(url).toBe("https://read.example/signed");
        expect(bucketMock.file).toHaveBeenCalledWith("documents/report.pdf");

        const [options] = fileMock.getSignedUrl.mock.calls[0];

        expect(options).toMatchObject({
            version: "v4",
            action: "read",
        });
        expect(options).not.toHaveProperty("contentType");
        expect(options.expires).toBeGreaterThan(beforeCall);
    });
});

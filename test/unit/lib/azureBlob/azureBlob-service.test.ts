import { dayjs } from "@/lib/dayjs/dayjs.util.js";
import { describe, expect, it, vi } from "vitest";
import type { EnvConfig } from "@/types/env.type.js";
import type { BlobServiceClient } from "@azure/storage-blob";
import { createAzureBlobService } from "@/lib/azureBlob/azureBlob.service.js";
import {
    BLOB_BATCH_MAX_SIZE,
    AZURE_STORAGE_CONTAINER_NOT_CONFIGURED,
} from "@/lib/azureBlob/azureBlob.constant.js";

const config = { AZURE_STORAGE_CONTAINER_NAME: "test-container" } as EnvConfig;

const createBlobClientMock = (pages: string[][] = []) => {
    const blobClientMock = {
        deleteIfExists: vi.fn(),
    };

    const blockBlobClientMock = {
        generateSasUrl: vi.fn(),
    };

    const batchClientMock = {
        deleteBlobs: vi.fn(),
    };

    const byPageMock = vi.fn(async function* () {
        for (const names of pages) {
            yield { segment: { blobItems: names.map((name) => ({ name })) } };
        }
    });

    const containerClientMock = {
        containerName: "test-container",
        getBlobClient: vi.fn(() => blobClientMock),
        getBlockBlobClient: vi.fn(() => blockBlobClientMock),
        getBlobBatchClient: vi.fn(() => batchClientMock),
        listBlobsFlat: vi.fn(() => ({ byPage: byPageMock })),
    };

    const serviceClientMock = {
        getContainerClient: vi.fn(() => containerClientMock),
    };

    const azureBlobService = createAzureBlobService(
        serviceClientMock as unknown as BlobServiceClient,
        config
    );

    return {
        azureBlobService,
        serviceClientMock,
        containerClientMock,
        blobClientMock,
        blockBlobClientMock,
        batchClientMock,
        byPageMock,
    };
};

describe("azureBlob.service - createAzureBlobService", () => {
    it("should delete a file by key including its snapshots", async () => {
        const { azureBlobService, containerClientMock, blobClientMock } =
            createBlobClientMock();

        const deletedKey = await azureBlobService.deleteFile({
            key: "avatars/user-1.png",
        });

        expect(deletedKey).toBe("avatars/user-1.png");

        expect(containerClientMock.getBlobClient).toHaveBeenCalledWith(
            "avatars/user-1.png"
        );

        expect(blobClientMock.deleteIfExists).toHaveBeenCalledWith({
            deleteSnapshots: "include",
        });
    });

    it("should throw when the container name is not configured", async () => {
        const serviceClientMock = { getContainerClient: vi.fn() };

        const azureBlobService = createAzureBlobService(
            serviceClientMock as unknown as BlobServiceClient,
            {} as EnvConfig
        );

        await expect(
            azureBlobService.deleteFile({ key: "avatars/user-1.png" })
        ).rejects.toThrow(AZURE_STORAGE_CONTAINER_NOT_CONFIGURED);

        expect(serviceClientMock.getContainerClient).not.toHaveBeenCalled();
    });

    it("should batch-delete every page of blobs under a folder prefix", async () => {
        const {
            azureBlobService,
            containerClientMock,
            batchClientMock,
            byPageMock,
        } = createBlobClientMock([["a/1.png", "a/2.png"], [], ["a/3.png"]]);

        batchClientMock.deleteBlobs.mockResolvedValue({ subResponses: [] });

        const deletedPrefix = await azureBlobService.deleteFolder({
            prefix: "a/",
        });

        expect(deletedPrefix).toBe("a/");

        expect(containerClientMock.listBlobsFlat).toHaveBeenCalledWith({
            prefix: "a/",
        });

        expect(byPageMock).toHaveBeenCalledWith({
            maxPageSize: BLOB_BATCH_MAX_SIZE,
        });

        expect(batchClientMock.deleteBlobs).toHaveBeenCalledTimes(2);
        expect(batchClientMock.deleteBlobs.mock.calls[0]![0]).toHaveLength(2);
        expect(batchClientMock.deleteBlobs.mock.calls[1]![0]).toHaveLength(1);
    });

    it("should ignore blobs already gone and throw for other batch failures", async () => {
        const { azureBlobService, batchClientMock } = createBlobClientMock([
            ["a/1.png", "a/2.png", "a/3.png"],
        ]);

        batchClientMock.deleteBlobs.mockResolvedValue({
            subResponses: [
                { status: 202 },
                { status: 404, errorCode: "BlobNotFound" },
                { status: 403, errorCode: "AuthorizationFailure" },
            ],
        });

        await expect(
            azureBlobService.deleteFolder({ prefix: "a/" })
        ).rejects.toThrow(
            'Failed to delete blobs from Azure container "test-container": a/3.png'
        );
    });

    it("should create a write SAS url for upload", async () => {
        const { azureBlobService, containerClientMock, blockBlobClientMock } =
            createBlobClientMock();

        blockBlobClientMock.generateSasUrl.mockResolvedValue(
            "https://upload.example/signed"
        );

        const beforeCall = dayjs().valueOf();

        const url = await azureBlobService.createUploadSignedUrl({
            key: "documents/report.pdf",
        });

        expect(url).toBe("https://upload.example/signed");

        expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith(
            "documents/report.pdf"
        );

        const [options] = blockBlobClientMock.generateSasUrl.mock.calls[0]!;

        expect(options.permissions.toString()).toBe("cw");
        expect(dayjs(options.expiresOn).valueOf()).toBeGreaterThan(beforeCall);
    });

    it("should create a read SAS url", async () => {
        const { azureBlobService, blockBlobClientMock } =
            createBlobClientMock();

        blockBlobClientMock.generateSasUrl.mockResolvedValue(
            "https://read.example/signed"
        );

        const url = await azureBlobService.createReadSignedUrl({
            key: "documents/report.pdf",
        });

        expect(url).toBe("https://read.example/signed");

        const [options] = blockBlobClientMock.generateSasUrl.mock.calls[0]!;

        expect(options.permissions.toString()).toBe("r");
    });
});

import { EnvConfig } from "@/types/env.type.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createS3BucketService } from "@/lib/s3Bucket/s3Bucket.service.js";
import { SIGNED_URL_EXPIRES_IN_SECONDS } from "@/lib/s3Bucket/s3Bucket.constant.js";
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const { getSignedUrlMock } = vi.hoisted(() => ({
    getSignedUrlMock: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: getSignedUrlMock,
}));

const config = { AWS_S3_BUCKET_NAME: "test-bucket" } as EnvConfig;

const createS3ClientMock = () => {
    const sendMock = vi.fn();

    return { sendMock, client: { send: sendMock } as unknown as S3Client };
};

describe("s3Bucket.service - createS3BucketService", () => {
    beforeEach(() => {
        getSignedUrlMock.mockReset();
    });

    it("should delete a file by key", async () => {
        const { sendMock, client } = createS3ClientMock();

        sendMock.mockResolvedValue({});

        const s3BucketService = createS3BucketService(client, config);

        await s3BucketService.deleteFile({ key: "avatars/user-1.png" });

        expect(sendMock).toHaveBeenCalledOnce();

        const command = sendMock.mock.calls[0][0];

        expect(command).toBeInstanceOf(DeleteObjectCommand);
        expect(command.input).toMatchObject({
            Bucket: "test-bucket",
            Key: "avatars/user-1.png",
        });
    });

    it("should delete all files under a folder prefix, across pages", async () => {
        const { sendMock, client } = createS3ClientMock();

        sendMock.mockImplementation(async (command) => {
            if (command instanceof ListObjectsV2Command) {
                if (!command.input.ContinuationToken) {
                    return {
                        Contents: [
                            { Key: "avatars/user-1/a.png" },
                            { Key: "avatars/user-1/b.png" },
                        ],
                        NextContinuationToken: "token-1",
                    };
                }

                return {
                    Contents: [{ Key: "avatars/user-1/c.png" }],
                    NextContinuationToken: undefined,
                };
            }

            return {};
        });

        const s3BucketService = createS3BucketService(client, config);

        await s3BucketService.deleteFolder({ prefix: "avatars/user-1/" });

        const listCalls = sendMock.mock.calls
            .map(([command]) => command)
            .filter((command) => command instanceof ListObjectsV2Command);

        const deleteCalls = sendMock.mock.calls
            .map(([command]) => command)
            .filter((command) => command instanceof DeleteObjectsCommand);

        expect(listCalls).toHaveLength(2);
        expect(listCalls[0].input).toMatchObject({
            Bucket: "test-bucket",
            Prefix: "avatars/user-1/",
        });
        expect(listCalls[1].input).toMatchObject({
            ContinuationToken: "token-1",
        });

        expect(deleteCalls).toHaveLength(2);
        expect(deleteCalls[0].input).toMatchObject({
            Bucket: "test-bucket",
            Delete: {
                Objects: [
                    { Key: "avatars/user-1/a.png" },
                    { Key: "avatars/user-1/b.png" },
                ],
            },
        });
        expect(deleteCalls[1].input).toMatchObject({
            Delete: { Objects: [{ Key: "avatars/user-1/c.png" }] },
        });
    });

    it("should not send a delete batch when a page has no objects", async () => {
        const { sendMock, client } = createS3ClientMock();

        sendMock.mockResolvedValue({
            Contents: [],
            NextContinuationToken: undefined,
        });

        const s3BucketService = createS3BucketService(client, config);

        await s3BucketService.deleteFolder({ prefix: "empty/" });

        expect(sendMock).toHaveBeenCalledOnce();
        expect(sendMock.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
    });

    it("should create a presigned upload url", async () => {
        const { client } = createS3ClientMock();

        getSignedUrlMock.mockResolvedValue("https://upload.example/signed");

        const s3BucketService = createS3BucketService(client, config);

        const url = await s3BucketService.createUploadSignedUrl({
            key: "documents/report.pdf",
            contentType: "application/pdf",
        });

        expect(url).toBe("https://upload.example/signed");
        expect(getSignedUrlMock).toHaveBeenCalledOnce();

        const [signedClient, command, options] = getSignedUrlMock.mock.calls[0];

        expect(signedClient).toBe(client);
        expect(command).toBeInstanceOf(PutObjectCommand);
        expect(command.input).toMatchObject({
            Bucket: "test-bucket",
            Key: "documents/report.pdf",
            ContentType: "application/pdf",
        });
        expect(options).toEqual({ expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS });
    });

    it("should create a presigned read url", async () => {
        const { client } = createS3ClientMock();

        getSignedUrlMock.mockResolvedValue("https://read.example/signed");

        const s3BucketService = createS3BucketService(client, config);

        const url = await s3BucketService.createReadSignedUrl({
            key: "documents/report.pdf",
        });

        expect(url).toBe("https://read.example/signed");
        expect(getSignedUrlMock).toHaveBeenCalledOnce();

        const [signedClient, command, options] = getSignedUrlMock.mock.calls[0];

        expect(signedClient).toBe(client);
        expect(command).toBeInstanceOf(GetObjectCommand);
        expect(command.input).toMatchObject({
            Bucket: "test-bucket",
            Key: "documents/report.pdf",
        });
        expect(options).toEqual({ expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS });
    });
});

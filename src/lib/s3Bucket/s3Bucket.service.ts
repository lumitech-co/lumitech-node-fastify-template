import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_EXPIRES_IN_SECONDS } from "./s3Bucket.constant.js";
import {
    DeleteFilePayload,
    DeleteFolderPayload,
    CreateUploadSignedUrlPayload,
    CreateReadSignedUrlPayload,
} from "./s3Bucket.type.js";
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export type S3BucketService = {
    deleteFile: (payload: DeleteFilePayload) => Promise<void>;
    deleteFolder: (payload: DeleteFolderPayload) => Promise<void>;
    createUploadSignedUrl: (
        payload: CreateUploadSignedUrlPayload
    ) => Promise<string>;
    createReadSignedUrl: (
        payload: CreateReadSignedUrlPayload
    ) => Promise<string>;
};

export const createS3BucketService = (
    awsS3Client: S3Client,
    config: EnvConfig
): S3BucketService => {
    const bucket = config.AWS_S3_BUCKET_NAME;

    return {
        deleteFile: async ({ key }) => {
            await awsS3Client.send(
                new DeleteObjectCommand({ Bucket: bucket, Key: key })
            );
        },

        deleteFolder: async ({ prefix }) => {
            let continuationToken: string | undefined;

            do {
                const listResponse = await awsS3Client.send(
                    new ListObjectsV2Command({
                        Bucket: bucket,
                        Prefix: prefix,
                        ContinuationToken: continuationToken,
                    })
                );

                const objects = (listResponse.Contents ?? [])
                    .filter(
                        (object): object is { Key: string } =>
                            typeof object.Key === "string"
                    )
                    .map(({ Key }) => ({ Key }));

                if (objects.length > 0) {
                    const deleteResponse = await awsS3Client.send(
                        new DeleteObjectsCommand({
                            Bucket: bucket,
                            Delete: { Objects: objects },
                        })
                    );

                    if (
                        deleteResponse.Errors &&
                        deleteResponse.Errors.length > 0
                    ) {
                        const failedKeys = deleteResponse.Errors.map(
                            ({ Key }) => Key
                        ).join(", ");

                        throw new Error(
                            `Failed to delete objects from S3 bucket "${bucket}": ${failedKeys}`
                        );
                    }
                }

                continuationToken = listResponse.NextContinuationToken;
            } while (continuationToken);
        },

        createUploadSignedUrl: async ({ key, contentType }) => {
            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: contentType,
            });

            return getSignedUrl(awsS3Client, command, {
                expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
            });
        },

        createReadSignedUrl: async ({ key }) => {
            const command = new GetObjectCommand({ Bucket: bucket, Key: key });

            return getSignedUrl(awsS3Client, command, {
                expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
            });
        },
    };
};

addDIResolverName(createS3BucketService, "s3BucketService");

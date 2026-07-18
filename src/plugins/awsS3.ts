import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";

const configureAwsS3 = async (fastify: FastifyInstance) => {
    const {
        AWS_REGION,
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
        AWS_S3_ENDPOINT,
    } = fastify.config;

    const s3Client = new S3Client({
        region: AWS_REGION,
        ...(AWS_S3_ENDPOINT && {
            endpoint: AWS_S3_ENDPOINT,
            forcePathStyle: true,
        }),
        ...(AWS_ACCESS_KEY_ID &&
            AWS_SECRET_ACCESS_KEY && {
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        }),
    });

    fastify.decorate("awsS3Client", s3Client);
};

export default fp(configureAwsS3, {
    name: FastifyPlugin.AwsS3,
    dependencies: [FastifyPlugin.Env],
});

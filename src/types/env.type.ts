export type EnvConfig = {
    NODE_ENV: "development" | "production" | "test";
    HOST: string;
    DATABASE_URL: string;
    PORT: number;
    APPLICATION_SECRET: string;
    APPLICATION_URL: string;
    DOCS_PASSWORD: string | undefined;
    GCP_PROJECT_ID: string | undefined;
    GCP_CLIENT_EMAIL: string | undefined;
    GCP_PRIVATE_KEY: string | undefined;
    GCP_BUCKET_NAME: string | undefined;
    GCP_STORAGE_API_ENDPOINT: string | undefined;
    AWS_REGION: string | undefined;
    AWS_ACCESS_KEY_ID: string | undefined;
    AWS_SECRET_ACCESS_KEY: string | undefined;
    AWS_S3_BUCKET_NAME: string | undefined;
    AWS_S3_ENDPOINT: string | undefined;
};

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
    GCP_BUCKET_NAME: string;
};

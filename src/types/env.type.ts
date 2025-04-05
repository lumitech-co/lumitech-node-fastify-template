export type EnvConfig = {
    NODE_ENV: "development" | "production" | "test";
    HOST: string;
    DATABASE_URL: string;
    PORT: number;
    APPLICATION_SECRET: string;
    APPLICATION_URL: string;
    DOCS_PASSWORD: string | undefined;
};

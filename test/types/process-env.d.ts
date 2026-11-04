declare namespace NodeJS {
    interface ProcessEnv {
        VITEST_POOL_ID?: string;
        INT_TEST_WORKERS?: string;
        PORT?: string;
    }
}

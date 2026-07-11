export const INTERNAL_SERVER_ERROR_STATUS_CODE = 500;

export const INTERNAL_SERVER_ERROR_RESPONSE = {
    statusCode: INTERNAL_SERVER_ERROR_STATUS_CODE,
    code: "500",
    error: "Internal Server Error",
    message: "Internal Server Error",
} as const;

import createError from "@fastify/error";

const BadRequestError = createError("400", "%s", 400);

const NotFoundError = createError("404", "%s", 404);

const ForbiddenError = createError("403", "%s", 403);

const UnauthorizedError = createError("401", "%s", 401);

const ConflictError = createError("409", "%s", 409);

const InternalServerError = createError("500", "%s", 500);

const DefaultInternalServerError = createError(
    "500",
    "Internal Server Error",
    500
);

export {
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    ConflictError,
    DefaultInternalServerError,
    BadRequestError,
    InternalServerError,
};

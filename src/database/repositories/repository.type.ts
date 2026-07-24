import { Prisma, PrismaClient } from "@prisma/client";

export type Model = Prisma.ModelName;

export type BaseRepository<T extends Uncapitalize<Model>> = {
    create: PrismaClient[T]["create"];
    createMany: PrismaClient[T]["createMany"];
    count: PrismaClient[T]["count"];
    findUnique: PrismaClient[T]["findUnique"];
    findFirst: PrismaClient[T]["findFirst"];
    update: PrismaClient[T]["update"];
    upsert: PrismaClient[T]["upsert"];
    updateMany: PrismaClient[T]["updateMany"];
    delete: PrismaClient[T]["delete"];
    findMany: PrismaClient[T]["findMany"];
    deleteMany: PrismaClient[T]["deleteMany"];
};

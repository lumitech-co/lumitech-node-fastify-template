import { Prisma } from "@prisma/client";
import { MessageWrite } from "./message.type.js";

export const toMetaInput = (meta: MessageWrite["meta"]) =>
    meta === null ? Prisma.DbNull : meta;

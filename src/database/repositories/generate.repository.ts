import { PgTable } from "drizzle-orm/pg-core";
import { count as countRows, SQL } from "drizzle-orm";
import { BaseRepository, Entity } from "./repository.type.js";
import {
    Database,
    DbExecutor,
    Transaction,
} from "@/database/drizzle/drizzle.type.js";

const toOrderBy = (orderBy: SQL | SQL[]): SQL[] =>
    Array.isArray(orderBy) ? orderBy : [orderBy];

/**
 * `select().from()` and `delete()` reject tables with an empty selection through a
 * conditional type that TypeScript cannot evaluate while the table is still a type
 * parameter. Concrete repositories are always built from a real table, so the guard
 * holds at every call site - it is silenced here once instead of at each usage.
 * */
const asQueryTable = <TTable extends PgTable>(table: TTable) =>
    table as unknown as never;

/**
 * Generate a repository for a given Drizzle table.
 * Contains the CRUD operations shared by every entity.
 *
 * Each method takes a single options object and accepts an optional `tx`, so a
 * service can open `db.transaction(...)` and still go through the repository.
 *
 * @example
 * const userRepository = generateRepository(db, users);
 *
 * const user = await userRepository.create({
 *     data: { email: "a@b.c" },
 * });
 *
 * await userRepository.delete({
 *     where: eq(users.id, user.id),
 * });
 * */
export const generateRepository = <TTable extends PgTable>(
    db: Database,
    table: TTable
): BaseRepository<TTable> => {
    const executor = (tx?: Transaction): DbExecutor => tx ?? db;

    return {
        findMany: async ({ tx, where, limit, offset, orderBy } = {}) => {
            let query = executor(tx)
                .select()
                .from(asQueryTable(table))
                .$dynamic();

            if (where) {
                query = query.where(where);
            }

            if (orderBy) {
                query = query.orderBy(...toOrderBy(orderBy));
            }

            if (limit !== undefined) {
                query = query.limit(limit);
            }

            if (offset !== undefined) {
                query = query.offset(offset);
            }

            return (await query) as Entity<TTable>[];
        },

        findFirst: async ({ tx, where, orderBy } = {}) => {
            let query = executor(tx)
                .select()
                .from(asQueryTable(table))
                .$dynamic();

            if (where) {
                query = query.where(where);
            }

            if (orderBy) {
                query = query.orderBy(...toOrderBy(orderBy));
            }

            const [row] = (await query.limit(1)) as Entity<TTable>[];

            return row;
        },

        count: async ({ tx, where } = {}) => {
            let query = executor(tx)
                .select({ value: countRows() })
                .from(asQueryTable(table))
                .$dynamic();

            if (where) {
                query = query.where(where);
            }

            const [row] = (await query) as { value: number }[];

            return row?.value ?? 0;
        },

        create: async ({ tx, data }) => {
            const [row] = (await executor(tx)
                .insert(table)
                .values(data)
                .returning()) as Entity<TTable>[];

            return row;
        },

        createMany: async ({ tx, data }) =>
            (await executor(tx)
                .insert(table)
                .values(data)
                .returning()) as Entity<TTable>[],

        update: async ({ tx, where, data }) =>
            (await executor(tx)
                .update(table)
                .set(data)
                .where(where)
                .returning()) as Entity<TTable>[],

        delete: async ({ tx, where }) =>
            (await executor(tx)
                .delete(asQueryTable(table))
                .where(where)
                .returning()) as Entity<TTable>[],
    };
};

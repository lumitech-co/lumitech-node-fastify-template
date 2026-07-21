import { SQL } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { Transaction } from "@/database/drizzle/drizzle.type.js";

/**
 * A row as it is read from the table.
 * */
export type Entity<TTable extends PgTable> = TTable["$inferSelect"];

/**
 * A row as it is written to the table - columns with a default are optional.
 * */
export type NewEntity<TTable extends PgTable> = TTable["$inferInsert"];

/**
 * Every repository method accepts an optional transaction client. When it is
 * omitted the query runs on the pooled connection.
 * */
type WithTransaction = {
    tx?: Transaction;
};

export type FindManyArgs = WithTransaction & {
    where?: SQL;
    limit?: number;
    offset?: number;
    orderBy?: SQL | SQL[];
};

export type FindFirstArgs = WithTransaction & {
    where?: SQL;
    orderBy?: SQL | SQL[];
};

export type CountArgs = WithTransaction & {
    where?: SQL;
};

export type CreateArgs<TTable extends PgTable> = WithTransaction & {
    data: NewEntity<TTable>;
};

export type CreateManyArgs<TTable extends PgTable> = WithTransaction & {
    data: NewEntity<TTable>[];
};

export type UpdateArgs<TTable extends PgTable> = WithTransaction & {
    where: SQL;
    data: Partial<NewEntity<TTable>>;
};

export type DeleteArgs = WithTransaction & {
    where: SQL;
};

/**
 * The CRUD surface every repository gets for free from `generateRepository`.
 *
 * It deliberately returns whole rows: shaping the payload is the job of the Zod
 * response schema on the route. A repository that needs a narrower query - a
 * join, an aggregate, a partial select - declares that method on itself.
 * */
export type BaseRepository<TTable extends PgTable> = {
    findMany: (args?: FindManyArgs) => Promise<Entity<TTable>[]>;
    findFirst: (args?: FindFirstArgs) => Promise<Entity<TTable> | undefined>;
    count: (args?: CountArgs) => Promise<number>;
    create: (args: CreateArgs<TTable>) => Promise<Entity<TTable>>;
    createMany: (args: CreateManyArgs<TTable>) => Promise<Entity<TTable>[]>;
    update: (args: UpdateArgs<TTable>) => Promise<Entity<TTable>[]>;
    delete: (args: DeleteArgs) => Promise<Entity<TTable>[]>;
};

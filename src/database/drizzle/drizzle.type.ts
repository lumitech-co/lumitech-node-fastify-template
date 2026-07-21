import * as schema from "./schema.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * The Drizzle database client decorated onto Fastify and registered in the container.
 * */
export type Database = NodePgDatabase<typeof schema>;

/**
 * The transaction client handed to the callback of `db.transaction(...)`.
 *
 * A service may open a transaction and pass this down to repository methods via
 * their `tx` option, so every query inside the transaction still goes through a
 * repository.
 *
 * @example
 * await db.transaction(async (tx) => {
 *     const message = await messageRepository.create({ data, tx });
 *     await auditRepository.create({ data: { messageId: message.id }, tx });
 *     return message;
 * });
 * */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Anything a repository can run a query against - the pooled client or a transaction.
 * */
export type DbExecutor = Database | Transaction;

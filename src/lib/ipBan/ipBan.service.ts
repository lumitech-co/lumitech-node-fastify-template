import { Redis } from "ioredis";
import { FastifyBaseLogger } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { IsBannedPayload, RegisterAttemptPayload } from "./ipBan.type.js";
import {
    IP_BAN_ATTEMPTS_KEY_PREFIX,
    IP_BAN_ATTEMPTS_WINDOW_SECONDS,
    IP_BAN_DURATION_SECONDS,
    IP_BAN_KEY_PREFIX,
    IP_BAN_MAX_ATTEMPTS,
} from "./ipBan.constant.js";

export type IpBanService = {
    isBanned: (payload: IsBannedPayload) => Promise<boolean>;
    registerAttempt: (payload: RegisterAttemptPayload) => Promise<boolean>;
};

const REDIS_KEY_EXISTS = 1;

const INCR_RESULT_INDEX = 0;

export const createIpBanService = (
    redis: Redis,
    log: FastifyBaseLogger
): IpBanService => ({
    isBanned: async ({ ip }) => {
        try {
            const banned = await redis.exists(`${IP_BAN_KEY_PREFIX}${ip}`);

            return banned === REDIS_KEY_EXISTS;
        } catch (error) {
            log.warn({ error, ip }, "Ip ban lookup failed");

            return false;
        }
    },

    registerAttempt: async ({ ip }) => {
        const attemptsKey = `${IP_BAN_ATTEMPTS_KEY_PREFIX}${ip}`;

        try {
            const results = await redis
                .multi()
                .incr(attemptsKey)
                .expire(attemptsKey, IP_BAN_ATTEMPTS_WINDOW_SECONDS, "NX")
                .exec();

            const incr = results?.[INCR_RESULT_INDEX];

            if (!incr || incr[0]) {
                throw incr?.[0] ?? new Error("Ip ban transaction aborted");
            }

            const attempts = Number(incr[1]);

            if (attempts < IP_BAN_MAX_ATTEMPTS) {
                return false;
            }

            await redis.set(
                `${IP_BAN_KEY_PREFIX}${ip}`,
                attempts,
                "EX",
                IP_BAN_DURATION_SECONDS
            );

            await redis.unlink(attemptsKey);

            return true;
        } catch (error) {
            log.warn({ error, ip }, "Ip ban attempt registration failed");

            return false;
        }
    },
});

addDIResolverName(createIpBanService, "ipBanService");

import Fastify from "fastify";
import fp from "fastify-plugin";
import authenticateCronPlugin from "@/plugins/authenticateCron.js";
import { describe, expect, it } from "vitest";
import type { EnvConfig } from "@/types/env.type.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";

const buildApp = async (cronSecret: string | undefined) => {
    const app = Fastify();

    await app.register(
        fp(
            async (instance) => {
                instance.decorate("config", {
                    CRON_SECRET: cronSecret,
                } as EnvConfig);
            },
            { name: FastifyPlugin.Env }
        )
    );

    await app.register(authenticateCronPlugin);

    app.after(() => {
        app.post(
            "/cron/tick",
            { onRequest: [app.authenticateCron] },
            async () => ({ ok: true })
        );
    });

    await app.ready();

    return app;
};

const tick = async ({
    cronSecret,
    authorization,
}: {
    cronSecret: string | undefined;
    authorization?: string;
}) => {
    const app = await buildApp(cronSecret);

    const response = await app.inject({
        method: "POST",
        url: "/cron/tick",
        headers: authorization === undefined ? {} : { authorization },
    });

    await app.close();

    return response.statusCode;
};

describe("authenticateCron plugin", () => {
    it("lets a request with the bearer secret through", async () => {
        await expect(
            tick({ cronSecret: "s3cret", authorization: "Bearer s3cret" })
        ).resolves.toBe(200);
    });

    it.each([undefined, "", "s3cret", "Bearer wrong", "Bearer s3cret2"])(
        "refuses the authorization header %j",
        async (authorization) => {
            await expect(
                tick({
                    cronSecret: "s3cret",
                    ...(authorization !== undefined && { authorization }),
                })
            ).resolves.toBe(401);
        }
    );

    it.each([undefined, ""])(
        "fails closed while CRON_SECRET is %j",
        async (cronSecret) => {
            await expect(
                tick({ cronSecret, authorization: "Bearer " })
            ).resolves.toBe(401);
        }
    );
});
